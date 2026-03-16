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
     LEAD PRIORITY
  ========================= */

  priority: {
    type: String,
    enum: ["hot", "warm", "cold"],
    default: "warm"
  },

  /* =========================
     LEAD SOURCE
  ========================= */

  source: {
    type: String,
    default: "",
    trim: true,
    maxlength: 100
  },

  /* =========================
     CUSTOMER LOCATION
  ========================= */

  location: {
    type: String,
    default: "",
    trim: true
  },

  /* =========================
     CUSTOMER BUDGET
  ========================= */

  budget: {
    type: Number,
    default: 0
  },

  /* =========================
     SALES NOTES
  ========================= */

  notes: {
    type: String,
    default: "",
    maxlength: 2000
  },

  /* =========================
     TAGS (marketing)
  ========================= */

  tags: [
    {
      type: String
    }
  ],

  /* =========================
     LEAD CREATOR
  ========================= */

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  /* =========================
     ASSIGNED SALES AGENT
  ========================= */

  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  /* =========================
     NEXT FOLLOWUP DATE
  ========================= */

  nextFollowUpDate: {
    type: Date,
    default: null
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
   INDEXES (FAST SEARCH)
========================= */

leadSchema.index({ email: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Lead", leadSchema);