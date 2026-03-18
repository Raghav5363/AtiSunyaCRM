const express = require("express");
const Activity = require("../models/activity");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

/* =========================
   COMMON FILTER FUNCTION
========================= */
const applyRoleFilter = (req, baseFilter) => {
  if (req.user.role !== "admin") {
    baseFilter.createdBy = req.user.id;
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

    filter = applyRoleFilter(req, filter);

    const followups = await Activity.find(filter)
      .populate("leadId", "name phone")
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

    filter = applyRoleFilter(req, filter);

    const followups = await Activity.find(filter)
      .populate("leadId", "name phone")
      .sort({ nextFollowUpDate: 1 });

    const validFollowups = followups.filter(f => f.leadId);

    res.status(200).json(validFollowups);

  } catch (err) {
    console.error("OVERDUE FOLLOWUP ERROR:", err);
    res.status(500).json({ message: "Failed to load overdue follow-ups" });
  }
});

/* =========================
   🟡 UPCOMING FOLLOW-UPS (NEW)
========================= */
router.get("/upcoming", protect, async (req, res) => {
  try {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let filter = {
      nextFollowUpDate: { $gt: todayEnd }
    };

    filter = applyRoleFilter(req, filter);

    const followups = await Activity.find(filter)
      .populate("leadId", "name phone")
      .sort({ nextFollowUpDate: 1 });

    const validFollowups = followups.filter(f => f.leadId);

    res.status(200).json(validFollowups);

  } catch (err) {
    console.error("UPCOMING FOLLOWUP ERROR:", err);
    res.status(500).json({ message: "Failed to load upcoming follow-ups" });
  }
});

module.exports = router;