require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const leadRoutes = require("./routes/leadRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const activityRoutes = require("./routes/activityRoute");
const followupRoutes = require("./routes/followupRoutes");

const app = express();

/* =========================
   CORS CONFIG (FIX FOR MOBILE)
   ========================= */
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://10.234.215.249:3000" // 👈 your laptop IP
    ],
    credentials: true
  })
);

app.use(express.json());

/* =========================
   ROUTES
   ========================= */
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/users", userRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/followups", followupRoutes);

/* =========================
   DATABASE
   ========================= */
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/atisunya_crm";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB error:", err);
    process.exit(1);
  });

/* =========================
   SERVER
   ========================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);