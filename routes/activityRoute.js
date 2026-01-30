const express = require("express");
const Activity = require("../models/activity");
const Lead = require("../models/lead");
const { protect, allowRoles } = require("../middleware/authMiddleware");

const router = express.Router();

/* =========================
   ADD ACTIVITY
   ========================= */
router.post(
  "/:leadId",
  protect,
  allowRoles("admin", "sales_manager", "sales_agent"), // ✅ ONLY CHANGE
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

      // Update lead follow-up date (same logic, untouched)
      if (nextFollowUpDate) {
        lead.nextFollowUpDate = nextFollowUpDate;
        await lead.save();
      }

      res.status(201).json(activity);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to add activity" });
    }
  }
);

/* =========================
   GET ACTIVITIES BY LEAD
   ========================= */
router.get(
  "/:leadId",
  protect,
  async (req, res) => {
    try {
      const activities = await Activity.find({
        leadId: req.params.leadId
      })
        .populate("createdBy", "email role")
        .sort({ activityDateTime: -1 });

      res.json(activities);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  }
);

module.exports = router;