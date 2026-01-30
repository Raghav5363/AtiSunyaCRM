import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function FollowUps() {
  const [today, setToday] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const fetchFollowUps = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const todayRes = await axios.get(
        "http://localhost:5000/api/followups/today",
        { headers }
      );

      const overdueRes = await axios.get(
        "http://localhost:5000/api/followups/overdue",
        { headers }
      );

      setToday(todayRes.data);
      setOverdue(overdueRes.data);
    } catch (err) {
      toast.error("Failed to load follow-ups");
    }
  };

  const renderList = (list, isOverdue = false) =>
    list.length > 0 ? (
      list.map((item) => (
        <div
          key={item._id}
          onClick={() => navigate(`/lead/${item.leadId._id}`)}
          style={{
            padding: "14px 12px",
            borderBottom: "1px solid #e5e7eb",
            cursor: "pointer",
            transition: "background 0.2s",
            borderLeft: isOverdue ? "4px solid #dc2626" : "4px solid transparent"
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "#f9fafb")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <div style={{ fontWeight: 600, color: "#111827" }}>
            {item.leadId?.name}
          </div>
          <div style={{ color: "#4b5563", marginTop: 2 }}>
            {item.leadId?.phone}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
            Follow-up:{" "}
            {new Date(item.nextFollowUpDate).toLocaleDateString()}
          </div>
        </div>
      ))
    ) : (
      <div style={{ padding: 14, color: "#6b7280" }}>
        No follow-ups
      </div>
    );

  const headerBaseStyle = {
    position: "sticky",
    top: 0,
    zIndex: 5,
    padding: "12px 16px",
    borderRadius: 8,
    fontWeight: 600,
    letterSpacing: "0.3px",
    marginBottom: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  };

  return (
    <div
      style={{
        background: "white",
        padding: 22,
        borderRadius: 12,
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)"
      }}
    >
      {/* TODAY */}
      <div
        style={{
          ...headerBaseStyle,
          background: "linear-gradient(180deg, #0f1b2d, #092030)",
          color: "white"
        }}
      >
        <span>Today's Follow-ups</span>
        <span
          style={{
            background: "rgba(255,255,255,0.15)",
            padding: "4px 10px",
            borderRadius: 20,
            fontSize: 13
          }}
        >
          {today.length}
        </span>
      </div>

      {renderList(today)}

      <div style={{ height: 32 }} />

      {/* OVERDUE */}
      <div
        style={{
          ...headerBaseStyle,
          background: "#7f1d1d",
          color: "white"
        }}
      >
        <span>Overdue Follow-ups</span>
        <span
          style={{
            background: "rgba(255,255,255,0.2)",
            padding: "4px 10px",
            borderRadius: 20,
            fontSize: 13
          }}
        >
          {overdue.length}
        </span>
      </div>

      {renderList(overdue, true)}
    </div>
  );
}