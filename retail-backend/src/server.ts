import express from "express";
import dotenv from "dotenv";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import bodyParser from "body-parser";
import { Server } from "socket.io";

import connectDB from "./config/db";
import userRoute from "./routes/authRoutes";
import inventoryRoute from "./routes/inventoryRoute";
import forecastRoute from "./routes/forecastRoute";
import reportRoute from "./routes/reportRoute";
import notificationRouter from "./routes/notificationRoute";
import { sendUpdates } from "./utils/inventory";
import { Inventory } from "./models/Inventory";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5500;

// Middleware
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.json());

// ✅ CORS: Allow ONLY frontend React at 5173
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
  credentials: true, // Allow cookies/sessions
}));

// ✅ Handle OPTIONS (preflight) for allowed origin
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(204);
});

// Webhook
app.post('/api/sheet-update', async (req, res) => {
  try {
    console.log('Webhook Hit:', new Date());
    const sheetId = req.body?.sheetId || req.headers["x-goog-resource-id"];
    if (!sheetId) return res.status(400).json({ error: "Missing sheetId" });

    const inventory = await Inventory.findOne({ sheetId });
    if (!inventory) return res.status(404).json({ error: "No matching inventory" });

    await sendUpdates(inventory.userId.toString());
    res.status(200).send({ status: "ok" });
  } catch (err) {
    console.error("Error processing sheet update:", err);
    res.status(500).json({ error: "Failed to process sheet update" });
  }
});

// Health check
app.get("/", (req, res) => res.send("Server is running."));

// Routes
app.use('/auth', userRoute);
app.use('/inventory', inventoryRoute);
app.use('/forecast', forecastRoute);
app.use('/reports', reportRoute);
app.use('/notify', notificationRouter);

// Create HTTP Server
const server = http.createServer(app);

// ✅ Socket.IO restricted to React frontend
export const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket.IO Events
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
  socket.emit("connectt", { msg: "Hello from backend!" });
});

// Connect DB and start server
connectDB().then(() => {
  server.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
});

export { app };
