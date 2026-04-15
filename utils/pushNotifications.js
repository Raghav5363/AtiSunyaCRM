const http2 = require("http2");
const jwt = require("jsonwebtoken");
const admin = require("firebase-admin");
const webpush = require("web-push");
const User = require("../models/user");

let webConfigured = false;
let firebaseApp = null;
let apnsAuthTokenCache = {
  value: "",
  expiresAt: 0,
};

function isPushConfigured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

function isNativeAndroidPushConfigured() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}

function isNativeIosPushConfigured() {
  return Boolean(
    process.env.APPLE_TEAM_ID &&
      process.env.APPLE_KEY_ID &&
      process.env.APPLE_PUSH_KEY
  );
}

function isNativePushConfigured() {
  return isNativeAndroidPushConfigured() || isNativeIosPushConfigured();
}

function configureWebPush() {
  if (webConfigured || !isPushConfigured()) {
    return;
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  webConfigured = true;
}

function configureFirebaseAdmin() {
  if (firebaseApp || !isNativeAndroidPushConfigured()) {
    return firebaseApp;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
  const existingApp = admin.apps?.length ? admin.app() : null;

  firebaseApp =
    existingApp ||
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });

  return firebaseApp;
}

function getPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || "";
}

function getIosBundleId() {
  return (
    process.env.IOS_BUNDLE_ID ||
    process.env.APNS_TOPIC ||
    process.env.APN_TOPIC ||
    "com.atisunya.crm"
  );
}

function getApnsHost() {
  return process.env.APPLE_PUSH_USE_SANDBOX === "true"
    ? "https://api.sandbox.push.apple.com"
    : "https://api.push.apple.com";
}

function getApnsAuthToken() {
  const now = Date.now();
  if (apnsAuthTokenCache.value && apnsAuthTokenCache.expiresAt > now + 60 * 1000) {
    return apnsAuthTokenCache.value;
  }

  const privateKey = process.env.APPLE_PUSH_KEY.replace(/\\n/g, "\n");
  const token = jwt.sign({}, privateKey, {
    algorithm: "ES256",
    issuer: process.env.APPLE_TEAM_ID,
    header: {
      alg: "ES256",
      kid: process.env.APPLE_KEY_ID,
    },
  });

  apnsAuthTokenCache = {
    value: token,
    expiresAt: now + 50 * 60 * 1000,
  };

  return token;
}

function normalizeNativePlatform(platform) {
  if (platform === "android" || platform === "ios") {
    return platform;
  }

  return "unknown";
}

function buildSharedPushData(payload = {}) {
  const data = {
    ...(payload.data || {}),
  };

  if (payload.url) data.url = payload.url;
  if (payload.tag) data.tag = payload.tag;
  if (payload.title) data.title = payload.title;
  if (payload.body) data.body = payload.body;
  if (payload.channelId) data.channelId = payload.channelId;
  if (payload.clickAction) data.clickAction = payload.clickAction;

  return data;
}

function toStringMap(data = {}) {
  return Object.entries(data).reduce((acc, [key, value]) => {
    if (value === undefined || value === null) {
      return acc;
    }

    acc[key] =
      typeof value === "string" ? value : Array.isArray(value) || typeof value === "object"
        ? JSON.stringify(value)
        : String(value);

    return acc;
  }, {});
}

async function subscribeUser(userId, subscription, userAgent = "") {
  if (!userId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error("Invalid push subscription");
  }

  await User.updateMany(
    { _id: { $ne: userId } },
    {
      $pull: {
        pushSubscriptions: {
          endpoint: subscription.endpoint,
        },
      },
    }
  );

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

async function subscribeNativeUser(userId, token, metadata = {}, userAgent = "") {
  const trimmedToken = typeof token === "string" ? token.trim() : "";
  if (!userId || !trimmedToken) {
    throw new Error("Invalid native push token");
  }

  await User.updateMany(
    { _id: { $ne: userId } },
    {
      $pull: {
        nativePushTokens: {
          token: trimmedToken,
        },
      },
    }
  );

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const existingIndex = (user.nativePushTokens || []).findIndex(
    (item) => item.token === trimmedToken
  );

  const payload = {
    token: trimmedToken,
    platform: normalizeNativePlatform(metadata.platform),
    appId: metadata.appId || "",
    deviceName: metadata.deviceName || "",
    userAgent,
    updatedAt: new Date(),
  };

  if (existingIndex >= 0) {
    user.nativePushTokens[existingIndex] = {
      ...user.nativePushTokens[existingIndex].toObject?.(),
      ...payload,
      createdAt: user.nativePushTokens[existingIndex].createdAt || new Date(),
    };
  } else {
    user.nativePushTokens.push({
      ...payload,
      createdAt: new Date(),
    });
  }

  await user.save();
  return user.nativePushTokens.length;
}

async function unsubscribeNativeUser(userId, token) {
  const trimmedToken = typeof token === "string" ? token.trim() : "";
  if (!userId || !trimmedToken) {
    return 0;
  }

  const user = await User.findById(userId);
  if (!user) {
    return 0;
  }

  const nextTokens = (user.nativePushTokens || []).filter((item) => item.token !== trimmedToken);
  user.nativePushTokens = nextTokens;
  await user.save();
  return nextTokens.length;
}

async function sendWebPushToUser(userId, payload) {
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
      await webpush.sendNotification(subscription.toObject?.() || subscription, body, {
        TTL: 60 * 60,
        urgency: "high",
      });
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

async function sendWebPushToCurrentEndpoint(userId, endpoint, payload) {
  if (!userId || !endpoint || !isPushConfigured()) {
    return { sent: 0, removed: 0, skipped: true };
  }

  configureWebPush();

  const user = await User.findById(userId).select("pushSubscriptions");
  const subscriptions = Array.isArray(user?.pushSubscriptions) ? user.pushSubscriptions : [];
  const matchedSubscription = subscriptions.find((item) => item.endpoint === endpoint);

  if (!matchedSubscription) {
    return { sent: 0, removed: 0, skipped: false };
  }

  try {
    await webpush.sendNotification(matchedSubscription.toObject?.() || matchedSubscription, JSON.stringify(payload), {
      TTL: 60 * 60,
      urgency: "high",
    });

    return { sent: 1, removed: 0, skipped: false };
  } catch (error) {
    const statusCode = error?.statusCode;

    if ((statusCode === 404 || statusCode === 410) && user) {
      user.pushSubscriptions = subscriptions.filter((item) => item.endpoint !== endpoint);
      await user.save();
      return { sent: 0, removed: 1, skipped: false };
    }

    throw error;
  }
}

async function sendAndroidPushToTokens(tokens, payload) {
  if (!tokens.length) {
    return { sent: 0, removed: 0, removedTokens: new Set(), skipped: false };
  }

  if (!isNativeAndroidPushConfigured()) {
    return { sent: 0, removed: 0, removedTokens: new Set(), skipped: true };
  }

  configureFirebaseAdmin();

  const sharedData = toStringMap(buildSharedPushData(payload));
  const messages = tokens.map((item) => ({
    token: item.token,
    notification: {
      title: payload.title || "AtiSunya CRM",
      body: payload.body || "You have a new reminder.",
    },
    data: sharedData,
    android: {
      priority: "high",
      notification: {
        channelId: payload.channelId || "crm-reminders",
        clickAction: payload.clickAction || "OPEN_CRM_REMINDER",
        sound: "default",
        tag: payload.tag || "crm-reminder",
        icon: payload.iconName || "ic_push_notification",
      },
    },
  }));

  const batchResponse = await admin.messaging().sendEach(messages);
  let sent = 0;
  const removedTokens = new Set();

  batchResponse.responses.forEach((response, index) => {
    if (response.success) {
      sent += 1;
      return;
    }

    const errorCode = response.error?.code || "";
    if (
      errorCode === "messaging/registration-token-not-registered" ||
      errorCode === "messaging/invalid-registration-token"
    ) {
      removedTokens.add(tokens[index].token);
    }
  });

  return {
    sent,
    removed: removedTokens.size,
    removedTokens,
    skipped: false,
  };
}

function sendApnsNotification(deviceToken, payload) {
  return new Promise((resolve) => {
    const client = http2.connect(getApnsHost());
    client.on("error", (error) => {
      client.close();
      resolve({
        success: false,
        status: 0,
        reason: error?.message || "APNS connection failed",
      });
    });

    const request = client.request({
      [http2.constants.HTTP2_HEADER_METHOD]: "POST",
      [http2.constants.HTTP2_HEADER_PATH]: `/3/device/${deviceToken}`,
      authorization: `bearer ${getApnsAuthToken()}`,
      "apns-topic": getIosBundleId(),
      "apns-push-type": "alert",
      "apns-priority": "10",
    });

    const body = {
      aps: {
        alert: {
          title: payload.title || "AtiSunya CRM",
          body: payload.body || "You have a new reminder.",
        },
        sound: "default",
        badge: 1,
        "thread-id": payload.tag || "crm-reminder",
      },
      ...buildSharedPushData(payload),
    };

    let responseBody = "";
    request.setEncoding("utf8");

    request.on("response", (headers) => {
      request.on("data", (chunk) => {
        responseBody += chunk;
      });

      request.on("end", () => {
        client.close();

        const status = Number(headers[http2.constants.HTTP2_HEADER_STATUS] || 0);
        let parsedBody = {};

        try {
          parsedBody = responseBody ? JSON.parse(responseBody) : {};
        } catch {
          parsedBody = {};
        }

        resolve({
          success: status >= 200 && status < 300,
          status,
          reason: parsedBody.reason || "",
        });
      });
    });

    request.on("error", (error) => {
      client.close();
      resolve({
        success: false,
        status: 0,
        reason: error?.message || "APNS request failed",
      });
    });

    request.end(JSON.stringify(body));
  });
}

async function sendApnsPushToTokens(tokens, payload) {
  if (!tokens.length) {
    return { sent: 0, removed: 0, removedTokens: new Set(), skipped: false };
  }

  if (!isNativeIosPushConfigured()) {
    return { sent: 0, removed: 0, removedTokens: new Set(), skipped: true };
  }

  let sent = 0;
  const removedTokens = new Set();

  for (const item of tokens) {
    const result = await sendApnsNotification(item.token, payload);

    if (result.success) {
      sent += 1;
      continue;
    }

    if (
      result.status === 410 ||
      result.reason === "BadDeviceToken" ||
      result.reason === "Unregistered" ||
      result.reason === "DeviceTokenNotForTopic"
    ) {
      removedTokens.add(item.token);
    }
  }

  return {
    sent,
    removed: removedTokens.size,
    removedTokens,
    skipped: false,
  };
}

async function sendNativePushToUser(userId, payload) {
  if (!userId) {
    return { sent: 0, removed: 0, skipped: true, androidSent: 0, iosSent: 0 };
  }

  const user = await User.findById(userId).select("nativePushTokens");
  const tokens = Array.isArray(user?.nativePushTokens) ? user.nativePushTokens : [];

  if (!tokens.length) {
    return { sent: 0, removed: 0, skipped: false, androidSent: 0, iosSent: 0 };
  }

  const androidTokens = tokens.filter((item) => item.platform === "android");
  const iosTokens = tokens.filter((item) => item.platform === "ios");

  const [androidResult, iosResult] = await Promise.all([
    sendAndroidPushToTokens(androidTokens, payload),
    sendApnsPushToTokens(iosTokens, payload),
  ]);

  const removedTokens = new Set([
    ...androidResult.removedTokens,
    ...iosResult.removedTokens,
  ]);

  if (removedTokens.size > 0 && user) {
    user.nativePushTokens = tokens.filter((item) => !removedTokens.has(item.token));
    await user.save();
  }

  return {
    sent: androidResult.sent + iosResult.sent,
    removed: removedTokens.size,
    skipped: androidResult.skipped && iosResult.skipped,
    androidSent: androidResult.sent,
    iosSent: iosResult.sent,
  };
}

async function sendNativePushToCurrentToken(userId, token, payload) {
  const trimmedToken = typeof token === "string" ? token.trim() : "";
  if (!userId || !trimmedToken) {
    return { sent: 0, removed: 0, skipped: true };
  }

  const user = await User.findById(userId).select("nativePushTokens");
  const tokens = Array.isArray(user?.nativePushTokens) ? user.nativePushTokens : [];
  const matchedToken = tokens.find((item) => item.token === trimmedToken);

  if (!matchedToken) {
    return { sent: 0, removed: 0, skipped: false };
  }

  const platform = matchedToken.platform;
  const result =
    platform === "android"
      ? await sendAndroidPushToTokens([matchedToken], payload)
      : await sendApnsPushToTokens([matchedToken], payload);

  if (result.removedTokens?.size > 0 && user) {
    user.nativePushTokens = tokens.filter((item) => !result.removedTokens.has(item.token));
    await user.save();
  }

  return {
    sent: result.sent,
    removed: result.removed,
    skipped: result.skipped,
  };
}

async function sendPushToCurrentDevice(userId, target, payload) {
  if (target?.endpoint) {
    return sendWebPushToCurrentEndpoint(userId, target.endpoint, payload);
  }

  if (target?.nativeToken) {
    return sendNativePushToCurrentToken(userId, target.nativeToken, payload);
  }

  return { sent: 0, removed: 0, skipped: true };
}

async function sendPushToUser(userId, payload) {
  const [webResult, nativeResult] = await Promise.all([
    sendWebPushToUser(userId, payload),
    sendNativePushToUser(userId, payload),
  ]);

  return {
    sent: webResult.sent + nativeResult.sent,
    removed: webResult.removed + nativeResult.removed,
    skipped: webResult.skipped && nativeResult.skipped,
    web: webResult,
    native: nativeResult,
  };
}

module.exports = {
  getPublicKey,
  isPushConfigured,
  isNativePushConfigured,
  isNativeAndroidPushConfigured,
  isNativeIosPushConfigured,
  subscribeUser,
  unsubscribeUser,
  subscribeNativeUser,
  unsubscribeNativeUser,
  sendPushToUser,
  sendPushToCurrentDevice,
  sendNativePushToUser,
};
