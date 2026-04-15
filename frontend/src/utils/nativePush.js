import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

export function isNativePushEnvironment() {
  if (typeof Capacitor?.isNativePlatform === "function") {
    return Capacitor.isNativePlatform();
  }

  if (typeof Capacitor?.getPlatform === "function") {
    return Capacitor.getPlatform() !== "web";
  }

  return false;
}

export function getNativePlatform() {
  if (typeof Capacitor?.getPlatform === "function") {
    return Capacitor.getPlatform();
  }

  return "web";
}

export async function ensureNativeReminderChannel() {
  if (getNativePlatform() !== "android") {
    return;
  }

  await PushNotifications.createChannel({
    id: "crm-reminders",
    name: "CRM Reminders",
    description: "Lead reminders and follow-up alerts",
    importance: 5,
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: "#1d4ed8",
  });
}

export async function checkNativePushPermissions() {
  return PushNotifications.checkPermissions();
}

export async function requestNativePushPermissions() {
  return PushNotifications.requestPermissions();
}

export async function registerNativePush() {
  await PushNotifications.register();
}

export async function unregisterNativePush() {
  await PushNotifications.unregister();
}

export { PushNotifications };
