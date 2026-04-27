import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import {
  FiAlertCircle,
  FiArrowRight,
  FiBell,
  FiCalendar,
  FiLogOut,
  FiMenu,
} from "react-icons/fi";
import MobilePushPrompt from "./MobilePushPrompt";
import {
  clearPushPromptDismissal,
  dismissPushPrompt,
  getPushEnvironment,
} from "../utils/pushSupport";
import {
  checkNativePushPermissions,
  ensureNativeReminderChannel,
  PushNotifications,
  registerNativePush,
  requestNativePushPermissions,
} from "../utils/nativePush";

const LIVE_REMINDER_TOAST_WINDOW_MS = 2 * 60 * 1000;

function decodeJwtPayload(token) {
  if (!token) return null;

  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}

function formatReminderDate(value) {
  if (!value) return "No reminder date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No reminder date";

  return date.toLocaleString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getReminderTag(item) {
  const reminderState = item?.reminderState || getReminderStateFromDate(item?.reminderDate);

  if (reminderState === "overdue") {
    return { label: "Overdue", color: "#b91c1c", background: "#fee2e2" };
  }

  if (reminderState === "today") {
    return { label: "Today", color: "#b45309", background: "#fef3c7" };
  }

  if (reminderState === "upcoming") {
    return { label: "Upcoming", color: "#1d4ed8", background: "#dbeafe" };
  }

  if (!item?.reminderDate) {
    return { label: "Unscheduled", color: "#64748b", background: "#f1f5f9" };
  }

  const reminder = new Date(item.reminderDate);
  if (Number.isNaN(reminder.getTime())) {
    return { label: "Unscheduled", color: "#64748b", background: "#f1f5f9" };
  }

  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  if (reminder < now) {
    return { label: "Overdue", color: "#b91c1c", background: "#fee2e2" };
  }

  if (reminder <= endOfToday) {
    return { label: "Today", color: "#b45309", background: "#fef3c7" };
  }

  return { label: "Upcoming", color: "#1d4ed8", background: "#dbeafe" };
}

function getNotificationTag(item) {
  if (item?.notificationType === "lead_assigned") {
    return { label: "Assigned", color: "#7c3aed", background: "#ede9fe" };
  }

  return getReminderTag(item);
}

function getNotificationTitle(item) {
  if (item?.notificationType === "lead_assigned") {
    return item?.title || `${item?.name || "Lead"} assigned`;
  }

  return item?.name || "Lead";
}

function getNotificationMetaText(item) {
  if (item?.notificationType === "lead_assigned") {
    return "New lead assignment";
  }

  return (item?.purpose || "followup").replace(/_/g, " ");
}

function getNotificationTimeText(item) {
  if (item?.notificationType === "lead_assigned") {
    return `Assigned ${formatReminderDate(item?.createdAt)}`;
  }

  return `Due ${formatReminderDate(item?.reminderDate)}`;
}

function getNotificationNotes(item) {
  if (item?.notificationType === "lead_assigned") {
    return item?.body || item?.notes || "A new lead was assigned to you.";
  }

  return item?.notes ? item.notes.trim() : "No notes added";
}

function isReminderPushCandidate(item) {
  return Boolean(
    item?.notificationType !== "lead_assigned" &&
      (item?.isAlertActive || item?.reminderState === "overdue" || item?.reminderState === "today")
  );
}

function getReminderStateFromDate(value) {
  if (!value) return "unscheduled";

  const reminder = new Date(value);
  if (Number.isNaN(reminder.getTime())) return "unscheduled";

  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  if (reminder < now) return "overdue";
  if (reminder <= endOfToday) return "today";
  return "upcoming";
}

function getRoleLabel(role) {
  if (!role) return "";
  return role.replace(/_/g, " ");
}

function createEmptyNotifications() {
  return {
    count: 0,
    unreadCount: 0,
    scheduledCount: 0,
    summary: {
      overdue: 0,
      dueToday: 0,
      upcoming: 0,
      totalScheduled: 0,
      unread: 0,
      assignmentCount: 0,
      assignmentUnread: 0,
    },
    data: [],
  };
}

function createInitialPushState() {
  return {
    supported: false,
    enabled: false,
    subscribed: false,
    anyDeviceSubscribed: false,
    deviceCount: 0,
    loading: false,
    permission: "default",
    secureContext: false,
    needsInstall: false,
    isIOS: false,
    isAndroid: false,
    isNativeApp: false,
    canUseWebPush: false,
    nativePlatform: "web",
  };
}

function getPushDeviceCopy(pushState) {
  const isPhoneDevice = Boolean(pushState?.isNativeApp || pushState?.isIOS || pushState?.isAndroid);

  return {
    isPhoneDevice,
    deviceLabel: isPhoneDevice ? "phone" : "browser",
    currentDeviceLabel: isPhoneDevice ? "this phone" : "this browser",
    currentDeviceLabelTitle: isPhoneDevice ? "This phone" : "This browser",
    enableButtonLabel: pushState?.isNativeApp
      ? "Enable app notifications"
      : isPhoneDevice
        ? "Enable phone notifications"
        : "Enable browser notifications",
  };
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const safeBase64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(safeBase64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function getTrackedNotificationKey(item = {}) {
  const nestedData =
    item?.data && typeof item.data === "object" && !Array.isArray(item.data) ? item.data : {};
  const rawType = item?.type || item?.notificationType || nestedData?.type || "reminder";
  const baseId =
    item?.notificationId ||
    item?._id ||
    item?.leadId ||
    nestedData?.notificationId ||
    nestedData?.leadId ||
    "";

  if (!baseId) {
    return "";
  }

  if (rawType === "lead-assigned" || rawType === "lead_assigned") {
    return `assignment:${baseId}`;
  }

  const reminderDate = item?.reminderDate || nestedData?.reminderDate || "";
  return `reminder:${baseId}:${reminderDate}`;
}

function getLiveNotificationMessage(item = {}) {
  const nestedData =
    item?.data && typeof item.data === "object" && !Array.isArray(item.data) ? item.data : {};
  const rawType = item?.type || item?.notificationType || nestedData?.type || "reminder";

  if (rawType === "lead-assigned" || rawType === "lead_assigned") {
    return item?.body || item?.title || "A new lead was assigned to you";
  }

  return item?.body || item?.notes || `${item?.name || nestedData?.leadName || "Lead"} reminder needs attention`;
}

function shouldShowLiveNotificationToast(item = {}) {
  const nestedData =
    item?.data && typeof item.data === "object" && !Array.isArray(item.data) ? item.data : {};
  const rawType = item?.type || item?.notificationType || nestedData?.type || "reminder";

  if (rawType === "lead-assigned" || rawType === "lead_assigned") {
    return true;
  }

  const reminderValue = item?.reminderDate || nestedData?.reminderDate;
  if (!reminderValue) {
    return false;
  }

  const reminderDate = new Date(reminderValue);
  if (Number.isNaN(reminderDate.getTime())) {
    return false;
  }

  return Math.abs(Date.now() - reminderDate.getTime()) <= LIVE_REMINDER_TOAST_WINDOW_MS;
}

function playNotificationTone() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(784, audioContext.currentTime);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.32);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.35);
    oscillator.onended = () => {
      audioContext.close().catch(() => {});
    };
  } catch {}
}

export default function Topbar({ openSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const notifRef = useRef(null);
  const socketRef = useRef(null);
  const notifiedAlertIdsRef = useRef(new Set());
  const syncedPushEndpointsRef = useRef(new Set());
  const currentWebPushEndpointRef = useRef("");
  const nativePushTokenRef = useRef("");
  const nativePushListenersRef = useRef([]);
  const sendNativeTestAfterSyncRef = useRef(false);
  const syncedCurrentDeviceNotificationsRef = useRef(new Set());

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [notifications, setNotifications] = useState(createEmptyNotifications);
  const [showNotif, setShowNotif] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [activeReminderFilter, setActiveReminderFilter] = useState("all");
  const [pushState, setPushState] = useState(createInitialPushState);

  const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const token = localStorage.getItem("token");
  const user = useMemo(() => decodeJwtPayload(token), [token]);
  const pushDeviceCopy = getPushDeviceCopy(pushState);

  const showLiveNotificationToast = useCallback((item) => {
    if (!shouldShowLiveNotificationToast(item)) {
      return false;
    }

    const trackingKey = getTrackedNotificationKey(item);
    if (trackingKey && notifiedAlertIdsRef.current.has(trackingKey)) {
      return false;
    }

    toast.info(getLiveNotificationMessage(item), {
      autoClose: 3500,
    });
    playNotificationTone();

    if (trackingKey) {
      const trackedKeys = notifiedAlertIdsRef.current;
      trackedKeys.add(trackingKey);

      while (trackedKeys.size > 200) {
        const oldestKey = trackedKeys.values().next().value;
        if (!oldestKey) {
          break;
        }

        trackedKeys.delete(oldestKey);
      }
    }

    return true;
  }, []);

  const notificationSyncStorageKey = useMemo(
    () => `atisunya_device_notification_sync_${user?.id || "guest"}`,
    [user?.id]
  );

  const persistSyncedNotificationKeys = useCallback(
    (values) => {
      try {
        const trimmedValues = Array.from(values).slice(-100);
        window.localStorage.setItem(notificationSyncStorageKey, JSON.stringify(trimmedValues));
      } catch {}
    },
    [notificationSyncStorageKey]
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(notificationSyncStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      syncedCurrentDeviceNotificationsRef.current = new Set(
        Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []
      );
    } catch {
      syncedCurrentDeviceNotificationsRef.current = new Set();
    }
  }, [notificationSyncStorageKey]);

  const fetchNotifications = useCallback(
    async ({ resetOnUnauthorized = true } = {}) => {
      const emptyState = createEmptyNotifications();

      if (!token) {
        setNotifications(emptyState);
        setActiveReminderFilter("all");
        return;
      }

      try {
        const res = await axios.get(`${BASE_URL}/api/leads/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const summary = {
          ...emptyState.summary,
          ...(res.data?.summary || {}),
        };
        const rawData = Array.isArray(res.data?.data) ? res.data.data : [];
        const nextData = rawData.map((item) => ({
          ...item,
          notificationType: item?.notificationType || "reminder",
          reminderState: item?.reminderState || getReminderStateFromDate(item?.reminderDate),
        }));
        const recalculatedSummary = nextData.reduce(
          (acc, item) => {
            acc.totalItems += 1;

            if (item.notificationType === "lead_assigned") {
              acc.assignmentCount += 1;
            } else {
              acc.totalScheduled += 1;

              if (item.reminderState === "today") {
                acc.dueToday += 1;
              } else if (item.reminderState === "upcoming") {
                acc.upcoming += 1;
              } else if (item.reminderState === "overdue") {
                acc.overdue += 1;
              }
            }

            if (item.isAlertActive) {
              acc.unread += 1;

              if (item.notificationType === "lead_assigned") {
                acc.assignmentUnread += 1;
              }
            }

            return acc;
          },
          {
            overdue: 0,
            dueToday: 0,
            upcoming: 0,
            totalScheduled: 0,
            unread: 0,
            assignmentCount: 0,
            assignmentUnread: 0,
            totalItems: 0,
          }
        );
        setNotifications({
          count: recalculatedSummary.unread,
          unreadCount: recalculatedSummary.unread,
          scheduledCount: recalculatedSummary.totalItems,
          summary: {
            ...summary,
            ...recalculatedSummary,
          },
          data: nextData,
        });
      } catch (err) {
        const status = err?.response?.status;
        console.log("Notification fetch error:", err?.response?.data || err.message);

        if (status === 401 && resetOnUnauthorized) {
          setNotifications(emptyState);
        }
      }
    },
    [BASE_URL, token]
  );

  const syncExistingSubscription = useCallback(
    async (subscription) => {
      if (!token || !subscription?.endpoint) {
        return;
      }

      if (syncedPushEndpointsRef.current.has(subscription.endpoint)) {
        return;
      }

      await axios.post(
        `${BASE_URL}/api/users/push/subscribe`,
        { subscription },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      syncedPushEndpointsRef.current.add(subscription.endpoint);
    },
    [BASE_URL, token]
  );

  const syncNativePushToken = useCallback(
    async (nativeToken, { sendTest = false } = {}) => {
      if (!token || !nativeToken) {
        return;
      }

      const environment = getPushEnvironment();
      const platform = environment.isIOS ? "ios" : environment.isAndroid ? "android" : "unknown";
      const deviceName = [navigator.platform, navigator.userAgent].filter(Boolean).join(" | ");

      nativePushTokenRef.current = nativeToken;

      await axios.post(
        `${BASE_URL}/api/users/push/native/subscribe`,
        {
          token: nativeToken,
          platform,
          appId: "com.atisunya.crm",
          deviceName,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPushState((prev) => ({
        ...prev,
        supported: true,
        subscribed: true,
        anyDeviceSubscribed: true,
        deviceCount: Math.max(prev.deviceCount || 0, 1),
      }));

      if (sendTest) {
        await axios.post(
          `${BASE_URL}/api/users/push/test`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    },
    [BASE_URL, token]
  );

  const fetchPushStatus = useCallback(async () => {
    const environment = getPushEnvironment();
    const permission = environment.isNativeApp
      ? (await checkNativePushPermissions().catch(() => ({ receive: "default" }))).receive
      : environment.notificationApiSupported && typeof Notification !== "undefined"
        ? Notification.permission
        : "default";

    if (!token) {
      setPushState((prev) => ({
        ...prev,
        ...createInitialPushState(),
        permission,
        secureContext: environment.secureContext,
        needsInstall: environment.needsInstallForIOSPush,
        isIOS: environment.isIOS,
        isAndroid: environment.isAndroid,
        isNativeApp: environment.isNativeApp,
        canUseWebPush: environment.canUseWebPush,
        supported: environment.isNativeApp || environment.canUseWebPush,
        nativePlatform: environment.isIOS ? "ios" : environment.isAndroid ? "android" : "web",
      }));
      return;
    }

    let localSubscription = null;

    if (environment.canUseWebPush) {
      try {
        const registration = await navigator.serviceWorker.ready;
        localSubscription = await registration.pushManager.getSubscription();
        currentWebPushEndpointRef.current = localSubscription?.endpoint || "";
      } catch (error) {
        console.log("Push registration lookup error:", error?.message || error);
        currentWebPushEndpointRef.current = "";
      }
    }

    try {
      const res = await axios.get(`${BASE_URL}/api/users/push/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (environment.canUseWebPush && Boolean(res.data?.enabled) && localSubscription) {
        try {
          await syncExistingSubscription(localSubscription);
        } catch (error) {
          console.log("Push sync error:", error?.response?.data || error?.message || error);
        }
      }

      const enabledForCurrentEnvironment = environment.isNativeApp
        ? environment.isIOS
          ? Boolean(res.data?.nativeIosEnabled)
          : environment.isAndroid
            ? Boolean(res.data?.nativeAndroidEnabled)
            : Boolean(res.data?.nativeEnabled)
        : Boolean(res.data?.enabled);
      const anyDeviceSubscribed = environment.isNativeApp
        ? Boolean(res.data?.nativeSubscribed)
        : Boolean(res.data?.subscribed);
      const deviceCount = environment.isNativeApp
        ? res.data?.nativeCount || 0
        : res.data?.count || 0;

      setPushState((prev) => ({
        ...prev,
        supported: environment.isNativeApp || environment.canUseWebPush,
        enabled: enabledForCurrentEnvironment,
        subscribed: environment.isNativeApp ? prev.subscribed : Boolean(localSubscription),
        anyDeviceSubscribed,
        deviceCount,
        permission,
        secureContext: environment.secureContext,
        needsInstall: environment.needsInstallForIOSPush,
        isIOS: environment.isIOS,
        isAndroid: environment.isAndroid,
        isNativeApp: environment.isNativeApp,
        canUseWebPush: environment.canUseWebPush,
        nativePlatform: environment.isIOS ? "ios" : environment.isAndroid ? "android" : "web",
      }));
    } catch {
      setPushState((prev) => ({
        ...prev,
        supported: environment.isNativeApp || environment.canUseWebPush,
        subscribed: environment.isNativeApp ? prev.subscribed : Boolean(localSubscription),
        anyDeviceSubscribed: false,
        deviceCount: 0,
        permission,
        secureContext: environment.secureContext,
        needsInstall: environment.needsInstallForIOSPush,
        isIOS: environment.isIOS,
        isAndroid: environment.isAndroid,
        isNativeApp: environment.isNativeApp,
        canUseWebPush: environment.canUseWebPush,
        nativePlatform: environment.isIOS ? "ios" : environment.isAndroid ? "android" : "web",
      }));
    }
  }, [BASE_URL, syncExistingSubscription, token]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications({ resetOnUnauthorized: false }), 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    fetchPushStatus();
  }, [fetchPushStatus]);

  useEffect(() => {
    const handleFocusRefresh = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications({ resetOnUnauthorized: false });
        fetchPushStatus();
      }
    };

    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleFocusRefresh);

    return () => {
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleFocusRefresh);
    };
  }, [fetchNotifications, fetchPushStatus]);

  useEffect(() => {
    const handleInstalled = () => {
      fetchPushStatus();
    };

    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [fetchPushStatus]);

  const resolveNotificationTarget = useCallback((data = {}) => {
    const rawUrl = typeof data?.url === "string" ? data.url.trim() : "";
    if (rawUrl) {
      if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
        try {
          const parsed = new URL(rawUrl);
          return `${parsed.pathname}${parsed.search}${parsed.hash}`;
        } catch {
          return "/dashboard";
        }
      }

      if (rawUrl.startsWith("/")) {
        return rawUrl;
      }
    }

    if (data?.leadId) {
      return `/lead/${data.leadId}`;
    }

    return "/dashboard";
  }, []);

  const getCurrentDevicePushTarget = useCallback(() => {
    if (pushState.isNativeApp && nativePushTokenRef.current) {
      return {
        nativeToken: nativePushTokenRef.current,
      };
    }

    if (currentWebPushEndpointRef.current) {
      return {
        endpoint: currentWebPushEndpointRef.current,
      };
    }

    return null;
  }, [pushState.isNativeApp]);

  const syncCurrentDeviceNotifications = useCallback(
    async (items, { force = false } = {}) => {
      if (!token || !pushState.subscribed || !Array.isArray(items) || !items.length) {
        return;
      }

      const deviceTarget = getCurrentDevicePushTarget();
      if (!deviceTarget) {
        return;
      }

      const importantItems = items.filter(
        (item) => item?._id && isReminderPushCandidate(item)
      );

      if (!importantItems.length) {
        return;
      }

      const keyForItem = (item) => `${item._id}:${item.reminderDate || ""}`;
      const syncedKeys = syncedCurrentDeviceNotificationsRef.current;
      const pendingItems = force
        ? importantItems
        : importantItems.filter((item) => !syncedKeys.has(keyForItem(item)));

      if (!pendingItems.length) {
        return;
      }

      await axios.post(
        `${BASE_URL}/api/leads/notifications/push-sync`,
        {
          notificationIds: pendingItems.map((item) => item._id),
          ...deviceTarget,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      pendingItems.forEach((item) => syncedKeys.add(keyForItem(item)));
      persistSyncedNotificationKeys(syncedKeys);
    },
    [BASE_URL, getCurrentDevicePushTarget, persistSyncedNotificationKeys, pushState.subscribed, token]
  );

  useEffect(() => {
    if (pushState.subscribed) {
      clearPushPromptDismissal();
      setShowPushPrompt(false);
    }
  }, [pushState.subscribed]);

  useEffect(() => {
    const environment = getPushEnvironment();
    if (!token || !environment.isNativeApp) {
      return undefined;
    }

    let cancelled = false;

    const setupNativePush = async () => {
      try {
        await PushNotifications.removeAllListeners();

        const registrationHandle = await PushNotifications.addListener(
          "registration",
          async (registrationToken) => {
            if (cancelled || !registrationToken?.value) {
              return;
            }

            try {
              await syncNativePushToken(registrationToken.value, {
                sendTest: sendNativeTestAfterSyncRef.current,
              });

              if (sendNativeTestAfterSyncRef.current) {
                toast.success(
                  `Notifications enabled on ${pushDeviceCopy.currentDeviceLabel}. Test notification sent.`
                );
                clearPushPromptDismissal();
                setShowPushPrompt(false);
              }
            } catch (error) {
              toast.error(
                error?.response?.data?.message || "Phone registered, but test notification failed"
              );
            } finally {
              sendNativeTestAfterSyncRef.current = false;
              setPushState((prev) => ({ ...prev, loading: false, subscribed: true }));
              fetchPushStatus();
            }
          }
        );

        const registrationErrorHandle = await PushNotifications.addListener(
          "registrationError",
          (error) => {
            if (cancelled) {
              return;
            }

            sendNativeTestAfterSyncRef.current = false;
            setPushState((prev) => ({ ...prev, loading: false }));
            toast.error(error?.error || "Unable to register this phone for notifications");
          }
        );

        const receivedHandle = await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            if (cancelled) {
              return;
            }

            fetchNotifications({ resetOnUnauthorized: false });
            showLiveNotificationToast(notification);
          }
        );

        const actionHandle = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            if (cancelled) {
              return;
            }

            fetchNotifications({ resetOnUnauthorized: false });
            const target = resolveNotificationTarget(action?.notification?.data || {});
            setShowNotif(false);
            navigate(target);
          }
        );

        nativePushListenersRef.current = [
          registrationHandle,
          registrationErrorHandle,
          receivedHandle,
          actionHandle,
        ];

        await ensureNativeReminderChannel();

        const permissions = await checkNativePushPermissions();
        if (cancelled) {
          return;
        }

        setPushState((prev) => ({
          ...prev,
          supported: true,
          permission: permissions.receive,
        }));

        if (permissions.receive === "granted") {
          await registerNativePush();
        }
      } catch (error) {
        console.log("Native push setup error:", error?.message || error);
      }
    };

    setupNativePush();

    return () => {
      cancelled = true;

      const handles = nativePushListenersRef.current;
      nativePushListenersRef.current = [];
      handles.forEach((handle) => {
        if (typeof handle?.remove === "function") {
          handle.remove().catch(() => {});
        }
      });
    };
  }, [
    fetchNotifications,
    fetchPushStatus,
    navigate,
    pushDeviceCopy.currentDeviceLabel,
    resolveNotificationTarget,
    showLiveNotificationToast,
    syncNativePushToken,
    token,
  ]);

  useEffect(() => {
    if (!token || !user?.id) {
      return undefined;
    }

    const socket = io(BASE_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_user", user.id);
      fetchNotifications({ resetOnUnauthorized: false });
    });

    socket.on("new_notification", (data) => {
      showLiveNotificationToast(data);
      fetchNotifications({ resetOnUnauthorized: false });
    });

    socket.on("connect_error", (error) => {
      console.log("Notification socket error:", error?.message || error);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [BASE_URL, fetchNotifications, showLiveNotificationToast, token, user?.id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotif(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const toggleNotifications = async () => {
    if (!showNotif) {
      await fetchNotifications({ resetOnUnauthorized: false });
      setActiveReminderFilter("all");
    }

    setShowNotif((prev) => !prev);
  };

  const closePushPrompt = useCallback(() => {
    dismissPushPrompt();
    setShowPushPrompt(false);
  }, []);

  const handleEnablePushNotifications = async () => {
    const environment = getPushEnvironment();

    if (environment.needsInstallForIOSPush) {
      setShowPushPrompt(true);
      toast.info("Install the CRM on the iPhone home screen first, then enable notifications.");
      return;
    }

    if (environment.isNativeApp) {
      try {
        setPushState((prev) => ({ ...prev, loading: true }));

        await ensureNativeReminderChannel();
        let permissionState = await checkNativePushPermissions();

        if (permissionState.receive === "prompt" || permissionState.receive === "prompt-with-rationale") {
          permissionState = await requestNativePushPermissions();
        }

        setPushState((prev) => ({ ...prev, permission: permissionState.receive }));

        if (permissionState.receive !== "granted") {
          sendNativeTestAfterSyncRef.current = false;
          setPushState((prev) => ({ ...prev, loading: false }));
          toast.error("Notification permission was not allowed on this phone");
          return;
        }

        sendNativeTestAfterSyncRef.current = true;
        await registerNativePush();
        toast.info(
          `Registering ${pushDeviceCopy.currentDeviceLabel} for automatic reminder notifications...`
        );
        return;
      } catch (error) {
        sendNativeTestAfterSyncRef.current = false;
        setPushState((prev) => ({ ...prev, loading: false }));
        toast.error(
          error?.message ||
            `Unable to enable notifications on ${pushDeviceCopy.currentDeviceLabel}`
        );
        return;
      }
    }

    if (!environment.canUseWebPush) {
      toast.error("This device/browser does not support web push notifications");
      return;
    }

    try {
      setPushState((prev) => ({ ...prev, loading: true }));

      const permission = await Notification.requestPermission();
      setPushState((prev) => ({ ...prev, permission }));
      if (permission !== "granted") {
        toast.error("Notification permission was not allowed");
        return;
      }

      const keyRes = await axios.get(`${BASE_URL}/api/users/push/public-key`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!keyRes.data?.enabled || !keyRes.data?.publicKey) {
        toast.error("Push notifications are not configured on the server yet");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyRes.data.publicKey),
        });
      }

      currentWebPushEndpointRef.current = subscription?.endpoint || "";

      await axios.post(
        `${BASE_URL}/api/users/push/subscribe`,
        { subscription },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (subscription?.endpoint) {
        syncedPushEndpointsRef.current.add(subscription.endpoint);
      }

      await axios.post(
        `${BASE_URL}/api/users/push/test`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPushState((prev) => ({
        ...prev,
        supported: true,
        enabled: true,
        subscribed: true,
        anyDeviceSubscribed: true,
        deviceCount: Math.max(prev.deviceCount || 0, 1),
        permission: "granted",
        secureContext: environment.secureContext,
        needsInstall: false,
        isIOS: environment.isIOS,
        isAndroid: environment.isAndroid,
        isNativeApp: environment.isNativeApp,
        canUseWebPush: true,
      }));

      clearPushPromptDismissal();
      setShowPushPrompt(false);
      fetchPushStatus();
      toast.success(
        `Notifications enabled on ${pushDeviceCopy.currentDeviceLabel}. A test notification was sent.`
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          `Unable to enable notifications on ${pushDeviceCopy.currentDeviceLabel}`
      );
    } finally {
      setPushState((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleSendTestNotification = async () => {
    try {
      setPushState((prev) => ({ ...prev, loading: true }));

      const importantItems = (notifications.data || []).filter(
        (item) => isReminderPushCandidate(item)
      );

      if (pushState.subscribed && importantItems.length) {
        await syncCurrentDeviceNotifications(importantItems, { force: true });
        toast.success(`Active reminders sent to ${pushDeviceCopy.currentDeviceLabel}`);
        return;
      }

      await axios.post(
        `${BASE_URL}/api/users/push/test`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Test notification sent to ${pushDeviceCopy.currentDeviceLabel}`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send test notification");
    } finally {
      setPushState((prev) => ({ ...prev, loading: false }));
    }
  };

  const markAsRead = async (id) => {
    if (!token || !id) return;

    setNotifications((prev) => {
      const nextSummary = {
        ...(prev.summary || createEmptyNotifications().summary),
      };

      if (nextSummary.unread > 0) {
        nextSummary.unread -= 1;
      }

      return {
        ...prev,
        count: Math.max((prev.count || 0) - 1, 0),
        unreadCount: Math.max((prev.unreadCount || 0) - 1, 0),
        summary: nextSummary,
        data: Array.isArray(prev.data)
          ? prev.data.map((item) =>
              item._id === id
                ? { ...item, isAlertActive: false, reminderRead: true, isRead: true }
                : item
            )
          : [],
      };
    });

    try {
      await axios.put(
        `${BASE_URL}/api/leads/notifications/${id}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (err) {
      console.log("Mark read error:", err?.response?.data || err.message);
      fetchNotifications({ resetOnUnauthorized: false });
    }
  };

  const handleNotificationClick = (item) => {
    if (!item?._id) return;

    if (item.isAlertActive) {
      markAsRead(item._id);
    }

    setShowNotif(false);
    navigate(item.routeTarget || (item.leadId ? `/lead/${item.leadId}` : `/lead/${item._id}`));
  };

  const pageTitles = {
    "/dashboard": "Dashboard",
    "/leads": "Leads",
    "/add": "Add Lead",
    "/followups": "Follow Ups",
    "/admin-dashboard": "Admin Dashboard",
    "/users": "User Management",
    "/reports": "Reports",
  };

  const getPageTitle = () => {
    if (location.pathname.startsWith("/edit")) return "Edit Lead";
    if (location.pathname.startsWith("/lead")) return "Lead Details";
    if (location.pathname.startsWith("/login")) return "Login";
    return pageTitles[location.pathname] || "Dashboard";
  };

  const handleLogout = async () => {
    try {
      if (pushState.isNativeApp && nativePushTokenRef.current && token) {
        await axios.post(
          `${BASE_URL}/api/users/push/native/unsubscribe`,
          { token: nativePushTokenRef.current },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (error) {
      console.log("Native push unsubscribe error:", error?.response?.data || error?.message);
    } finally {
      localStorage.clear();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      navigate("/login", { replace: true });
    }
  };

  const summary = notifications.summary || createEmptyNotifications().summary;
  const unreadBadgeCount = notifications.unreadCount ?? notifications.count ?? 0;
  const scheduledCount =
    notifications.scheduledCount ?? summary.totalScheduled ?? notifications.data.length;
  const summaryCards = [
    {
      key: "all",
      label: "All",
      value: scheduledCount || 0,
      color: "#0f172a",
      background: "#e2e8f0",
    },
    {
      key: "today",
      label: "Today",
      value: summary.dueToday || 0,
      color: "#b45309",
      background: "#fef3c7",
    },
    {
      key: "upcoming",
      label: "Upcoming",
      value: summary.upcoming || 0,
      color: "#1d4ed8",
      background: "#dbeafe",
    },
    {
      key: "overdue",
      label: "Overdue",
      value: summary.overdue || 0,
      color: "#b91c1c",
      background: "#fee2e2",
    },
  ];
  const filteredNotifications =
    activeReminderFilter === "all"
      ? notifications.data
      : notifications.data.filter(
          (item) =>
            item?.notificationType !== "lead_assigned" &&
            getReminderStateFromDate(item.reminderDate) === activeReminderFilter
        );

  const barStyle = styles.bar;
  const titleStyle = {
    ...styles.title,
    fontSize: isMobile ? 16 : 18,
  };
  const mobileBarStyle = isMobile
    ? {
        ...barStyle,
        background: "rgba(255,255,255,0.5)",
        borderBottom: "1px solid rgba(226,232,240,0.58)",
        boxShadow: "0 6px 20px rgba(15,23,42,0.04)",
      }
    : barStyle;
  const showEnablePushButton =
    pushState.supported &&
    !pushState.needsInstall &&
    !pushState.subscribed &&
    pushState.permission !== "denied";
  const showInstallCardInDropdown = pushState.needsInstall && !pushState.subscribed;
  const showOtherDeviceHint =
    pushState.anyDeviceSubscribed && !pushState.subscribed && pushState.deviceCount > 0;
  const showDesktopSyncButton = !isMobile && pushState.subscribed && pushState.enabled;
  const importantNotificationCount = (notifications.data || []).filter(
    (item) => isReminderPushCandidate(item)
  ).length;
  const otherDeviceHintMessage = `Another device on this account is already enabled. ${pushDeviceCopy.currentDeviceLabelTitle} still needs its own enable step.`;
  const pushStatusMessage = pushState.isNativeApp
    ? !pushState.enabled
      ? `Native ${pushState.nativePlatform} push is not fully configured on the server yet.`
      : pushState.subscribed
        ? "Automatic reminder notifications are enabled on this phone."
        : pushState.permission === "denied"
          ? "Notifications are blocked in phone settings. Enable them there first."
          : "Enable real tray notifications for this installed mobile app."
    : !pushState.secureContext
      ? `Open this CRM over HTTPS to enable ${pushDeviceCopy.deviceLabel} notifications.`
      : showInstallCardInDropdown
        ? "Install this CRM on the home screen first, then allow notifications on the phone."
        : !pushState.supported
          ? `This ${pushDeviceCopy.deviceLabel} does not support reminder notifications.`
          : !pushState.enabled
            ? "Server push setup is still pending."
            : pushState.subscribed
              ? pushDeviceCopy.isPhoneDevice
                ? "Automatic reminder notifications are enabled on this phone."
                : "Automatic reminder notifications are enabled in this browser."
              : pushState.permission === "denied"
                ? pushDeviceCopy.isPhoneDevice
                  ? "Notifications are blocked in phone settings. Enable them there first."
                  : "Notifications are blocked in browser settings. Enable them there first."
                : pushDeviceCopy.isPhoneDevice
                  ? "Enable phone notifications to receive reminders in the mobile tray."
                  : "Enable browser notifications to receive reminders in the browser tray.";
  const pushSyncHelperMessage =
    showDesktopSyncButton
      ? `Future reminders are sent automatically to every enabled device when they become due. Use the button below only to resend active reminders to ${pushDeviceCopy.currentDeviceLabel}.`
      : "";

  return (
    <>
      <MobilePushPrompt
        open={showPushPrompt}
        loading={pushState.loading}
        pushState={pushState}
        onClose={closePushPrompt}
        onEnable={handleEnablePushNotifications}
      />

      <div style={mobileBarStyle}>
      <div style={styles.left}>
        {isMobile && (
          <button onClick={openSidebar} style={styles.iconButton} aria-label="Open menu">
            <FiMenu />
          </button>
        )}
        <div>
          <h3 style={titleStyle}>{getPageTitle()}</h3>
          {!isMobile && <p style={styles.subtitle}>Fast, clean CRM workspace</p>}
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.notificationWrap} ref={notifRef}>
          <button
            onClick={toggleNotifications}
            style={{ ...styles.iconButton, ...styles.bellButton }}
            aria-label="Notifications"
          >
            <FiBell />
          </button>

          {unreadBadgeCount > 0 && <span style={styles.badge}>{unreadBadgeCount}</span>}

          {showNotif && (
            <div style={isMobile ? styles.mobileDropdown : styles.dropdown}>
              <div style={styles.dropdownHeader}>
                <div>
                  <h4 style={styles.dropdownTitle}>Notification Center</h4>
                  <p style={styles.dropdownSub}>
                    Action-first alerts. Open the lead directly from here.
                  </p>
                  <p style={styles.pushHint}>{pushStatusMessage}</p>
                  {showOtherDeviceHint && (
                    <p style={styles.pushDeviceHint}>
                      {otherDeviceHintMessage}
                    </p>
                  )}
                  {showEnablePushButton && (
                    <button
                      type="button"
                      onClick={handleEnablePushNotifications}
                      style={styles.pushButton}
                      disabled={pushState.loading}
                    >
                      {pushState.loading ? "Enabling..." : pushDeviceCopy.enableButtonLabel}
                    </button>
                  )}
                  {showDesktopSyncButton && (
                    <>
                      <button
                        type="button"
                        onClick={handleSendTestNotification}
                        style={styles.pushSecondaryButton}
                        disabled={pushState.loading}
                      >
                        {pushState.loading
                          ? "Sending..."
                          : importantNotificationCount > 0
                            ? `${
                                pushDeviceCopy.isPhoneDevice
                                  ? "Resend active reminders to this phone"
                                  : "Resend active reminders to this browser"
                              } (${importantNotificationCount})`
                            : `Send test notification to ${pushDeviceCopy.currentDeviceLabel}`}
                      </button>
                      <p style={styles.pushHint}>{pushSyncHelperMessage}</p>
                    </>
                  )}
                  {showInstallCardInDropdown && (
                    <div style={styles.installCardInDropdown}>
                      <button
                        type="button"
                        onClick={() => setShowPushPrompt(true)}
                        style={styles.pushSecondaryButton}
                      >
                        Install app for iPhone notifications
                      </button>
                    </div>
                  )}
                </div>
                <div style={styles.dropdownCount}>{scheduledCount || 0}</div>
              </div>

              <div style={styles.summaryRow}>
                {summaryCards.map((card) => (
                  <button
                    key={card.key}
                    type="button"
                    onClick={() => setActiveReminderFilter(card.key)}
                    style={{
                      ...styles.summaryCard,
                      ...(activeReminderFilter === card.key ? styles.summaryCardActive : null),
                      background: card.background,
                    }}
                  >
                    <span style={{ ...styles.summaryValue, color: card.color }}>{card.value}</span>
                    <span style={{ ...styles.summaryLabel, color: card.color }}>{card.label}</span>
                  </button>
                ))}
              </div>

              {filteredNotifications.length === 0 ? (
                <div style={styles.emptyState}>
                  <FiCalendar />
                    <span>
                    {activeReminderFilter === "all"
                      ? "No notifications right now."
                      : `No ${activeReminderFilter} reminders right now.`}
                  </span>
                </div>
              ) : (
                <>
                  {filteredNotifications.map((item) => {
                    const tag = getNotificationTag(item);
                    const showLiveAlert = Boolean(item.isAlertActive);

                    return (
                      <button
                        key={item._id}
                        onClick={() => handleNotificationClick(item)}
                        style={{
                          ...styles.notificationItem,
                          ...(showLiveAlert ? styles.notificationItemAlert : null),
                        }}
                        type="button"
                        aria-label={`Open ${getNotificationTitle(item)}`}
                      >
                        <div style={styles.notificationTop}>
                          <div>
                            <div style={styles.notificationTitle}>{getNotificationTitle(item)}</div>
                            {showLiveAlert && (
                              <div style={styles.alertRow}>
                                <FiAlertCircle />
                                <span>Unread alert</span>
                              </div>
                            )}
                          </div>

                          <div style={styles.notificationBadges}>
                            <span
                              style={{
                                ...styles.notificationTag,
                                color: tag.color,
                                background: tag.background,
                              }}
                            >
                              {tag.label}
                            </span>
                            <span
                              style={{
                                ...styles.notificationTag,
                                color: "#0f766e",
                                background: "#ccfbf1",
                              }}
                            >
                              Click to open
                            </span>
                          </div>
                        </div>

                        <div style={styles.notificationMetaRow}>
                          <span style={styles.notificationMeta}>
                            {getNotificationMetaText(item)}
                          </span>
                          <span style={styles.notificationTime}>
                            {getNotificationTimeText(item)}
                          </span>
                        </div>

                        <div style={styles.notificationFooter}>
                          <div style={styles.notificationNotes}>
                            {getNotificationNotes(item)}
                          </div>
                          <div style={styles.notificationLink}>
                            <span>Open lead</span>
                            <FiArrowRight />
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  <div style={styles.dropdownFooter}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNotif(false);
                        navigate("/followups");
                      }}
                      style={styles.footerButton}
                    >
                      Open follow-up board
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {!isMobile && user?.role && <span style={styles.role}>{getRoleLabel(user.role)}</span>}

        <button onClick={handleLogout} style={styles.iconButton} aria-label="Logout">
          <FiLogOut />
        </button>
      </div>
      </div>
    </>
  );
}

const styles = {
  bar: {
    minHeight: 62,
    background: "rgba(255,255,255,0.62)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 10px",
    borderBottom: "1px solid rgba(226,232,240,0.72)",
    position: "sticky",
    top: 0,
    zIndex: 120,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
    flexShrink: 0,
  },
  left: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    minWidth: 0,
  },
  right: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: 18,
    color: "var(--heading)",
    fontWeight: 800,
    lineHeight: 1.1,
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: 11,
    color: "var(--text)",
  },
  role: {
    fontSize: 11,
    color: "var(--text)",
    textTransform: "capitalize",
    padding: "8px 11px",
    borderRadius: 999,
    background: "rgba(148,163,184,0.08)",
    border: "1px solid var(--border)",
    whiteSpace: "nowrap",
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    border: "1px solid rgba(226,232,240,0.75)",
    background: "rgba(255,255,255,0.72)",
    color: "var(--heading)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 17,
    boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
    transition: "transform 0.18s ease, box-shadow 0.18s ease",
  },
  notificationWrap: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    background: "#ef4444",
    color: "#fff",
    fontSize: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 5px",
    boxShadow: "0 8px 16px rgba(239,68,68,0.35)",
  },
  bellButton: {
    color: "#c27c00",
    background: "linear-gradient(180deg, rgba(255,247,204,0.9), rgba(255,255,255,0.8))",
  },
  dropdown: {
    position: "absolute",
    top: 46,
    right: 0,
    width: 380,
    background: "var(--card)",
    boxShadow: "0 22px 46px rgba(15, 23, 42, 0.18)",
    borderRadius: 18,
    border: "1px solid var(--border)",
    overflow: "hidden",
    zIndex: 1000,
    maxHeight: 460,
    overflowY: "auto",
  },
  mobileDropdown: {
    position: "fixed",
    top: 68,
    left: "50%",
    transform: "translateX(-50%)",
    width: "92%",
    background: "var(--card)",
    boxShadow: "0 22px 46px rgba(15, 23, 42, 0.18)",
    borderRadius: 18,
    border: "1px solid var(--border)",
    overflow: "hidden",
    zIndex: 1000,
    maxHeight: "72vh",
    overflowY: "auto",
  },
  dropdownHeader: {
    padding: "14px",
    borderBottom: "1px solid var(--border)",
    background: "var(--card)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  dropdownTitle: {
    margin: 0,
    fontSize: 14,
    color: "var(--heading)",
  },
  dropdownSub: {
    margin: "6px 0 0",
    fontSize: 11,
    color: "var(--text)",
    lineHeight: 1.45,
  },
  dropdownCount: {
    minWidth: 36,
    height: 36,
    borderRadius: 12,
    background: "#eff6ff",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 12,
  },
  summaryRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 8,
    padding: "12px 14px 14px",
    borderBottom: "1px solid var(--border)",
    background: "linear-gradient(180deg, rgba(248,250,252,0.92), rgba(255,255,255,0.96))",
  },
  summaryCard: {
    borderRadius: 14,
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    transition: "transform 0.18s ease, box-shadow 0.18s ease",
  },
  summaryCardActive: {
    transform: "translateY(-1px)",
    boxShadow: "0 10px 22px rgba(15,23,42,0.08)",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 800,
    lineHeight: 1,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: 700,
  },
  emptyState: {
    padding: 18,
    margin: 0,
    fontSize: 12,
    color: "var(--text)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    textAlign: "center",
  },
  notificationItem: {
    width: "100%",
    padding: 14,
    border: "none",
    borderBottom: "1px solid var(--border)",
    cursor: "pointer",
    textAlign: "left",
    background: "transparent",
    transition: "background 0.18s ease, transform 0.18s ease",
  },
  notificationItemAlert: {
    background: "linear-gradient(180deg, rgba(254,242,242,0.92), rgba(255,255,255,0.98))",
  },
  notificationTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  notificationBadges: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  notificationTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: "var(--heading)",
  },
  alertRow: {
    marginTop: 6,
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 10,
    fontWeight: 700,
    color: "#b91c1c",
    background: "#fee2e2",
    padding: "4px 7px",
    borderRadius: 999,
  },
  notificationTag: {
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 10,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  notificationMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 10,
  },
  notificationMeta: {
    fontSize: 11,
    color: "#2563eb",
    textTransform: "capitalize",
    fontWeight: 700,
  },
  notificationTime: {
    fontSize: 11,
    color: "var(--text)",
  },
  notificationFooter: {
    marginTop: 10,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
  },
  notificationNotes: {
    fontSize: 11,
    color: "var(--text)",
    lineHeight: 1.5,
    flex: 1,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  notificationLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    fontWeight: 800,
    color: "#0f766e",
    whiteSpace: "nowrap",
  },
  dropdownFooter: {
    padding: 12,
    background: "rgba(248,250,252,0.92)",
  },
  footerButton: {
    width: "100%",
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#0f172a",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  pushButton: {
    marginTop: 10,
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: 12,
    padding: "9px 12px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  pushSecondaryButton: {
    marginTop: 8,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    borderRadius: 12,
    padding: "9px 12px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  pushHint: {
    margin: "8px 0 0",
    fontSize: 11,
    color: "#475569",
    lineHeight: 1.5,
    maxWidth: 260,
  },
  pushDeviceHint: {
    margin: "8px 0 0",
    fontSize: 11,
    color: "#9a3412",
    lineHeight: 1.5,
    maxWidth: 280,
  },
  installCardInDropdown: {
    marginTop: 10,
    maxWidth: 290,
  },
};
