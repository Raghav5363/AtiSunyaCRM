// frontend/src/components/Topbar.js
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function Topbar({ openSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(false);

  /* ===== SCREEN CHECK ===== */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ===== SAFE TOKEN DECODE ===== */
  let user = null;
  try {
    const token = localStorage.getItem("token");
    if (token) {
      user = JSON.parse(atob(token.split(".")[1]));
    }
  } catch (err) {
    console.log("Token decode failed");
  }

  /* ===== PAGE TITLES ===== */
  const pageTitles = {
    "/": "Leads Dashboard",
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

  /* ===== LOGOUT ===== */
  const handleLogout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  return (
    <div
      style={{
        height: 60,
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: isMobile ? "0 15px" : "0 30px",
        borderBottom: "1px solid #e5e7eb",
        boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
        position: "sticky",
        top: 0,
        zIndex: 500,
      }}
    >
      {/* ===== LEFT ===== */}
      <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
        
        {/* HAMBURGER */}
        {isMobile && (
          <button
            onClick={openSidebar}
            style={{
              fontSize: 22,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            ☰
          </button>
        )}

        {/* TITLE */}
        <div
          style={{
            fontSize: isMobile ? 16 : 20,
            fontWeight: 600,
            color: "#111827",
          }}
        >
          {getPageTitle()}
        </div>
      </div>

      {/* ===== RIGHT ===== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 10 : 18,
        }}
      >
        {/* ROLE BADGE */}
        {!isMobile && user?.role && (
          <div
            style={{
              fontSize: 12,
              color: "#374151",
              background: "#f3f4f6",
              padding: "6px 14px",
              borderRadius: 20,
              fontWeight: 500,
            }}
          >
            {user.role.replace("_", " ").toUpperCase()}
          </div>
        )}

        {/* LOGOUT */}
        {location.pathname !== "/login" && (
          <button
            onClick={handleLogout}
            style={{
              background: "#ef4444",
              color: "white",
              border: "none",
              padding: isMobile ? "6px 12px" : "8px 18px",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Logout
          </button>
        )}
      </div>
    </div>
  );
}


//Comment Added