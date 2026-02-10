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
   DEBUG (CHECK ENV LOAD)
========================= */
console.log("MONGO_URI from ENV:", process.env.MONGO_URI);

/* =========================
   CORS
========================= */
app.use(
  cors({
    origin: "*", // allow all for now (deployment ke baad restrict karenge)
    credentials: true,
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
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.log("❌ MongoDB ERROR:");
    console.log(err.message);
  });

/* =========================
   SERVER
========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
