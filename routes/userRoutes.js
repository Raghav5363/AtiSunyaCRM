const express = require("express");
const User = require("../models/user");
const { protect, allowRoles } = require("../middleware/authMiddleware");

const router = express.Router();

// GET all sales agents (for dropdown)
router.get(
  "/sales-agents",
  protect,
  allowRoles("admin", "sales_manager"),
  async (req, res) => {
    try {
      const agents = await User.find(
        { role: "sales_agent" },
        { password: 0 }
      );
      res.json(agents);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch sales agents" });
    }
  }
);

module.exports = router;