// frontend/src/components/Topbar.js
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const user = token ? JSON.parse(atob(token.split(".")[1])) : null;

  const pageTitles = {
    "/": "Leads Dashboard",
    "/add": "Add Lead",
    "/followups": "Follow Ups",
    "/users": "User Management",
  };

  const getPageTitle = () => {
    if (location.pathname.startsWith("/edit")) return "Edit Lead";
    if (location.pathname.startsWith("/lead")) return "Lead Details";
    return pageTitles[location.pathname] || "Dashboard";
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  return (
    <div
      style={{
        height: 65,
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 30px",
        borderBottom: "1px solid #e5e7eb",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* PAGE TITLE */}
      <div
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: "#111827",
        }}
      >
        {getPageTitle()}
      </div>

      {/* RIGHT SECTION */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        {/* USER INFO */}
        <div
          style={{
            fontSize: 14,
            color: "#374151",
            background: "#f3f4f6",
            padding: "8px 14px",
            borderRadius: 20,
          }}
        >
          {user?.role?.replace("_", " ").toUpperCase()}
        </div>

        {/* LOGOUT BUTTON */}
        <button
          onClick={handleLogout}
          style={{
            background: "#ef4444",
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
