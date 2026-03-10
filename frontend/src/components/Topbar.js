// frontend/src/components/Topbar.js

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function Topbar({ openSidebar }) {

  const location = useLocation();
  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true"
  );

  /* ===== SCREEN CHECK ===== */
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ===== APPLY DARK MODE ===== */
  useEffect(() => {

    if (darkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }

    localStorage.setItem("darkMode", darkMode);

  }, [darkMode]);

  /* ===== TOKEN SAFE DECODE ===== */
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
        background: "var(--topbar-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: isMobile ? "0 15px" : "0 30px",
        borderBottom: "1px solid #e5e7eb",
        position: "sticky",
        top: 0,
        zIndex: 500,
      }}
    >

      {/* LEFT SECTION */}

      <div style={{ display: "flex", alignItems: "center", gap: 15 }}>

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

        <div
          style={{
            fontSize: isMobile ? 16 : 20,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {getPageTitle()}
        </div>

      </div>

      {/* RIGHT SECTION */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 10 : 18,
        }}
      >

        {/* DARK MODE TOGGLE */}

        <button
          onClick={() => setDarkMode(!darkMode)}
          style={{
            fontSize: 18,
            border: "none",
            background: "none",
            cursor: "pointer",
          }}
        >
          {darkMode ? "☀️" : "🌙"}
        </button>


        {/* ROLE BADGE */}

        {!isMobile && user?.role && (

          <div
            style={{
              fontSize: 12,
              color: "var(--text-primary)",
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