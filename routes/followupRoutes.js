const express = require("express");
const Activity = require("../models/activity");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

/* =========================
   TODAY FOLLOW-UPS
========================= */
router.get("/today", protect, async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const filter = {
      nextFollowUpDate: { $gte: start, $lte: end }
    };

    if (req.user.role !== "admin") {
      filter.createdBy = req.user.id;
    }

    const followups = await Activity.find(filter)
      .populate("leadId", "name phone")
      .sort({ nextFollowUpDate: 1 });

    // 🔥 Remove orphan activities (lead deleted)
    const validFollowups = followups.filter(f => f.leadId);

    res.status(200).json(validFollowups);

  } catch (err) {
    console.error("TODAY FOLLOWUP ERROR:", err);
    res.status(500).json({ message: "Failed to load follow-ups" });
  }
});

/* =========================
   OVERDUE FOLLOW-UPS
========================= */
router.get("/overdue", protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filter = {
      nextFollowUpDate: { $lt: today }
    };

    if (req.user.role !== "admin") {
      filter.createdBy = req.user.id;
    }

    const followups = await Activity.find(filter)
      .populate("leadId", "name phone")
      .sort({ nextFollowUpDate: 1 });

    // 🔥 Remove orphan activities
    const validFollowups = followups.filter(f => f.leadId);

    res.status(200).json(validFollowups);

  } catch (err) {
    console.error("OVERDUE FOLLOWUP ERROR:", err);
    res.status(500).json({ message: "Failed to load follow-ups" });
  }
});

module.exports = router;
