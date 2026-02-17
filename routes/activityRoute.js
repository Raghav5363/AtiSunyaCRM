const express = require("express");
const Activity = require("../models/activity");
const Lead = require("../models/lead");
const { protect, allowRoles } = require("../middleware/authMiddleware");

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

    if (req.user && req.user.id) {
      filter.createdBy = req.user.id;
    }

    const followups = await Activity.find(filter)
      .populate("leadId", "name phone")
      .sort({ nextFollowUpDate: 1 });

    res.json(followups);
  } catch (err) {
    console.error("🔥 TODAY ERROR:", err);
    res.status(500).json({ message: err.message });
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

    if (req.user && req.user.id) {
      filter.createdBy = req.user.id;
    }

    const followups = await Activity.find(filter)
      .populate("leadId", "name phone")
      .sort({ nextFollowUpDate: 1 });

    res.json(followups);
  } catch (err) {
    console.error("🔥 OVERDUE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   ADD ACTIVITY
========================= */
router.post(
  "/:leadId",
  protect,
  allowRoles("admin", "sales_manager", "sales_agent"),
  async (req, res) => {
    try {
      const {
        activityType,
        activityDateTime,
        outcome,
        notes,
        nextFollowUpDate
      } = req.body;

      if (!activityType || !activityDateTime || !outcome || !notes) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const lead = await Lead.findById(req.params.leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      const activity = await Activity.create({
        leadId: req.params.leadId,
        activityType,
        activityDateTime,
        outcome,
        notes,
        nextFollowUpDate: nextFollowUpDate || null,
        createdBy: req.user.id
      });

      if (nextFollowUpDate) {
        lead.nextFollowUpDate = nextFollowUpDate;
        await lead.save();
      }

      res.status(201).json(activity);

    } catch (err) {
      console.error("🔥 ADD ACTIVITY ERROR:", err);
      res.status(500).json({ message: err.message });
    }
  }
);

/* =========================
   GET ACTIVITIES BY LEAD
   (IMPORTANT: Keep this LAST)
========================= */
router.get("/:leadId", protect, async (req, res) => {
  try {
    const activities = await Activity.find({
      leadId: req.params.leadId
    })
      .populate("createdBy", "email role")
      .sort({ activityDateTime: -1 });

    res.json(activities);
  } catch (err) {
    console.error("🔥 GET BY LEAD ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
