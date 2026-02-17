const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["new", "contacted", "followup", "no_connect", "converted"],
      default: "new",
    },

    source: {
      type: String,
      default: "",
    },

    // 🔥 NEW FIELD (Lead Creator)
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

    /* =========================
       ACTIVITIES
    ========================= */
    activities: [
      {
        activityType: {
          type: String,
          enum: ["call", "whatsapp", "email", "meeting"],
          required: true,
        },

        activityDateTime: {
          type: Date,
          required: true,
        },

        outcome: {
          type: String,
          required: true,
        },

        notes: {
          type: String,
          required: true,
        },

        nextFollowUpDate: {
          type: Date,
          default: null,
        },

        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },

        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    nextFollowUpDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lead", leadSchema);
