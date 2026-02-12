import React, { useRef, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const SIDEBAR_WIDTH = 240;

const BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef();

  const [isMobile, setIsMobile] = useState(false);

  /* ===== SCREEN CHECK ===== */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ===== TOKEN SAFE ===== */
  const token = localStorage.getItem("token");

  let user = null;
  if (token) {
    try {
      user = JSON.parse(atob(token.split(".")[1]));
    } catch {
      console.error("Invalid token");
    }
  }

  /* ===== CSV UPLOAD ===== */
  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(
        `${BASE_URL}/api/leads/bulk-upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("CSV Uploaded Successfully");
      e.target.value = "";
      navigate("/leads");
    } catch {
      toast.error("Upload failed");
    }
  };

  /* ===== LOGOUT ===== */
  const logout = () => {
    localStorage.clear();
    toast.success("Logged out");
    navigate("/login");
  };

  /* ===== MENU ===== */
  const menu = [
    { name: "Dashboard", path: "/", icon: "📊" },
    { name: "Leads", path: "/leads", icon: "👥" },
    { name: "Follow Ups", path: "/followups", icon: "📅" },

    ...(user?.role === "admin" || user?.role === "sales_manager"
      ? [{ name: "Add Lead", path: "/add", icon: "➕" }]
      : []),

    ...(user?.role === "admin"
      ? [{ name: "Users", path: "/users", icon: "👤" }]
      : []),

    ...(user?.role !== "sales_agent"
      ? [{ name: "Reports", path: "/reports", icon: "📈" }]
      : []),
  ];

  const sidebarStyle = {
    width: SIDEBAR_WIDTH,
    background: "#ffffff",
    borderRight: "1px solid #e5e7eb",
    height: "100vh",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    position: isMobile ? "fixed" : "relative",
    top: 0,
    left: isMobile ? (isOpen ? 0 : -SIDEBAR_WIDTH) : 0,
    transition: "0.3s",
    zIndex: 1000,
  };

  return (
    <>
      {/* ===== OVERLAY ===== */}
      {isMobile && isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 999,
          }}
        />
      )}

      <div style={sidebarStyle}>
        <div>
          {/* ===== LOGO ===== */}
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <img
              src="/infratechLogo.png"
              alt="logo"
              style={{ width: 140 }}
            />
          </div>

          {/* ===== MENU ===== */}
          {menu.map((item) => {
            const active = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => isMobile && setIsOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 10,
                  marginBottom: 8,
                  textDecoration: "none",
                  background: active ? "#2563eb" : "transparent",
                  color: active ? "white" : "#374151",
                  fontWeight: 500,
                  transition: "0.2s",
                }}
              >
                <span>{item.icon}</span>
                {item.name}
              </Link>
            );
          })}

          {/* ===== CSV UPLOAD ===== */}
          {(user?.role === "admin" ||
            user?.role === "sales_manager") && (
            <div
              onClick={() => fileInputRef.current.click()}
              style={{
                padding: "12px 14px",
                cursor: "pointer",
                marginTop: 10,
                color: "#374151",
              }}
            >
              ⧉ Upload CSV
              <input
                hidden
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleCSVUpload}
              />
            </div>
          )}
        </div>

        {/* ===== FOOTER ===== */}
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          Logged in as <br />
          <b>{user?.role || "User"}</b>

          <div
            onClick={logout}
            style={{
              marginTop: 15,
              cursor: "pointer",
              color: "#ef4444",
              fontWeight: 600,
            }}
          >
            🚪 Logout
          </div>
        </div>
      </div>
    </>
  );
}


//Sidebar Updated