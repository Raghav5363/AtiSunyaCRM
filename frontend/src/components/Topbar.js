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
    },
    data: [],
  };
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const safeBase64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(safeBase64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
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

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [notifications, setNotifications] = useState(createEmptyNotifications);
  const [showNotif, setShowNotif] = useState(false);
  const [activeReminderFilter, setActiveReminderFilter] = useState("all");
  const [pushState, setPushState] = useState({
    supported: false,
    enabled: false,
    subscribed: false,
    loading: false,
    permission: "default",
  });

  const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const token = localStorage.getItem("token");
  const user = useMemo(() => decodeJwtPayload(token), [token]);

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
          reminderState: item?.reminderState || getReminderStateFromDate(item?.reminderDate),
        }));
        const recalculatedSummary = nextData.reduce(
          (acc, item) => {
            acc.totalScheduled += 1;

            if (item.reminderState === "today") {
              acc.dueToday += 1;
            } else if (item.reminderState === "upcoming") {
              acc.upcoming += 1;
            } else if (item.reminderState === "overdue") {
              acc.overdue += 1;
            }

            if (item.isAlertActive) {
              acc.unread += 1;
            }

            return acc;
          },
          {
            overdue: 0,
            dueToday: 0,
            upcoming: 0,
            totalScheduled: 0,
            unread: 0,
          }
        );
        const activeAlertItems = nextData.filter((item) => item?.isAlertActive && item?._id);
        const seenIds = notifiedAlertIdsRef.current;

        activeAlertItems.forEach((item) => {
          if (!seenIds.has(item._id)) {
            toast.info(`${item?.name || "Lead"} reminder needs attention`, {
              autoClose: 3000,
            });

            playNotificationTone();

            seenIds.add(item._id);
          }
        });

        const activeIds = new Set(activeAlertItems.map((item) => item._id));
        notifiedAlertIdsRef.current = new Set(
          Array.from(seenIds).filter((id) => activeIds.has(id))
        );

        setNotifications({
          count: recalculatedSummary.unread,
          unreadCount: recalculatedSummary.unread,
          scheduledCount: recalculatedSummary.totalScheduled,
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

  const fetchPushStatus = useCallback(async () => {
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    if (!supported || !token) {
      setPushState((prev) => ({
        ...prev,
        supported,
        enabled: false,
        subscribed: false,
        permission: typeof Notification !== "undefined" ? Notification.permission : "default",
      }));
      return;
    }

    try {
      const res = await axios.get(`${BASE_URL}/api/users/push/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPushState((prev) => ({
        ...prev,
        supported,
        enabled: Boolean(res.data?.enabled),
        subscribed: Boolean(res.data?.subscribed),
        permission: Notification.permission,
      }));
    } catch {
      setPushState((prev) => ({
        ...prev,
        supported,
        permission: Notification.permission,
      }));
    }
  }, [BASE_URL, token]);

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
      }
    };

    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleFocusRefresh);

    return () => {
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleFocusRefresh);
    };
  }, [fetchNotifications]);

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
      fetchNotifications({ resetOnUnauthorized: false });
    });

    socket.on("connect_error", (error) => {
      console.log("Notification socket error:", error?.message || error);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [BASE_URL, fetchNotifications, token, user?.id]);

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

  const handleEnablePushNotifications = async () => {
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    if (!supported) {
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

      await axios.post(
        `${BASE_URL}/api/users/push/subscribe`,
        { subscription },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPushState((prev) => ({
        ...prev,
        supported: true,
        enabled: true,
        subscribed: true,
        permission: "granted",
      }));

      toast.success("Mobile push notifications enabled");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to enable mobile notifications");
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
              item._id === id ? { ...item, isAlertActive: false, reminderRead: true } : item
            )
          : [],
      };
    });

    notifiedAlertIdsRef.current.delete(id);

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
    navigate(`/lead/${item._id}`);
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

  const handleLogout = () => {
    localStorage.clear();
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    navigate("/login", { replace: true });
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
          (item) => getReminderStateFromDate(item.reminderDate) === activeReminderFilter
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
    pushState.supported && pushState.enabled && !pushState.subscribed;
  const pushStatusMessage = !pushState.supported
    ? "This device/browser does not support phone notifications."
    : !pushState.enabled
      ? "Server push setup is still pending."
      : pushState.subscribed
        ? "Phone notifications are enabled on this device."
        : pushState.permission === "denied"
          ? "Notifications are blocked in browser settings. Enable them there first."
          : "Enable phone notifications to receive reminders on the mobile screen.";

  return (
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
                  <h4 style={styles.dropdownTitle}>Reminder Center</h4>
                  <p style={styles.dropdownSub}>
                    Action-first reminders only. Open the lead directly from here.
                  </p>
                  <p style={styles.pushHint}>{pushStatusMessage}</p>
                  {showEnablePushButton && (
                    <button
                      type="button"
                      onClick={handleEnablePushNotifications}
                      style={styles.pushButton}
                      disabled={pushState.loading}
                    >
                      {pushState.loading ? "Enabling..." : "Enable phone notifications"}
                    </button>
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
                      ? "No scheduled reminders right now."
                      : `No ${activeReminderFilter} reminders right now.`}
                  </span>
                </div>
              ) : (
                <>
                  {filteredNotifications.map((item) => {
                    const tag = getReminderTag(item);
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
                        aria-label={`Open ${item.name || "lead"} reminder`}
                      >
                        <div style={styles.notificationTop}>
                          <div>
                            <div style={styles.notificationTitle}>{item.name || "Lead"}</div>
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
                            {(item.purpose || "followup").replace(/_/g, " ")}
                          </span>
                          <span style={styles.notificationTime}>
                            Due {formatReminderDate(item.reminderDate)}
                          </span>
                        </div>

                        <div style={styles.notificationFooter}>
                          <div style={styles.notificationNotes}>
                            {item.notes ? item.notes.trim() : "No notes added"}
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
  pushHint: {
    margin: "8px 0 0",
    fontSize: 11,
    color: "#475569",
    lineHeight: 1.5,
    maxWidth: 260,
  },
};
