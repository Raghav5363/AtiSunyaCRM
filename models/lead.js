const mongoose = require("mongoose");

const emailValidator = function (email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const phoneValidator = function (phone) {
  const regex = /^[6-9]\d{9}$/;
  return regex.test(phone);
};

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      validate: {
        validator: emailValidator,
        message: "Invalid email format",
      },
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      validate: {
        validator: phoneValidator,
        message: "Invalid phone number",
      },
    },
    status: {
      type: String,
      enum: [
        "new",
        "followup",
        "not_interested",
        "junk",
        "closed",
        "site_visit_planned",
        "site_visit_done",
      ],
      default: "new",
    },
    purpose: {
      type: String,
      enum: [
        "call",
        "meeting",
        "site_visit",
        "followup",
        "negotiation",
        "closure",
      ],
      default: "followup",
    },
    priority: {
      type: String,
      enum: ["hot", "warm", "cold"],
      default: "warm",
    },
    source: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    budget: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: "",
      maxlength: 2000,
    },
    tags: [
      {
        type: String,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reminderDate: {
      type: Date,
      default: null,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    reminderRead: {
      type: Boolean,
      default: false,
    },
    nextFollowUpDate: {
      type: Date,
      default: null,
    },
    lastContactedAt: {
      type: Date,
      default: null,
    },
    visibleToRoles: {
      type: [String],
      default: ["admin", "sales"],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

leadSchema.index({ email: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ reminderDate: 1 });
leadSchema.index({ reminderSent: 1 });
leadSchema.index({ reminderSent: 1, reminderRead: 1, reminderDate: 1, assignedTo: 1 });
leadSchema.index({ nextFollowUpDate: 1, assignedTo: 1 });

module.exports = mongoose.models.Lead || mongoose.model("Lead", leadSchema);
