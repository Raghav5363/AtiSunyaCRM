const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true
    },

    activityType: {
      type: String,
      enum: ["call", "whatsapp", "email", "meeting"],
      required: true
    },

    activityDateTime: {
      type: Date,
      required: true
    },

    outcome: {
      type: String,
      default: "",
      trim: true
    },

    notes: {
      type: String,
      default: "",
      trim: true
    },

    nextFollowUpDate: {
      type: Date,
      default: null
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

/* =========================
   INDEX FOR FAST DASHBOARD
========================= */
activitySchema.index({ nextFollowUpDate: 1 });

module.exports = mongoose.models.Activity || mongoose.model("Activity", activitySchema);