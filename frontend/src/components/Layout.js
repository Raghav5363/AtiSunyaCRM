import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  /* ===== SCREEN DETECT ===== */
  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#eef2f6",
      }}
    >
      {/* ===== SIDEBAR ===== */}
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* ===== MOBILE OVERLAY ===== */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            zIndex: 999,
          }}
        />
      )}

      {/* ===== RIGHT SIDE ===== */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          width: "100%",
          transition: "0.3s",
        }}
      >
        {/* ===== TOPBAR ===== */}
        <Topbar
          openSidebar={() => setSidebarOpen(true)}
          isMobile={isMobile}
        />

        {/* ===== MAIN CONTENT ===== */}
        <div
          style={{
            flex: 1,
            padding: isMobile ? "15px" : "25px 30px",
            background: "#f7f9fc",
            overflowY: "auto",
          }}
        >
          <div style={{ width: "100%" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
