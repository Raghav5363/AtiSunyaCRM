const PUSH_PROMPT_DISMISS_KEY = "atisunya_mobile_push_prompt_dismissed_at";
const DEFAULT_DISMISS_MS = 12 * 60 * 60 * 1000;

function isStandaloneMode() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator?.standalone === true
  );
}

function isNativeCapacitorApp() {
  if (typeof window === "undefined") return false;

  const capacitor = window.Capacitor;
  if (!capacitor) return false;

  if (typeof capacitor.isNativePlatform === "function") {
    return capacitor.isNativePlatform();
  }

  if (typeof capacitor.getPlatform === "function") {
    return capacitor.getPlatform() !== "web";
  }

  return false;
}

export function getPushEnvironment() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      isSafari: false,
      isStandalone: false,
      isNativeApp: false,
      secureContext: false,
      notificationApiSupported: false,
      serviceWorkerSupported: false,
      pushManagerSupported: false,
      canUseWebPush: false,
      needsInstallForIOSPush: false,
    };
  }

  const ua = window.navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isSafari =
    isIOS &&
    /Safari/i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|mercury/i.test(ua);
  const isStandalone = isStandaloneMode();
  const isNativeApp = isNativeCapacitorApp();
  const secureContext =
    window.isSecureContext ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const notificationApiSupported = "Notification" in window;
  const serviceWorkerSupported = "serviceWorker" in navigator;
  const pushManagerSupported = "PushManager" in window;
  const needsInstallForIOSPush = isIOS && !isNativeApp && !isStandalone;

  return {
    isMobile: isIOS || isAndroid,
    isIOS,
    isAndroid,
    isSafari,
    isStandalone,
    isNativeApp,
    secureContext,
    notificationApiSupported,
    serviceWorkerSupported,
    pushManagerSupported,
    canUseWebPush:
      !isNativeApp &&
      secureContext &&
      notificationApiSupported &&
      serviceWorkerSupported &&
      pushManagerSupported,
    needsInstallForIOSPush,
  };
}

export function shouldSuppressPushPrompt() {
  if (typeof window === "undefined") return false;

  const raw = window.localStorage.getItem(PUSH_PROMPT_DISMISS_KEY);
  if (!raw) return false;

  const dismissedAt = Number(raw);
  if (!Number.isFinite(dismissedAt)) return false;

  return Date.now() - dismissedAt < DEFAULT_DISMISS_MS;
}

export function dismissPushPrompt() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PUSH_PROMPT_DISMISS_KEY, String(Date.now()));
}

export function clearPushPromptDismissal() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PUSH_PROMPT_DISMISS_KEY);
}
