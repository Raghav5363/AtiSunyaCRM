```javascript
const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    /* =========================
       BASIC INFO
    ========================= */

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
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
        "site_visit_done",
      ],
      default: "new",
    },

    /* =========================
       LEAD SOURCE
    ========================= */

    source: {
      type: String,
      default: "",
      trim: true,
    },

    /* =========================
       LEAD CREATOR
    ========================= */

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* =========================
       ASSIGNED SALES AGENT
    ========================= */

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /* =========================
       NEXT FOLLOWUP DATE
    ========================= */

    nextFollowUpDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Lead", leadSchema);
```
