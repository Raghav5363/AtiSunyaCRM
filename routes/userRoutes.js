const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const Lead = require("../models/lead");
const { protect, allowRoles } = require("../middleware/authMiddleware");
const {
  getPublicKey,
  isPushConfigured,
  sendPushToUser,
  subscribeUser,
  unsubscribeUser,
} = require("../utils/pushNotifications");

const router = express.Router();

/* =========================
   ADD USER (ADMIN ONLY)
   MAX 10 USERS LIMIT
========================= */
router.post("/", protect, allowRoles("admin"), async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "All fields required" });
    }

    // ✅ CHECK TOTAL USERS LIMIT
    const totalUsers = await User.countDocuments();
    if (totalUsers >= 10) {
      return res.status(400).json({
        message: "User limit reached (Maximum 10 users allowed)"
      });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashed,
      role,
    });

    res.status(201).json({
      message: "User created",
      user,
    });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET ALL USERS
========================= */
router.get("/", protect, allowRoles("admin"), async (req, res) => {
  const users = await User.find({}, { password: 0 });
  res.json(users);
});

router.get("/push/public-key", protect, async (req, res) => {
  res.json({
    publicKey: getPublicKey(),
    enabled: isPushConfigured(),
  });
});

router.get("/push/status", protect, async (req, res) => {
  const user = await User.findById(req.user.id).select("pushSubscriptions");
  res.json({
    enabled: isPushConfigured(),
    subscribed: Boolean(user?.pushSubscriptions?.length),
    count: user?.pushSubscriptions?.length || 0,
  });
});

router.post("/push/subscribe", protect, async (req, res) => {
  try {
    if (!isPushConfigured()) {
      return res.status(400).json({ message: "Push notifications are not configured yet" });
    }

    const count = await subscribeUser(
      req.user.id,
      req.body?.subscription,
      req.headers["user-agent"] || ""
    );

    res.json({ message: "Push notifications enabled", count });
  } catch (error) {
    res.status(400).json({ message: error.message || "Failed to save push subscription" });
  }
});

router.post("/push/test", protect, async (req, res) => {
  try {
    if (!isPushConfigured()) {
      return res.status(400).json({ message: "Push notifications are not configured yet" });
    }

    const user = await User.findById(req.user.id).select("email pushSubscriptions");
    if (!user?.pushSubscriptions?.length) {
      return res.status(400).json({ message: "No subscribed device found for this user" });
    }

    const sampleLead = await Lead.findOne({
      isDeleted: false,
      assignedTo: req.user.id,
      $or: [{ reminderDate: { $ne: null } }, { nextFollowUpDate: { $ne: null } }],
    })
      .sort({ reminderDate: 1, nextFollowUpDate: 1, updatedAt: -1 })
      .select("_id name notes purpose status reminderDate nextFollowUpDate")
      .lean();

    const effectiveReminderDate =
      sampleLead?.reminderDate || sampleLead?.nextFollowUpDate || new Date();
    const leadName = sampleLead?.name || "Sample Lead";
    const leadNotes = sampleLead?.notes || "Follow-up reminder needs attention.";
    const leadId = sampleLead?._id?.toString() || "";

    const result = await sendPushToUser(req.user.id, {
      title: `${leadName} reminder`,
      body: leadNotes,
      tag: leadId ? `lead-reminder-${leadId}` : `crm-test-${Date.now()}`,
      url: leadId ? `/lead/${leadId}` : "/dashboard",
      icon: "/app-icon-192.png",
      badge: "/app-icon-192.png",
      data: {
        type: "lead-reminder-preview",
        leadId,
        reminderDate: effectiveReminderDate,
        purpose: sampleLead?.purpose || "followup",
        status: sampleLead?.status || "new",
      },
    });

    res.json({
      message: "Test push sent",
      ...result,
    });
  } catch (error) {
    res.status(400).json({ message: error.message || "Failed to send test push" });
  }
});

router.post("/push/unsubscribe", protect, async (req, res) => {
  try {
    const count = await unsubscribeUser(req.user.id, req.body?.endpoint);
    res.json({ message: "Push notifications disabled", count });
  } catch (error) {
    res.status(400).json({ message: error.message || "Failed to remove push subscription" });
  }
});

/* =========================
   UPDATE USER ROLE
========================= */
router.put("/:id", protect, allowRoles("admin"), async (req, res) => {
  try {
    const { role } = req.body;

    await User.findByIdAndUpdate(req.params.id, { role });

    res.json({ message: "User updated" });
  } catch {
    res.status(500).json({ message: "Update failed" });
  }
});

/* =========================
   DELETE USER
========================= */
router.delete("/:id", protect, allowRoles("admin"), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
});

/* =========================
   SALES AGENTS
========================= */
router.get(
  "/sales-agents",
  protect,
  allowRoles("admin", "sales_manager"),
  async (req, res) => {
    const agents = await User.find(
      { role: "sales_agent" },
      { password: 0 }
    );
    res.json(agents);
  }
);

module.exports = router;
