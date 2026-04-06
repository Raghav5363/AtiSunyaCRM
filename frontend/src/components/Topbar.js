import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import { FiBell, FiClock, FiLogOut, FiMenu, FiMoon, FiSun } from "react-icons/fi";

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
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getReminderTag(value) {
  if (!value) {
    return { label: "Unscheduled", color: "#64748b", background: "#f1f5f9" };
  }

  const reminder = new Date(value);
  if (Number.isNaN(reminder.getTime())) {
    return { label: "Unscheduled", color: "#64748b", background: "#f1f5f9" };
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  if (reminder < todayStart) {
    return { label: "Overdue", color: "#b91c1c", background: "#fee2e2" };
  }

  if (reminder >= todayStart && reminder < tomorrowStart) {
    return { label: "Today", color: "#b45309", background: "#fef3c7" };
  }

  return { label: "Upcoming", color: "#1d4ed8", background: "#dbeafe" };
}

function getRoleLabel(role) {
  if (!role) return "";
  return role.replace(/_/g, " ");
}

export default function Topbar({ openSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const notifRef = useRef(null);
  const socketRef = useRef(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [darkMode, setDarkMode] = useState(localStorage.getItem("darkMode") === "true");
  const [notifications, setNotifications] = useState({ count: 0, data: [] });
  const [showNotif, setShowNotif] = useState(false);

  const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const token = localStorage.getItem("token");
  const user = useMemo(() => decodeJwtPayload(token), [token]);

  const fetchNotifications = useCallback(
    async ({ resetOnUnauthorized = true } = {}) => {
      if (!token) {
        setNotifications({ count: 0, data: [] });
        return;
      }

      try {
        const res = await axios.get(`${BASE_URL}/api/leads/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setNotifications({
          count: res.data?.count || 0,
          data: Array.isArray(res.data?.data) ? res.data.data : [],
        });
      } catch (err) {
        const status = err?.response?.status;
        console.log("Notification fetch error:", err?.response?.data || err.message);

        if (status === 401 && resetOnUnauthorized) {
          setNotifications({ count: 0, data: [] });
        }
      }
    },
    [BASE_URL, token]
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", darkMode);
    window.dispatchEvent(new Event("storage"));
  }, [darkMode]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications({ resetOnUnauthorized: false }), 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

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
      setNotifications((prev) => {
        const nextItems = Array.isArray(prev.data) ? prev.data : [];
        const alreadyExists = nextItems.some((item) => item._id === data?._id);

        if (alreadyExists) {
          return prev;
        }

        return {
          count: (prev.count || 0) + 1,
          data: [data, ...nextItems],
        };
      });

      toast.info(`Reminder: ${data?.name || "Lead"}`, {
        autoClose: 3000,
      });

      try {
        const audio = new Audio("/notification.mp3");
        audio.volume = 0.7;
        audio.play().catch(() => {});
      } catch {}
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleNotifications = async () => {
    if (!showNotif) {
      await fetchNotifications({ resetOnUnauthorized: false });
    }

    setShowNotif((prev) => !prev);
  };

  const markAsRead = async (id) => {
    if (!token || !id) return;

    setNotifications((prev) => ({
      count: Math.max((prev.count || 0) - 1, 0),
      data: prev.data.filter((item) => item._id !== id),
    }));

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

  const handleNotificationClick = async (item) => {
    if (!item?._id) return;

    await markAsRead(item._id);
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

  const barStyle = {
    ...styles.bar,
    background: darkMode ? "rgba(15,23,42,0.78)" : "rgba(255,255,255,0.72)",
  };

  return (
    <div style={barStyle}>
      <div style={styles.left}>
        {isMobile && (
          <button onClick={openSidebar} style={styles.iconButton} aria-label="Open menu">
            <FiMenu />
          </button>
        )}
        <div>
          <h3 style={styles.title}>{getPageTitle()}</h3>
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

          {notifications.count > 0 && <span style={styles.badge}>{notifications.count}</span>}

          {showNotif && (
            <div style={isMobile ? styles.mobileDropdown : styles.dropdown}>
              <div style={styles.dropdownHeader}>
                <div>
                  <h4 style={styles.dropdownTitle}>Reminder Notifications</h4>
                  <p style={styles.dropdownSub}>Due and overdue unread reminders appear here.</p>
                </div>
                <div style={styles.dropdownCount}>{notifications.count || 0}</div>
              </div>

              {notifications.data.length === 0 ? (
                <div style={styles.emptyState}>
                  <FiClock />
                  <span>No unread reminder notifications right now.</span>
                </div>
              ) : (
                notifications.data.map((item) => {
                  const tag = getReminderTag(item.reminderDate);

                  return (
                    <button
                      key={item._id}
                      onClick={() => handleNotificationClick(item)}
                      style={styles.notificationItem}
                      type="button"
                    >
                      <div style={styles.notificationTop}>
                        <div style={styles.notificationTitle}>{item.name || "Lead"}</div>
                        <span
                          style={{
                            ...styles.notificationTag,
                            color: tag.color,
                            background: tag.background,
                          }}
                        >
                          {tag.label}
                        </span>
                      </div>

                      <div style={styles.notificationMetaRow}>
                        <span style={styles.notificationMeta}>
                          {(item.purpose || "followup").replace(/_/g, " ")}
                        </span>
                        <span style={styles.notificationTime}>
                          {formatReminderDate(item.reminderDate)}
                        </span>
                      </div>

                      <div style={styles.notificationNotes}>
                        {item.notes || "No notes added"}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setDarkMode((prev) => !prev)}
          style={{ ...styles.iconButton, ...styles.themeButton }}
          aria-label="Toggle theme"
        >
          {darkMode ? <FiSun /> : <FiMoon />}
        </button>

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
    background: "rgba(255,255,255,0.72)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    borderBottom: "1px solid var(--border)",
    position: "sticky",
    top: 0,
    zIndex: 50,
    backdropFilter: "blur(18px)",
    boxShadow: "0 10px 26px rgba(15,23,42,0.05)",
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
    fontSize: 12,
    color: "var(--text)",
  },
  role: {
    fontSize: 12,
    color: "var(--text)",
    textTransform: "capitalize",
    padding: "9px 12px",
    borderRadius: 999,
    background: "rgba(148,163,184,0.08)",
    border: "1px solid var(--border)",
    whiteSpace: "nowrap",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--heading)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 18,
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
    background: "linear-gradient(180deg, #fff7cc, #ffffff)",
  },
  themeButton: {
    color: "#d4a106",
    background: "linear-gradient(180deg, #fffdf0, #ffffff)",
  },
  dropdown: {
    position: "absolute",
    top: 48,
    right: 0,
    width: 370,
    background: "var(--card)",
    boxShadow: "0 22px 46px rgba(15, 23, 42, 0.18)",
    borderRadius: 18,
    border: "1px solid var(--border)",
    overflow: "hidden",
    zIndex: 1000,
    maxHeight: 430,
    overflowY: "auto",
  },
  mobileDropdown: {
    position: "fixed",
    top: 72,
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
    padding: "16px",
    borderBottom: "1px solid var(--border)",
    background: "var(--card)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  dropdownTitle: {
    margin: 0,
    fontSize: 15,
    color: "var(--heading)",
  },
  dropdownSub: {
    margin: "6px 0 0",
    fontSize: 12,
    color: "var(--text)",
    lineHeight: 1.45,
  },
  dropdownCount: {
    minWidth: 34,
    height: 34,
    borderRadius: 12,
    background: "#eff6ff",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 13,
  },
  emptyState: {
    padding: 22,
    margin: 0,
    fontSize: 13,
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
  },
  notificationTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: "var(--heading)",
  },
  notificationTag: {
    borderRadius: 999,
    padding: "5px 9px",
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  notificationMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 8,
  },
  notificationMeta: {
    fontSize: 12,
    color: "#2563eb",
    textTransform: "capitalize",
    fontWeight: 700,
  },
  notificationTime: {
    fontSize: 12,
    color: "var(--text)",
  },
  notificationNotes: {
    fontSize: 12,
    color: "var(--text)",
    marginTop: 9,
    lineHeight: 1.5,
  },
};
