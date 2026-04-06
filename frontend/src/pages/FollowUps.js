import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiArrowLeft, FiCalendar, FiClock, FiTrendingUp } from "react-icons/fi";
import { FaPhoneAlt } from "react-icons/fa";

export default function FollowUps() {
  const [today, setToday] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchFollowUps = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [todayRes, overdueRes, upcomingRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/followups/today`, { headers }),
        axios.get(`${BASE_URL}/api/followups/overdue`, { headers }),
        axios.get(`${BASE_URL}/api/followups/upcoming`, { headers }),
      ]);

      setToday(Array.isArray(todayRes.data) ? todayRes.data : []);
      setOverdue(Array.isArray(overdueRes.data) ? overdueRes.data : []);
      setUpcoming(Array.isArray(upcomingRes.data) ? upcomingRes.data : []);
    } catch (err) {
      console.log(err);
      toast.error("Failed to load follow-ups");
    }
  }, [BASE_URL, token]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  const totals = useMemo(
    () => ({
      today: today.length,
      overdue: overdue.length,
      upcoming: upcoming.length,
    }),
    [today.length, overdue.length, upcoming.length]
  );

  const getTypeConfig = (type) => {
    if (type === "overdue") {
      return { color: "#dc2626", label: "Overdue", icon: <FiClock /> };
    }
    if (type === "upcoming") {
      return { color: "#f59e0b", label: "Upcoming", icon: <FiTrendingUp /> };
    }
    return { color: "#2563eb", label: "Today", icon: <FiCalendar /> };
  };

  const renderCard = (item, type) => {
    const lead = item.leadId || {};
    const typeConfig = getTypeConfig(type);

    return (
      <div
        key={item._id}
        style={{
          ...styles.card,
          borderTop: `4px solid ${typeConfig.color}`,
        }}
        onClick={() => navigate(`/lead/${lead._id}`)}
      >
        <div style={styles.cardHeader}>
          <div style={{ minWidth: 0 }}>
            <div style={styles.name}>{lead.name || "Unknown Lead"}</div>
            <div style={styles.statusLine}>Status: {item.outcome || "Followup"}</div>
          </div>

          <button
            style={styles.callBtn}
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = `tel:${lead.phone}`;
            }}
          >
            <FaPhoneAlt />
          </button>
        </div>

        <div style={styles.compactRow}>
          <div>
            <div style={styles.label}>Created</div>
            <div style={styles.value}>
              {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("en-IN") : "-"}
            </div>
          </div>

          <div>
            <div style={styles.label}>Reminder</div>
            <div style={styles.value}>
              {item.nextFollowUpDate
                ? new Date(item.nextFollowUpDate).toLocaleString("en-IN")
                : "-"}
            </div>
          </div>
        </div>

        <div style={styles.note}>{item.notes || "No notes added"}</div>

        <div style={styles.footerRow}>
          <div style={styles.phone}>{lead.phone || "-"}</div>
          <div
            style={{
              ...styles.typeBadge,
              background: `${typeConfig.color}15`,
              color: typeConfig.color,
            }}
          >
            {typeConfig.label}
          </div>
        </div>
      </div>
    );
  };

  const renderSection = (title, list, type) => {
    const typeConfig = getTypeConfig(type);

    return (
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionTitleWrap}>
            <div style={{ ...styles.sectionIcon, color: typeConfig.color }}>
              {typeConfig.icon}
            </div>
            <div>
              <div style={styles.sectionTitle}>{title}</div>
              <div style={styles.sectionSub}>{list.length} items</div>
            </div>
          </div>
          <span style={styles.badge}>{list.length}</span>
        </div>

        <div style={styles.cardsGrid}>
          {list.length > 0 ? list.map((item) => renderCard(item, type)) : <div style={styles.empty}>No follow-ups</div>}
        </div>
      </div>
    );
  };

  return (
    <div style={{ ...styles.page, padding: isMobile ? 10 : 14 }}>
      <button onClick={() => navigate(-1)} style={styles.backBtn}>
        <FiArrowLeft /> Back
      </button>

      <div
        style={{
          ...styles.summaryRow,
          gap: isMobile ? 8 : 10,
        }}
      >
        <SummaryChip title="Today" value={totals.today} color="#2563eb" />
        <SummaryChip title="Overdue" value={totals.overdue} color="#dc2626" />
        <SummaryChip title="Upcoming" value={totals.upcoming} color="#f59e0b" />
      </div>

      {renderSection("Today's Follow-ups", today, "today")}
      {renderSection("Overdue Follow-ups", overdue, "overdue")}
      {renderSection("Upcoming Follow-ups", upcoming, "upcoming")}
    </div>
  );
}

function SummaryChip({ title, value, color }) {
  return (
    <div style={{ ...styles.summaryChip, borderColor: `${color}33` }}>
      <div style={{ ...styles.summaryValue, color }}>{value}</div>
      <div style={styles.summaryTitle}>{title}</div>
    </div>
  );
}

const styles = {
  page: {
    padding: "14px",
    background: "var(--bg)",
    minHeight: "100vh",
  },
  backBtn: {
    border: "none",
    background: "transparent",
    color: "#2563eb",
    cursor: "pointer",
    marginBottom: "12px",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontWeight: 700,
  },
  summaryRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
    marginBottom: 14,
  },
  summaryChip: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 10,
    textAlign: "center",
    boxShadow: "0 6px 14px rgba(15,23,42,0.04)",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 800,
  },
  summaryTitle: {
    fontSize: 11,
    color: "var(--text)",
    marginTop: 4,
    fontWeight: 600,
  },
  section: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 18,
    padding: 12,
    marginBottom: 14,
    boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sectionTitleWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontWeight: 800,
    fontSize: 13,
    color: "var(--heading)",
  },
  sectionSub: {
    fontSize: 11,
    color: "var(--text)",
    marginTop: 2,
  },
  badge: {
    background: "#e5e7eb",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    color: "#334155",
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 10,
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: 12,
    boxShadow: "0 6px 14px rgba(15,23,42,0.04)",
    border: "1px solid #eef2f7",
    cursor: "pointer",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
    wordBreak: "break-word",
  },
  statusLine: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
  },
  callBtn: {
    border: "none",
    background: "#fee2e2",
    color: "#dc2626",
    width: 34,
    height: 34,
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  compactRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 4,
  },
  value: {
    fontSize: 11,
    fontWeight: 600,
    color: "#0f172a",
    lineHeight: 1.4,
  },
  note: {
    fontSize: 11,
    color: "#475569",
    lineHeight: 1.5,
    minHeight: 36,
  },
  footerRow: {
    marginTop: 10,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  phone: {
    fontSize: 11,
    color: "#334155",
    fontWeight: 600,
  },
  typeBadge: {
    padding: "5px 9px",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 700,
  },
  empty: {
    padding: 10,
    fontSize: 12,
    color: "var(--text)",
    background: "#f8fafc",
    borderRadius: 12,
    border: "1px dashed var(--border)",
  },
};
