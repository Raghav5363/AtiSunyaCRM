console.log("✅ leadRoutes loaded");

const express = require("express");
const Lead = require("../models/lead");
const User = require("../models/user");
const { protect, allowRoles } = require("../middleware/authMiddleware");

const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");

const router = express.Router();

/* =========================
   MULTER CONFIG
========================= */
const upload = multer({
  dest: path.join(__dirname, "../uploads"),
});

/* =====================================================
   🚀 BULK CSV UPLOAD (KEEP THIS ABOVE /:id ROUTE)
===================================================== */
router.post(
  "/bulk-upload",
  protect,
  allowRoles("admin", "sales_manager"),
  upload.single("file"),
  async (req, res) => {
    console.log("🔥 BULK UPLOAD ROUTE HIT");

    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const results = [];

      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csv())
          .on("data", (data) => results.push(data))
          .on("end", resolve)
          .on("error", reject);
      });

      let inserted = 0;
      let skipped = 0;

      for (const row of results) {
        if (!row.email) {
          skipped++;
          continue;
        }

        const existing = await Lead.findOne({ email: row.email });

        if (existing) {
          skipped++;
          continue;
        }

        await Lead.create({
          name: row.name,
          email: row.email,
          phone: row.phone,
          status: row.status || "new",
          source: row.source,
          createdBy: req.user.id,
          assignedTo: req.user.id,
        });

        inserted++;
      }

      // Always delete file after processing
      fs.unlinkSync(req.file.path);

      res.status(200).json({
        message: "CSV upload completed",
        inserted,
        skipped,
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

      const lead = new Lead({
        name,
        email,
        phone,
        status,
        source,
        createdBy: req.user.id,
        assignedTo: assignedTo || req.user.id,
      });

      await lead.save();

      const populatedLead = await Lead.findById(lead._id)
        .populate("assignedTo", "email role")
        .populate("createdBy", "email role");

      res.status(201).json(populatedLead);
    } catch (err) {
      console.log(err);
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

    if (req.user.role === "sales_agent") {
      filter.assignedTo = req.user.id;
    }

    if (req.user.role === "sales_manager") {
      const agents = await User.find({ role: "sales_agent" }).select("_id");
      filter.assignedTo = { $in: agents.map(a => a._id) };
    }

    const leads = await Lead.find(filter)
      .populate("assignedTo", "email role")
      .populate("createdBy", "email role")
      .sort({ createdAt: -1 });

    res.json(leads);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to fetch leads" });
  }
});

/* =========================
   DASHBOARD SUMMARY
========================= */
router.get("/stats/summary", protect, async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "sales_agent") {
      filter.assignedTo = req.user.id;
    }

    if (req.user.role === "sales_manager") {
      const agents = await User.find({ role: "sales_agent" }).select("_id");
      filter.assignedTo = { $in: agents.map(a => a._id) };
    }

    const stats = {
      total: await Lead.countDocuments(filter),
      new: await Lead.countDocuments({ ...filter, status: "new" }),
      followup: await Lead.countDocuments({ ...filter, status: "followup" }),
      converted: await Lead.countDocuments({ ...filter, status: "converted" }),
    };

    res.json(stats);
  } catch (err) {
    console.log(err);
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
      match.assignedTo = req.user.id;
    }

    const data = await Lead.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(data);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Monthly error" });
  }
});

/* =========================
   TEAM PERFORMANCE
========================= */
router.get("/stats/team", protect, async (req, res) => {
  try {
    const data = await Lead.aggregate([
      {
        $group: {
          _id: "$assignedTo",
          total: { $sum: 1 },
          converted: {
            $sum: {
              $cond: [{ $eq: ["$status", "converted"] }, 1, 0],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $sort: { converted: -1 } },
    ]);

    res.json(data);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Team stats error" });
  }
});

/* =========================
   GET SINGLE LEAD (KEEP BELOW BULK ROUTE)
========================= */
router.get("/:id", protect, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate("assignedTo", "email role")
      .populate("createdBy", "email role");

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (
      req.user.role === "sales_agent" &&
      lead.assignedTo?._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(lead);
  } catch (err) {
    console.log(err);
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
      )
        .populate("assignedTo", "email role")
        .populate("createdBy", "email role");

      res.json(updatedLead);
    } catch (err) {
      console.log(err);
      res.status(400).json({ message: "Failed to update lead" });
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

module.exports = router;
