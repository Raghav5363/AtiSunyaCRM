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

    const followups = await Activity.find({
      nextFollowUpDate: { $gte: start, $lte: end },
      createdBy: req.user.id
    }).populate("leadId", "name phone");

    res.json(followups);
  } catch (err) {
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

    const followups = await Activity.find({
      nextFollowUpDate: { $lt: today },
      createdBy: req.user.id
    }).populate("leadId", "name phone");

    res.json(followups);
  } catch (err) {
    res.status(500).json({ message: "Failed to load follow-ups" });
  }
});

module.exports = router;