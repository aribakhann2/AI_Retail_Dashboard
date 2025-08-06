import { google } from "googleapis";
import { JWT } from "google-auth-library";
import path from "path";
import dayjs from "dayjs";
import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { io } from "../server"; //  Your Socket.IO instance
import { Inventory } from "../models/Inventory";

//  Fetch sheet metadata (tab names)
export const getGoogleSheetMeta = async (sheetUrl: string): Promise<string[]> => {
  const sheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!sheetIdMatch) throw new Error("Invalid Google Sheet URL");

  const sheetId = sheetIdMatch[1];

  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, "../config/creds.json"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const client = (await auth.getClient()) as JWT;
  const sheets = google.sheets({ version: "v4", auth: client });

  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });

  if (!meta.data.sheets || meta.data.sheets.length === 0) return [];

  //  Extract sheet/tab names
  return meta.data.sheets.map((s) => s.properties?.title || "Untitled Sheet");
};


// Define types
interface Product {
  product_id: string;
  product_name: string;
  stock_quantity: string;
  cost_price?: string;
  [key: string]: any;
}

interface Sale {
  sale_id: string;
  product_id: string;
  quantity: string;
  total_price: string;
  sale_date: string;
  [key: string]: any;
}

export const sendUpdates = async (userId: string): Promise<void> => {
  console.log(`sendUpdates called for user ${userId}`);

  try {
    // Fetch inventory for the user
    const inventory = await Inventory.findOne({ userId });
    console.log(" Inventory found:", inventory?.sheetUrl || "None");
    if (!inventory || !inventory.sheetUrl) {
      console.warn(` No inventory found for user ${userId}`);
      return;
    }

    //  Extract Sheet ID
    const sheetIdMatch = inventory.sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    console.log(" Extracted Sheet ID:", sheetIdMatch?.[1] || "None");
    if (!sheetIdMatch) throw new Error("Invalid Google Sheet URL");
    const sheetId = sheetIdMatch[1];

    //  Setup Google Sheets API
    console.log("Authenticating Google Sheets...");
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, "../config/creds.json"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const sheets = google.sheets({ version: "v4", auth: (await auth.getClient()) as JWT });

    // Helper to fetch and parse a sheet
    const fetchSheet = async <T = any>(sheetName: string): Promise<T[]> => {
      console.log(`📥 Fetching sheet: ${sheetName}`);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A1:Z1000`,
      });

      const rows = response.data.values || [];
      if (rows.length < 2) return [];

      const headers = rows[0];
      return rows.slice(1).map((r) =>
        Object.fromEntries(headers.map((h, i) => [h, r[i] || ""]))
      ) as T[];
    };

    //  Fetch Products and Sales
    const [products, sales] = await Promise.all([
      fetchSheet<Product>("products"),
      fetchSheet<Sale>("sales"),
    ]);

    console.log(` Products: ${products.length}, Sales: ${sales.length}`);
    if (!products.length || !sales.length) {
      console.warn(" Missing products or sales data.");
      return;
    }

    //  Compute Stock Summary
    const totalProducts = products.length;
    const outOfStockProducts = products.filter((p) => Number(p.stock_quantity) === 0);
    const lowStockProducts = products.filter((p) => Number(p.stock_quantity) > 0 && Number(p.stock_quantity) <= 10);

    const stockSummary = {
      totalProducts,
      outOfStock: outOfStockProducts.length,
      lowStock: lowStockProducts.length,
    };

    //  Compute Top Stock Products (based on recent sales)
    const oneMonthAgo = dayjs().subtract(1, "month");
    const recentSales = sales.filter((s) => dayjs(s.sale_date).isAfter(oneMonthAgo));

    const salesByProduct: Record<string, number> = {};
    recentSales.forEach(
      (s) => (salesByProduct[s.product_id] = (salesByProduct[s.product_id] || 0) + Number(s.total_price || 0))
    );

    const topStockQuantityProducts = Object.entries(salesByProduct)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pid]) => ({
        product_name: products.find((p) => p.product_id === pid)?.product_name || "Unknown",
        stock_quantity: products.find((p) => p.product_id === pid)?.stock_quantity || "0",
      }));

    //  Emit via WebSocket
    console.log("Emitting stock update...");
    io.emit(`stock-update`, { stockSummary, topStockQuantityProducts });

    console.log(` Stock update emitted for user ${userId}`);
  } catch (error: any) {
    console.error(" Full Error in sendUpdates:", error);
  }
};




