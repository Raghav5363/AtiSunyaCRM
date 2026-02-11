import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function FollowUps() {
  const [today, setToday] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  // ✅ Production + Local Safe Base URL
  const BASE_URL =
    process.env.REACT_APP_API_URL || "http://localhost:5000";

  /* ================= FETCH FOLLOWUPS ================= */
  const fetchFollowUps = useCallback(async () => {
    try {
      if (!token) {
        toast.error("Unauthorized. Please login again.");
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const todayRes = await axios.get(
        `${BASE_URL}/api/followups/today`,
        { headers }
      );

      const overdueRes = await axios.get(
        `${BASE_URL}/api/followups/overdue`,
        { headers }
      );

      setToday(todayRes.data);
      setOverdue(overdueRes.data);
    } catch (err) {
      console.log(err);
      toast.error("Failed to load follow-ups");
    }
  }, [BASE_URL, token]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  /* ================= RENDER LIST ================= */
  const renderList = (list, isOverdue = false) =>
    list.length > 0 ? (
      list.map((item) => (
        <div
          key={item._id}
          onClick={() => navigate(`/lead/${item.leadId?._id}`)}
          style={{
            ...styles.card,
            borderLeft: isOverdue
              ? "4px solid #dc2626"
              : "4px solid #0d6efd",
          }}
        >
          <div style={styles.name}>
            {item.leadId?.name || "Unknown"}
          </div>

          <div style={styles.phone}>
            📞 {item.leadId?.phone || "-"}
          </div>

          <div style={styles.date}>
            📅{" "}
            {item.nextFollowUpDate
              ? new Date(
                  item.nextFollowUpDate
                ).toLocaleDateString()
              : "-"}
          </div>
        </div>
      ))
    ) : (
      <div style={styles.empty}>No follow-ups</div>
    );

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        {/* TODAY */}
        <div style={styles.section}>
          <div style={styles.todayHeader}>
            <span>Today's Follow-ups</span>
            <span style={styles.countBadge}>
              {today.length}
            </span>
          </div>

          {renderList(today)}
        </div>

        {/* OVERDUE */}
        <div style={styles.section}>
          <div style={styles.overdueHeader}>
            <span>Overdue Follow-ups</span>
            <span style={styles.countBadge}>
              {overdue.length}
            </span>
          </div>

          {renderList(overdue, true)}
        </div>
      </div>
    </div>
  );
}

/* =========================
   CSS STYLES
========================= */

const styles = {
  wrapper: {
    padding: "30px",
    background: "#f4f6f9",
    minHeight: "100vh",
  },

  container: {
    maxWidth: "900px",
    margin: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "40px",
  },

  section: {
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
  },

  todayHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "18px",
    fontSize: "18px",
    fontWeight: 600,
    color: "#0f172a",
  },

  overdueHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "18px",
    fontSize: "18px",
    fontWeight: 600,
    color: "#7f1d1d",
  },

  countBadge: {
    background: "#e2e8f0",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "13px",
  },

  card: {
    padding: "14px 16px",
    borderRadius: "10px",
    background: "#fafafa",
    marginBottom: "12px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },

  name: {
    fontWeight: 600,
    fontSize: "15px",
    color: "#111827",
  },

  phone: {
    fontSize: "14px",
    color: "#4b5563",
    marginTop: "4px",
  },

  date: {
    fontSize: "13px",
    color: "#6b7280",
    marginTop: "6px",
  },

  empty: {
    padding: "12px",
    color: "#6b7280",
  },
};
