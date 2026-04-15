const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const pushSubscriptionSchema = new mongoose.Schema(
  {
    endpoint: {
      type: String,
      required: true,
    },
    expirationTime: {
      type: Date,
      default: null,
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
      },
      auth: {
        type: String,
        required: true,
      },
    },
    userAgent: {
      type: String,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const nativePushTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      enum: ["android", "ios", "unknown"],
      default: "unknown",
    },
    appId: {
      type: String,
      default: "",
    },
    deviceName: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["admin", "sales_manager", "sales_agent"],
    default: "sales_agent"
  },
  pushSubscriptions: {
    type: [pushSubscriptionSchema],
    default: [],
  },
  nativePushTokens: {
    type: [nativePushTokenSchema],
    default: [],
  }
});

// hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
