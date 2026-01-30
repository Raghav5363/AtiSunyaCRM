const express = require("express");
const Lead = require("../models/lead");
const User = require("../models/user");
const { protect, allowRoles } = require("../middleware/authMiddleware");

const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");

const router = express.Router();

/* =========================
   MULTER CONFIG
   ========================= */
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
   BULK UPLOAD (CSV)
   ========================= */
router.post(
  "/bulk-upload",
  protect,
  allowRoles("admin", "sales_manager"),
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const rows = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", async () => {
        try {
          const leadsToInsert = [];
          const skipped = [];

          for (const row of rows) {
            const name = row.name?.trim();
            const email = row.email?.trim();
            const phone = row.phone?.trim();

            if (!name || !email || !phone) {
              skipped.push(row);
              continue;
            }

            const exists = await Lead.findOne({ email });
            if (exists) {
              skipped.push(email);
              continue;
            }

            let assignedUser = null;
            if (row.assignedTo) {
              assignedUser = await User.findOne({
                email: row.assignedTo.trim(),
              });
            }

            leadsToInsert.push({
              name,
              email,
              phone,
              status: row.status || "new",
              source: row.source || "",
              assignedTo: assignedUser ? assignedUser._id : null,
            });
          }

          if (leadsToInsert.length > 0) {
            await Lead.insertMany(leadsToInsert);
          }

          fs.unlinkSync(req.file.path);

          res.json({
            message: "Bulk upload completed",
            inserted: leadsToInsert.length,
            skipped: skipped.length,
          });
        } catch (err) {
          console.error(err);
          res.status(500).json({ message: "Bulk upload failed" });
        }
      });
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

    const leads = await Lead.find(filter)
      .populate("assignedTo", "email role")
      .sort({ createdAt: -1 });

    res.json(leads);
  } catch (err) {
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
      "_id email"
    );

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.json(lead);
  } catch (err) {
    res.status(500).json({ message: "Failed to load lead" });
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
        {
          name: req.body.name,
          email: req.body.email,
          phone: req.body.phone,
          status: req.body.status,
          source: req.body.source,
          assignedTo: req.body.assignedTo || null,
        },
        { new: true, runValidators: true }
      );

      if (!updatedLead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      res.json(updatedLead);
    } catch (err) {
      res.status(400).json({ message: "Failed to save lead" });
    }
  }
);

/* =========================
   DELETE LEAD
   ========================= */
router.delete(
  "/:id",
  protect,
  allowRoles("admin", "sales_manager"),
  async (req, res) => {
    try {
      await Lead.findByIdAndDelete(req.params.id);
      res.json({ message: "Lead deleted successfully" });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete lead" });
    }
  }
);

/* =========================
   ADD ACTIVITY (ADMIN + MANAGER + SALES AGENT)
   ========================= */
router.post(
  "/:id/activities",
  protect,
  async (req, res) => {
    try {
      const {
        activityType,
        activityDateTime,
        outcome,
        notes,
        nextFollowUpDate,
      } = req.body;

      if (!notes || !notes.trim()) {
        return res
          .status(400)
          .json({ message: "Activity description is required" });
      }

      const lead = await Lead.findById(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      const activity = {
        description: `${activityType} - ${outcome} - ${notes}`,
        followUpDate: nextFollowUpDate || null,
        createdBy: req.user.id,
        createdAt: activityDateTime
          ? new Date(activityDateTime)
          : new Date(),
      };

      lead.activities.unshift(activity);

      if (lead.status === "new") {
        lead.status = "followup";
      }

      await lead.save();
      res.status(201).json(lead.activities[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to add activity" });
    }
  }
);

module.exports = router;