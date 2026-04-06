const express = require("express");
const Activity = require("../models/activity");
const User = require("../models/user");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

/* =========================
   COMMON FILTER FUNCTION
========================= */
const applyRoleFilter = async (req, baseFilter) => {
  if (req.user.role === "admin") {
    return baseFilter;
  }

  if (req.user.role === "sales_agent") {
    baseFilter.createdBy = req.user.id;
    return baseFilter;
  }

  if (req.user.role === "sales_manager") {
    const managerId = req.user.id;
    const agents = await User.find({ role: "sales_agent" }).select("_id");
    baseFilter.createdBy = {
      $in: [managerId, ...agents.map((agent) => agent._id.toString())]
    };
  }

  return baseFilter;
};

/* =========================
   TODAY FOLLOW-UPS
========================= */
router.get("/today", protect, async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    let filter = {
      nextFollowUpDate: { $gte: start, $lte: end }
    };

    filter = await applyRoleFilter(req, filter);

    const followups = await Activity.find(filter)
      .populate("leadId", "name phone createdAt") // ✅ FIX ADDED
      .sort({ nextFollowUpDate: 1 });

    const validFollowups = followups.filter(f => f.leadId);

    res.status(200).json(validFollowups);

  } catch (err) {
    console.error("TODAY FOLLOWUP ERROR:", err);
    res.status(500).json({ message: "Failed to load today's follow-ups" });
  }
});

/* =========================
   OVERDUE FOLLOW-UPS
========================= */
router.get("/overdue", protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filter = {
      nextFollowUpDate: { $lt: today }
    };

    filter = await applyRoleFilter(req, filter);

    const followups = await Activity.find(filter)
      .populate("leadId", "name phone createdAt") // ✅ FIX ADDED
      .sort({ nextFollowUpDate: 1 });

    const validFollowups = followups.filter(f => f.leadId);

    res.status(200).json(validFollowups);

  } catch (err) {
    console.error("OVERDUE FOLLOWUP ERROR:", err);
    res.status(500).json({ message: "Failed to load overdue follow-ups" });
  }
});

/* =========================
   UPCOMING FOLLOW-UPS
========================= */
router.get("/upcoming", protect, async (req, res) => {
  try {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let filter = {
      nextFollowUpDate: { $gt: todayEnd }
    };

    filter = await applyRoleFilter(req, filter);

    const followups = await Activity.find(filter)
      .populate("leadId", "name phone createdAt") // ✅ FIX ADDED
      .sort({ nextFollowUpDate: 1 });

    const validFollowups = followups.filter(f => f.leadId);

    res.status(200).json(validFollowups);

  } catch (err) {
    console.error("UPCOMING FOLLOWUP ERROR:", err);
    res.status(500).json({ message: "Failed to load upcoming follow-ups" });
  }
});

module.exports = router;
