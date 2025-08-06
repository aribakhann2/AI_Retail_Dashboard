import connectDB from "./config/db";
import express from "express";
import dotenv from "dotenv";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser"; 
import path = require("path");
import userRoute from "./routes/authRoutes";
import inventoryRoute from "./routes/inventoryRoute";
import forecastRoute from "./routes/forecastRoute";
import { sendUpdates } from "./utils/inventory";
import reportRoute from "./routes/reportRoute";
import { Inventory } from "./models/Inventory";
dotenv.config();
import { Server } from "socket.io";
import bodyParser from "body-parser";
import notificationRouter from "./routes/notificationRoute";
const app = express();
app.use(bodyParser.json());
app.use(cookieParser()); 
const PORT = process.env.PORT || 5500;

//CORS setup (API routes)
const allowedOrigins = [
  "http://localhost:5173",
  "https://your-production-frontend.com"
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true, // Allows cookies to be sent
}));

app.use(express.json());

// Webhook
app.post('/api/sheet-update', async (req, res) => {
  try {
    console.log(' Webhook Hit:', new Date());
    const sheetId = req.body?.sheetId || req.headers["x-goog-resource-id"];
    if (!sheetId) return res.status(400).json({ error: "Missing sheetId" });

    const inventory = await Inventory.findOne({ sheetId });
    if (!inventory) return res.status(404).json({ error: "No matching inventory" });

    await sendUpdates(inventory.userId.toString());
    res.status(200).send({ status: "ok" });
  } catch (err) {
    console.error(" Error processing sheet update:", err);
    res.status(500).json({ error: "Failed to process sheet update" });
  }
});

// Health check
app.get("/", (req, res) => res.send("Server is running."));
app.use('/auth', userRoute);
app.use('/inventory', inventoryRoute);
app.use('/forecast', forecastRoute);
app.use('/reports', reportRoute);
app.use('/notify', notificationRouter)
//  Socket.IO CORS
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket
io.on("connection", (socket) => {
  console.log(" Client connected:", socket.id);
  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
  socket.emit("connectt", { msg: "Hello from backend!" });

});

// Start DB and server
connectDB().then(() => {
  server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
});

export { app };
