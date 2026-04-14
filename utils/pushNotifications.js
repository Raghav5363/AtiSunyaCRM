const webpush = require("web-push");
const User = require("../models/user");

let configured = false;

function isPushConfigured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

function configureWebPush() {
  if (configured || !isPushConfigured()) {
    return;
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  configured = true;
}

function getPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || "";
}

async function subscribeUser(userId, subscription, userAgent = "") {
  if (!userId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error("Invalid push subscription");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const existingIndex = (user.pushSubscriptions || []).findIndex(
    (item) => item.endpoint === subscription.endpoint
  );

  const payload = {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime || null,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    userAgent,
    updatedAt: new Date(),
  };

  if (existingIndex >= 0) {
    user.pushSubscriptions[existingIndex] = {
      ...user.pushSubscriptions[existingIndex].toObject?.(),
      ...payload,
      createdAt: user.pushSubscriptions[existingIndex].createdAt || new Date(),
    };
  } else {
    user.pushSubscriptions.push({
      ...payload,
      createdAt: new Date(),
    });
  }

  await user.save();
  return user.pushSubscriptions.length;
}

async function unsubscribeUser(userId, endpoint) {
  if (!userId || !endpoint) {
    return 0;
  }

  const user = await User.findById(userId);
  if (!user) {
    return 0;
  }

  const nextSubscriptions = (user.pushSubscriptions || []).filter(
    (item) => item.endpoint !== endpoint
  );

  user.pushSubscriptions = nextSubscriptions;
  await user.save();
  return nextSubscriptions.length;
}

async function sendPushToUser(userId, payload) {
  if (!userId || !isPushConfigured()) {
    return { sent: 0, removed: 0, skipped: true };
  }

  configureWebPush();

  const user = await User.findById(userId).select("pushSubscriptions");
  const subscriptions = Array.isArray(user?.pushSubscriptions) ? user.pushSubscriptions : [];

  if (!subscriptions.length) {
    return { sent: 0, removed: 0, skipped: false };
  }

  let sent = 0;
  let removed = 0;
  const validSubscriptions = [];
  const body = JSON.stringify(payload);

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(subscription.toObject?.() || subscription, body);
      validSubscriptions.push(subscription);
      sent += 1;
    } catch (error) {
      const statusCode = error?.statusCode;
      if (statusCode !== 404 && statusCode !== 410) {
        validSubscriptions.push(subscription);
      } else {
        removed += 1;
      }
    }
  }

  if (removed > 0 && user) {
    user.pushSubscriptions = validSubscriptions;
    await user.save();
  }

  return { sent, removed, skipped: false };
}

module.exports = {
  getPublicKey,
  isPushConfigured,
  subscribeUser,
  unsubscribeUser,
  sendPushToUser,
};
