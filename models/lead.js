const mongoose = require("mongoose");

/* =========================
   EMAIL VALIDATION
========================= */

const emailValidator = function (email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/* =========================
   PHONE VALIDATION (INDIA)
========================= */

const phoneValidator = function (phone) {
  const regex = /^[6-9]\d{9}$/;
  return regex.test(phone);
};

const leadSchema = new mongoose.Schema(
{
  /* =========================
     BASIC INFO
  ========================= */

  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    minlength: 2,
    maxlength: 100
  },

  email: {
    type: String,
    required: [true, "Email is required"],
    trim: true,
    lowercase: true,
    validate: {
      validator: emailValidator,
      message: "Invalid email format"
    }
  },

  phone: {
    type: String,
    required: [true, "Phone number is required"],
    trim: true,
    validate: {
      validator: phoneValidator,
      message: "Invalid phone number"
    }
  },

  /* =========================
     LEAD STATUS
  ========================= */

  status: {
    type: String,
    enum: [
      "new",
      "followup",
      "not_interested",
      "junk",
      "closed",
      "site_visit_planned",
      "site_visit_done"
    ],
    default: "new"
  },

  /* =========================
     PURPOSE (🔥 FIX FOR YOUR UI ISSUE)
  ========================= */

  purpose: {
    type: String,
    enum: [
      "call",
      "meeting",
      "site_visit",
      "followup",
      "negotiation",
      "closure"
    ],
    default: "followup"
  },

  /* =========================
     PRIORITY
  ========================= */

  priority: {
    type: String,
    enum: ["hot", "warm", "cold"],
    default: "warm"
  },

  /* =========================
     SOURCE
  ========================= */

  source: {
    type: String,
    default: "",
    trim: true,
    maxlength: 100
  },

  /* =========================
     LOCATION
  ========================= */

  location: {
    type: String,
    default: "",
    trim: true
  },

  /* =========================
     BUDGET
  ========================= */

  budget: {
    type: Number,
    default: 0
  },

  /* =========================
     NOTES
  ========================= */

  notes: {
    type: String,
    default: "",
    maxlength: 2000
  },

  /* =========================
     TAGS
  ========================= */

  tags: [
    {
      type: String
    }
  ],

  /* =========================
     USER RELATIONS
  ========================= */

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  /* =========================
     REMINDER SYSTEM (🔥 CORE)
  ========================= */

  reminderDate: {
    type: Date,
    default: null
  },

  reminderSent: {
    type: Boolean,
    default: false
  },

  reminderRead: {
    type: Boolean,
    default: false
  },

  /* =========================
     FOLLOW-UP TRACKING
  ========================= */

  nextFollowUpDate: {
    type: Date,
    default: null
  },

  lastContactedAt: {
    type: Date,
    default: null
  },

  /* =========================
     ROLE ACCESS CONTROL
  ========================= */

  visibleToRoles: {
    type: [String],
    default: ["admin", "sales"]
  },

  /* =========================
     SOFT DELETE
  ========================= */

  isDeleted: {
    type: Boolean,
    default: false
  }

},
{
  timestamps: true
}
);

/* =========================
   INDEXES (FAST PERFORMANCE)
========================= */

leadSchema.index({ email: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ reminderDate: 1 });
leadSchema.index({ reminderSent: 1 });
leadSchema.index({ reminderSent: 1, reminderRead: 1, reminderDate: 1, assignedTo: 1 });
leadSchema.index({ nextFollowUpDate: 1, assignedTo: 1 });

module.exports = mongoose.model("Lead", leadSchema);
