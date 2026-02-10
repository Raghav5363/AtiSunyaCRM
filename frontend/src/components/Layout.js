import React from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({ children }) {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#eef2f6", // soft CRM background
      }}
    >
      {/* SIDEBAR */}
      <Sidebar />

      {/* RIGHT SECTION */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* TOPBAR */}
        <Topbar />

        {/* MAIN CONTENT */}
        <div
          style={{
            flex: 1,
            padding: "30px 35px",
            background: "#f7f9fc",
            overflowY: "auto",
          }}
        >
          {/* CENTERED CONTENT LIKE REAL CRM */}
          <div
            style={{
              maxWidth: "1400px",
              margin: "0 auto",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
