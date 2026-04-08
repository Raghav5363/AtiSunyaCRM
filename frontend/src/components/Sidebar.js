import React, { useMemo, useRef, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import {
  FiChevronRight,
  FiBarChart2,
  FiFilePlus,
  FiFolderPlus,
  FiLogOut,
  FiPieChart,
  FiUpload,
  FiUser,
  FiUsers,
} from "react-icons/fi";

const SIDEBAR_WIDTH = 268;
const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

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

export default function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true"
  );

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const syncTheme = () => {
      setDarkMode(localStorage.getItem("darkMode") === "true");
    };

    syncTheme();
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  const token = localStorage.getItem("token");
  const user = decodeJwtPayload(token);

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(`${BASE_URL}/api/leads/bulk-upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success("CSV uploaded successfully");
      e.target.value = "";
      navigate("/leads", { replace: true });
      window.location.reload();
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    }
  };

  const logout = () => {
    localStorage.clear();
    toast.success("Logged out");
    navigate("/login");
  };

  const menu = useMemo(
    () => [
      { name: "Dashboard", path: "/dashboard", icon: <FiBarChart2 /> },
      { name: "Leads", path: "/leads", icon: <FiUsers /> },
      { name: "Follow Ups", path: "/followups", icon: <FiFolderPlus /> },
      ...(user?.role === "admin" || user?.role === "sales_manager"
        ? [{ name: "Add Lead", path: "/add", icon: <FiFilePlus /> }]
        : []),
      ...(user?.role === "admin"
        ? [{ name: "Users", path: "/users", icon: <FiUser /> }]
        : []),
      ...(user?.role !== "sales_agent"
        ? [{ name: "Reports", path: "/reports", icon: <FiPieChart /> }]
        : []),
    ],
    [user?.role]
  );

  const sidebarStyle = {
    width: SIDEBAR_WIDTH,
    background: darkMode
      ? "linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(17,24,39,0.98) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,251,255,0.98) 100%)",
    borderRight: "1px solid var(--border)",
    height: "100vh",
    padding: isMobile ? 16 : 18,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    position: isMobile ? "fixed" : "relative",
    top: 0,
    left: isMobile ? (isOpen ? 0 : -SIDEBAR_WIDTH) : 0,
    transition: "0.28s ease",
    zIndex: 1000,
    boxShadow: isMobile ? "0 24px 60px rgba(15, 23, 42, 0.2)" : "none",
    backdropFilter: "blur(18px)",
  };

  return (
    <>
      {isMobile && isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.38)",
            zIndex: 999,
          }}
        />
      )}

      <div style={sidebarStyle}>
        <div>
          <div style={styles.brandCard}>
            <img src="/InfratechLogo.png" alt="logo" style={styles.logo} />
          </div>

          {menu.map((item) => {
            const active = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => isMobile && setIsOpen(false)}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = darkMode ? "#172554" : "#eff6ff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
                style={{
                  ...styles.link,
                  background: active ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "transparent",
                  color: active ? "#fff" : darkMode ? "#e2e8f0" : "#334155",
                  boxShadow: active ? "0 12px 24px rgba(37,99,235,0.2)" : "none",
                }}
              >
                <span style={styles.linkIcon}>{item.icon}</span>
                {item.name}
              </Link>
            );
          })}

          {(user?.role === "admin" || user?.role === "sales_manager") && (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={styles.uploadButton}
              type="button"
            >
              <FiUpload />
              Upload CSV
              <input
                hidden
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleCSVUpload}
              />
            </button>
          )}

          {user?.role === "admin" && (
            <button
              onClick={() => {
                navigate("/admin-dashboard");
                if (isMobile) setIsOpen(false);
              }}
              style={styles.adminButton}
              type="button"
            >
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FiUser />
                Admin Dashboard
              </span>
              <FiChevronRight />
            </button>
          )}
        </div>

        <div style={styles.footer}>
          <div style={styles.userCard}>
            <div style={styles.userAvatar}>{(user?.role || "U").slice(0, 1).toUpperCase()}</div>
            <div>
              <div style={styles.userRole}>{(user?.role || "User").replace(/_/g, " ")}</div>
              <div style={styles.userHint}>Logged in</div>
            </div>
          </div>

          <button onClick={logout} style={styles.logoutButton} type="button">
            <FiLogOut />
            Logout
          </button>
        </div>
      </div>
    </>
  );
}

const styles = {
  brandCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 4px 14px",
    marginBottom: 12,
    minHeight: 100,
    background: "radial-gradient(circle at center, rgba(59,130,246,0.14), transparent 68%)",
  },
  logo: {
    width: 168,
    height: 94,
    objectFit: "contain",
    background: "transparent",
    filter: "drop-shadow(0 10px 18px rgba(15,23,42,0.14))",
  },
  link: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 13px",
    borderRadius: 14,
    marginBottom: 8,
    textDecoration: "none",
    fontWeight: 600,
    transition: "0.2s ease",
    fontSize: 13,
  },
  linkIcon: {
    width: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 17,
  },
  uploadButton: {
    width: "100%",
    marginTop: 14,
    padding: "12px 13px",
    borderRadius: 14,
    border: "1px dashed #93c5fd",
    background: "#eff6ff",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  },
  adminButton: {
    width: "100%",
    marginTop: 12,
    padding: "12px 13px",
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--heading)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
  footer: {
    borderTop: "1px solid var(--border)",
    paddingTop: 14,
  },
  userCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    background: "linear-gradient(135deg, #1d4ed8, #38bdf8)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
  },
  userRole: {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--heading)",
    textTransform: "capitalize",
  },
  userHint: {
    fontSize: 11,
    color: "var(--text)",
    marginTop: 2,
  },
  logoutButton: {
    width: "100%",
    border: "none",
    borderRadius: 14,
    background: "#fff1f2",
    color: "#e11d48",
    padding: "11px 13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
};
