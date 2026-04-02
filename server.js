require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

// ROUTES
const leadRoutes = require("./routes/leadRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const activityRoutes = require("./routes/activityRoute");
const followupRoutes = require("./routes/followupRoutes");

// CRON
const startReminderCron = require("./utils/reminderCron");

const app = express();
const server = http.createServer(app);

/* =========================
   SOCKET.IO SETUP
========================= */

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 👉 Make io globally accessible
global.io = io;

io.on("connection", (socket) => {
  console.log("⚡ Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

/* =========================
   DEBUG ENV
========================= */

console.log("MONGO_URI Loaded:", process.env.MONGO_URI ? "YES" : "NO");

/* =========================
   CORS
========================= */

app.use(
  cors({
    origin: "*",
    credentials: true
  })
);

/* =========================
   BODY PARSER
========================= */

app.use(express.json({ limit: "10mb" }));

/* =========================
   HEALTH CHECK
========================= */

app.get("/", (req, res) => {
  res.send("CRM API Running ✅");
});

/* =========================
   API ROUTES
========================= */

app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/users", userRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/followups", followupRoutes);

/* =========================
   404 HANDLER
========================= */

app.use((req, res) => {
  res.status(404).json({
    message: "API route not found"
  });
});

/* =========================
   GLOBAL ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);

  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error"
  });
});

/* =========================
   DATABASE CONNECTION
========================= */

mongoose
  .connect(process.env.MONGO_URI) // ✅ removed deprecated options
  .then(() => {
    console.log("✅ MongoDB Connected");

    // 🔔 START REMINDER CRON
    startReminderCron();

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Failed");
    console.error(err);
  });