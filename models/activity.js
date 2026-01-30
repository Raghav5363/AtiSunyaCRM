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
      required: true
    },
    notes: {
      type: String,
      required: true,
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
  { timestamps: true }
);

module.exports = mongoose.model("Activity", activitySchema);