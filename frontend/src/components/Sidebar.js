import React, { useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

export default function Sidebar() {
  const location = useLocation();
  const fileInputRef = useRef();

  const token = localStorage.getItem("token");
  const user = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const isSalesAgent = user?.role === "sales_agent";

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(
        "http://localhost:5000/api/leads/bulk-upload",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      toast.success("CSV uploaded successfully ✔");
      window.location.reload();
    } catch (err) {
      toast.error("CSV upload failed");
    } finally {
      e.target.value = "";
    }
  };

  const menu = [
    { name: "Leads", path: "/", icon: "👥" },

    // ✅ NEW: Follow Ups (ONLY ADDITION)
    { name: "Follow Ups", path: "/followups", icon: "📅" },

    ...(!isSalesAgent ? [{ name: "Add Lead", path: "/add", icon: "➕" }] : []),
  ];

  return (
    <div
      style={{
        width: "240px",
        background: "linear-gradient(180deg, #0f1b2d, #092030)",
        color: "white",
        minHeight: "100vh",
        padding: "20px 10px",
      }}
    >
      <h2 style={{ color: "white", paddingLeft: 10, marginBottom: 30 }}>
        ATISUNYA CRM
      </h2>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {menu.map((item) => (
          <li
            key={item.path}
            style={{
              marginBottom: 8,
              background:
                location.pathname === item.path
                  ? "rgba(255,255,255,0.15)"
                  : "",
              borderRadius: 6,
            }}
          >
            <Link
              to={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 14px",
                color: "white",
                textDecoration: "none",
                fontSize: 15,
                gap: 12,
              }}
            >
              <span>{item.icon}</span>
              {item.name}
            </Link>
          </li>
        ))}

        {(user?.role === "admin" || user?.role === "sales_manager") && (
          <li
            style={{
              marginTop: 8,
              borderRadius: 6,
              cursor: "pointer",
            }}
            onClick={() => fileInputRef.current.click()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 14px",
                gap: 12,
                color: "white",
              }}
            >
              <span style={{ color: "#1e40af", fontSize: 18 }}>⧉</span>
              Upload CSV
            </div>

            <input
              type="file"
              accept=".csv"
              hidden
              ref={fileInputRef}
              onChange={handleCSVUpload}
            />
          </li>
        )}
      </ul>
    </div>
  );
}