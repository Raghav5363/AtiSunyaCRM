console.log("✅ leadRoutes loaded");

const express = require("express");
const mongoose = require("mongoose");
const Lead = require("../models/lead");
const User = require("../models/user");
const { protect, allowRoles } = require("../middleware/authMiddleware");

const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");

const router = express.Router();

/* =========================
   STATUS NORMALIZER
========================= */

function normalizeStatus(status) {

  if (!status) return "new";

  const map = {
    "new": "new",
    "followup": "followup",
    "follow up": "followup",
    "not interested": "not_interested",
    "not_interested": "not_interested",
    "junk": "junk",
    "closed": "closed",
    "site visit planned": "site_visit_planned",
    "site_visit_planned": "site_visit_planned",
    "site visit done": "site_visit_done",
    "site_visit_done": "site_visit_done"
  };

  const key = status.toLowerCase().trim();

  return map[key] || "new";
}

/* =========================
   EMAIL VALIDATION
========================= */

function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/* =========================
   PHONE VALIDATION
========================= */

function isValidPhone(phone) {
  const regex = /^[6-9]\d{9}$/;
  return regex.test(phone);
}

/* =========================
   MULTER CONFIG
========================= */

const upload = multer({
  dest: path.join(__dirname, "../uploads"),
});

/* =====================================================
   BULK CSV UPLOAD
===================================================== */

router.post(
  "/bulk-upload",
  protect,
  allowRoles("admin", "sales_manager"),
  upload.single("file"),
  async (req, res) => {

    try {

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const rows = [];

      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csv())
          .on("data", (data) => rows.push(data))
          .on("end", resolve)
          .on("error", reject);
      });

      let inserted = 0;
      let skipped = 0;

      for (const row of rows) {

        if (
          !row.email ||
          !row.phone ||
          !isValidEmail(row.email) ||
          !isValidPhone(row.phone)
        ) {
          skipped++;
          continue;
        }

        const existing = await Lead.findOne({
          $or: [
            { email: row.email },
            { phone: row.phone }
          ]
        });

        if (existing) {
          skipped++;
          continue;
        }

        await Lead.create({
          name: row.name,
          email: row.email,
          phone: row.phone,
          status: normalizeStatus(row.status),
          source: row.source,
          createdBy: req.user.id,
          assignedTo: req.user.id
        });

        inserted++;

      }

      fs.unlinkSync(req.file.path);

      res.json({
        message: "CSV upload completed",
        inserted,
        skipped
      });

    } catch (err) {

      console.error("CSV Upload Error:", err);

      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({ message: "CSV upload failed" });

    }
  }
);

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

      if (!isValidEmail(email))
        return res.status(400).json({ message: "Invalid email" });

      if (!isValidPhone(phone))
        return res.status(400).json({ message: "Invalid phone" });

      const lead = await Lead.create({
        name,
        email,
        phone,
        status: normalizeStatus(status),
        source,
        createdBy: req.user.id,
        assignedTo: assignedTo || req.user.id
      });

      const populated = await Lead.findById(lead._id)
        .populate("assignedTo", "email role")
        .populate("createdBy", "email role");

      res.status(201).json(populated);

    } catch (err) {

      console.log("CREATE LEAD ERROR:", err);

      res.status(500).json({ message: "Create lead failed" });

    }
  }
);

/* =========================
   GET ALL LEADS
========================= */

router.get("/", protect, async (req, res) => {

  try {

    let filter = {};

    if (req.user.role === "sales_agent") {
      filter.assignedTo = new mongoose.Types.ObjectId(req.user.id);
    }

    if (req.user.role === "sales_manager") {

      const agents = await User.find({ role: "sales_agent" }).select("_id");

      filter.assignedTo = {
        $in: agents.map(a => a._id)
      };
    }

    const leads = await Lead.find(filter)
      .populate("assignedTo", "email role")
      .populate("createdBy", "email role")
      .sort({ createdAt: -1 });

    res.json(leads);

  } catch (err) {

    console.log(err);
    res.status(500).json({ message: "Fetch leads failed" });

  }
});

/* =========================
   DASHBOARD SUMMARY
========================= */

router.get("/stats/summary", protect, async (req, res) => {

  try {

    let filter = {};

    if (req.user.role === "sales_agent") {
      filter.assignedTo = new mongoose.Types.ObjectId(req.user.id);
    }

    if (req.user.role === "sales_manager") {

      const agents = await User.find({ role: "sales_agent" }).select("_id");

      filter.assignedTo = {
        $in: agents.map(a => a._id)
      };
    }

    const leads = await Lead.find(filter);

    const result = {
      total: leads.length,
      new: 0,
      followup: 0,
      not_interested: 0,
      junk: 0,
      closed: 0,
      site_visit_planned: 0,
      site_visit_done: 0
    };

    leads.forEach(l => {

      if (result.hasOwnProperty(l.status)) {
        result[l.status]++;
      }

    });

    res.json(result);

  } catch (err) {

    console.log("Stats error:", err);

    res.status(500).json({ message: "Stats error" });

  }
});

/* =========================
   MONTHLY REPORT
========================= */

router.get("/stats/monthly", protect, async (req, res) => {

  try {

    let match = {};

    if (req.user.role === "sales_agent") {
      match.assignedTo = new mongoose.Types.ObjectId(req.user.id);
    }

    const data = await Lead.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(data);

  } catch (err) {

    console.log("Monthly error:", err);

    res.status(500).json({ message: "Monthly stats error" });

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

      if (req.body.status) {
        req.body.status = normalizeStatus(req.body.status);
      }

      const updated = await Lead.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      )
        .populate("assignedTo", "email role")
        .populate("createdBy", "email role");

      res.json(updated);

    } catch (err) {

      console.log(err);
      res.status(500).json({ message: "Update failed" });

    }
  }
);

/* =========================
   DELETE LEAD
========================= */

router.delete(
  "/:id",
  protect,
  allowRoles("admin"),
  async (req, res) => {

    try {

      await Lead.findByIdAndDelete(req.params.id);

      res.json({ message: "Lead deleted" });

    } catch (err) {

      console.log(err);
      res.status(500).json({ message: "Delete failed" });

    }
  }
);

/* =========================
   GET SINGLE LEAD
========================= */

router.get("/:id", protect, async (req, res) => {

  try {

    const lead = await Lead.findById(req.params.id)
      .populate("assignedTo", "email role")
      .populate("createdBy", "email role");

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.json(lead);

  } catch (err) {

    console.log(err);
    res.status(500).json({ message: "Load lead failed" });

  }
});

module.exports = router;