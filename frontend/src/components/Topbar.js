// frontend/src/components/Topbar.js
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const pageTitles = {
    "/": "Leads",
    "/add": "Add Lead",
    "/sitemap": "Sitemap",
  };

  const getPageTitle = () => {
    if (location.pathname.startsWith("/edit")) return "Edit Lead";
    return pageTitles[location.pathname] || "CRM";
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  return (
    <div
      style={{
        height: 60,
        background: "linear-gradient(180deg, #0f1b2d, #092030)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        fontSize: 20,
        fontWeight: 600,
        color: "white",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        borderLeft: "2px solid rgba(255,255,255,0.08)",
      }}
    >
      <div>{getPageTitle()}</div>

      <div
        style={{
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 500,
          opacity: 0.85,
        }}
        onClick={handleLogout}
        title="Logout"
      >
        Logout
      </div>
    </div>
  );
}