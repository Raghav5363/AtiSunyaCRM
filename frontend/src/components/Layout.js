import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();

  /* ===== SCREEN DETECT ===== */
  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100dvh",
        background:
          "radial-gradient(circle at top left, rgba(59,130,246,0.08), transparent 18%), #eef2f6",
        overflow: "clip",
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
          minWidth: 0,
          minHeight: "100dvh",
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
            padding: isMobile ? "6px 8px 2px" : "20px 22px",
            background: "var(--bg)",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            transition: "background 0.2s ease",
            scrollPaddingTop: isMobile ? "70px" : "80px",
            minHeight: 0,
          }}
        >
          <div style={{ width: "100%", maxWidth: "100%" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
