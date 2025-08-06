import { io, Socket } from "socket.io-client";

let SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5200";
console.log("🌐 Connecting to:", SOCKET_URL);

if (SOCKET_URL.startsWith("http://")) {
  SOCKET_URL = SOCKET_URL.replace("http://", "https://");
}
const socket: Socket = io(SOCKET_URL, {
  transports: ["websocket"],
  reconnection: true,
  timeout: 20000,
  secure: true, // ✅ Enforce WSS // Ensure correct path
  rejectUnauthorized: false
});

// ✅ Log connection lifecycle
socket.on("connect", () => {
  console.log("✅ [Socket] Connected:", socket.id);
});
socket.on("disconnect", () => {
  console.warn("⚠️ [Socket] Disconnected.");
});
socket.on("connect_error", (err) => {
  console.error("❌ [Socket] Connect error:", err.message);
});
socket.onAny((event, data) => {
  console.log("📡 [Socket Event]", event, data);
});


export default socket;
