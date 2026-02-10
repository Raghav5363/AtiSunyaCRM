const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const { protect, allowRoles } = require("../middleware/authMiddleware");

const router = express.Router();

/* =========================
   ADD USER (ADMIN ONLY)
========================= */
router.post("/", protect, allowRoles("admin"), async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "All fields required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashed,
      role,
    });

    res.status(201).json({
      message: "User created",
      user,
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET ALL USERS
========================= */
router.get("/", protect, allowRoles("admin"), async (req, res) => {
  const users = await User.find({}, { password: 0 });
  res.json(users);
});

/* =========================
   UPDATE USER ROLE
========================= */
router.put("/:id", protect, allowRoles("admin"), async (req, res) => {
  try {
    const { role } = req.body;

    await User.findByIdAndUpdate(req.params.id, { role });

    res.json({ message: "User updated" });
  } catch {
    res.status(500).json({ message: "Update failed" });
  }
});

/* =========================
   DELETE USER
========================= */
router.delete("/:id", protect, allowRoles("admin"), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
});

/* =========================
   SALES AGENTS
========================= */
router.get(
  "/sales-agents",
  protect,
  allowRoles("admin", "sales_manager"),
  async (req, res) => {
    const agents = await User.find(
      { role: "sales_agent" },
      { password: 0 }
    );
    res.json(agents);
  }
);

module.exports = router;
