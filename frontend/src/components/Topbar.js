import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";

export default function Topbar({ openSidebar }) {

  const location = useLocation();
  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true"
  );

  // ✅ NOTIFICATION STATE
  const [notifications, setNotifications] = useState({
    count: 0,
    data: []
  });

  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef();

  const BASE_URL = "http://localhost:5000";

  /* ================= SCREEN CHECK ================= */
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ================= DARK MODE ================= */
  useEffect(() => {
    if (darkMode) document.body.classList.add("dark");
    else document.body.classList.remove("dark");

    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  /* ================= FETCH NOTIFICATIONS ================= */
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get(
        `${BASE_URL}/api/leads/notifications`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setNotifications({
        count: res.data?.count || 0,
        data: Array.isArray(res.data?.data) ? res.data.data : []
      });

    } catch (err) {
      console.log("❌ Notification fetch error");
      setNotifications({ count: 0, data: [] });
    }
  };

  /* ================= INITIAL LOAD + POLLING ================= */
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(fetchNotifications, 10000); // fallback

    return () => clearInterval(interval);
  }, []);

  /* ================= SOCKET.IO REALTIME ================= */
  useEffect(() => {
    const socket = io(BASE_URL);

    socket.on("connect", () => {
      console.log("🟢 Connected to socket");
    });

    socket.on("new_notification", (data) => {

      console.log("🔔 New Notification:", data);

      // 🔊 SOUND
      try {
        const audio = new Audio("/notification.mp3");
        audio.play().catch(() => {});
      } catch {}

      // ⚡ UPDATE UI
      setNotifications(prev => ({
        count: prev.count + 1,
        data: [data, ...prev.data]
      }));
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected");
    });

    return () => socket.disconnect();
  }, []);

  /* ================= CLICK OUTSIDE CLOSE ================= */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ================= MARK AS READ ================= */
  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem("token");

      // Optimistic UI
      setNotifications(prev => ({
        count: Math.max(prev.count - 1, 0),
        data: prev.data.filter(n => n._id !== id)
      }));

      await axios.put(
        `${BASE_URL}/api/leads/notifications/${id}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

    } catch (err) {
      console.log("❌ Mark read error");
      fetchNotifications();
    }
  };

  /* ================= TOKEN DECODE ================= */
  let user = null;

  try {
    const token = localStorage.getItem("token");
    if (token) {
      user = JSON.parse(atob(token.split(".")[1]));
    }
  } catch {}

  /* ================= PAGE TITLE ================= */
  const pageTitles = {
    "/dashboard": "Dashboard",
    "/leads": "Leads",
    "/add": "Add Lead",
    "/followups": "Follow Ups",
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
    navigate("/login", { replace: true });
  };

  return (
    <div style={{
      height: 60,
      background: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 15px",
      borderBottom: "1px solid #eee",
      position: "relative"
    }}>

      {/* LEFT */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {isMobile && (
          <button onClick={openSidebar}>☰</button>
        )}
        <h3 style={{ fontSize: isMobile ? 16 : 18 }}>
          {getPageTitle()}
        </h3>
      </div>

      {/* RIGHT */}
      <div style={{ display: "flex", gap: 15, alignItems: "center" }}>

        {/* 🔔 NOTIFICATIONS */}
        <div style={{ position: "relative" }} ref={notifRef}>

          <button
            onClick={() => setShowNotif(!showNotif)}
            style={{
              fontSize: 20,
              cursor: "pointer",
              border: "none",
              background: "none"
            }}
          >
            🔔
          </button>

          {/* BADGE */}
          {notifications.count > 0 && (
            <span style={{
              position: "absolute",
              top: -5,
              right: -5,
              background: "red",
              color: "#fff",
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: "50%"
            }}>
              {notifications.count}
            </span>
          )}

          {/* DROPDOWN */}
          {showNotif && (
            <div style={{
              position: "absolute",
              top: 45,
              right: isMobile ? "50%" : 0,
              transform: isMobile ? "translateX(50%)" : "none",
              width: isMobile ? 260 : 320,
              background: "#fff",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              borderRadius: 10,
              padding: 12,
              zIndex: 1000,
              maxHeight: 350,
              overflowY: "auto"
            }}>
              <h4 style={{ marginBottom: 10 }}>Notifications</h4>

              {notifications.data.length === 0 ? (
                <p style={{ fontSize: 13, textAlign: "center" }}>
                  No notifications
                </p>
              ) : (
                notifications.data.map(n => (
                  <div
                    key={n._id}
                    onClick={() => markAsRead(n._id)}
                    style={{
                      padding: 10,
                      borderBottom: "1px solid #eee",
                      cursor: "pointer",
                      borderRadius: 6
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f5f5f5")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <strong>{n.name}</strong>
                    <div style={{ fontSize: 12, color: "#555" }}>
                      {n.purpose}
                    </div>
                    <small style={{ color: "gray" }}>
                      {n.reminderDate
                        ? new Date(n.reminderDate).toLocaleString()
                        : ""}
                    </small>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* DARK MODE */}
        <button onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? "☀️" : "🌙"}
        </button>

        {/* ROLE */}
        {!isMobile && user?.role && (
          <span style={{ fontSize: 13 }}>{user.role}</span>
        )}

        {/* LOGOUT */}
        <button onClick={handleLogout}>
          Logout
        </button>

      </div>
    </div>
  );
}