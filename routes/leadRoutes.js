const express = require("express");
const Lead = require("../models/lead");
const User = require("../models/user");
const { protect, allowRoles } = require("../middleware/authMiddleware");

const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");

const router = express.Router();

const upload = multer({ dest: "uploads/" });

/* =========================
   CREATE LEAD
========================= */
router.post(
  "/",
  protect,
  allowRoles("admin", "sales_manager"),
  async (req, res) => {
    try {
      const { name, email, phone, status, source, assignedTo } = req.body;

      const lead = new Lead({
        name,
        email,
        phone,
        status,
        source,
        assignedTo: assignedTo || null,
      });

      await lead.save();
      res.status(201).json(lead);
    } catch (err) {
      res.status(400).json({ message: "Failed to create lead" });
    }
  }
);

/* =========================
   GET ALL LEADS
========================= */
router.get("/", protect, async (req, res) => {
  try {
    let filter = {};

    // Agent only sees assigned leads
    if (req.user.role === "sales_agent") {
      filter.assignedTo = req.user.id;
    }

    const leads = await Lead.find(filter)
      .populate("assignedTo", "email role")
      .sort({ createdAt: -1 });

    res.json(leads);
  } catch {
    res.status(500).json({ message: "Failed to fetch leads" });
  }
});

/* =========================
   GET SINGLE LEAD
========================= */
router.get("/:id", protect, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate(
      "assignedTo",
      "email role"
    );

    if (!lead) return res.status(404).json({ message: "Lead not found" });

    // Agent restriction
    if (
      req.user.role === "sales_agent" &&
      lead.assignedTo?._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(lead);
  } catch {
    res.status(500).json({ message: "Error loading lead" });
  }
});

/* =========================
   UPDATE LEAD
========================= */
router.put(
  "/:id",
  protect,
  allowRoles("admin", "sales_manager"),
  async (req, res) => {
    try {
      const updatedLead = await Lead.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );

      res.json(updatedLead);
    } catch {
      res.status(400).json({ message: "Failed to update lead" });
    }
  }
);

/* =========================
   DELETE LEAD (ADMIN ONLY)
========================= */
router.delete(
  "/:id",
  protect,
  allowRoles("admin"),
  async (req, res) => {
    try {
      await Lead.findByIdAndDelete(req.params.id);
      res.json({ message: "Lead deleted" });
    } catch {
      res.status(500).json({ message: "Delete failed" });
    }
  }
);

/* =========================
   ADD ACTIVITY
========================= */
router.post("/:id/activities", protect, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) return res.status(404).json({ message: "Lead not found" });

    // Agent only for assigned leads
    if (
      req.user.role === "sales_agent" &&
      lead.assignedTo?.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Not your lead" });
    }

    const activity = {
      description: req.body.notes,
      createdBy: req.user.id,
      createdAt: new Date(),
    };

    lead.activities.unshift(activity);
    await lead.save();

    res.status(201).json(activity);
  } catch {
    res.status(500).json({ message: "Failed to add activity" });
  }
});

module.exports = router;
