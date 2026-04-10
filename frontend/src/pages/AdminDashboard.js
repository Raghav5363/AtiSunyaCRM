import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FiShield, FiTrendingUp, FiUserCheck, FiUsers } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function AdminDashboard() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const authHeaders = useMemo(
    () => ({
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    }),
    [token]
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchUsers = useCallback(async () => {
    const res = await axios.get(`${BASE_URL}/api/users`, authHeaders);
    setUsers(Array.isArray(res.data) ? res.data : []);
  }, [authHeaders]);

  const fetchLeads = useCallback(async () => {
    const res = await axios.get(`${BASE_URL}/api/leads`, authHeaders);
    setLeads(Array.isArray(res.data) ? res.data : []);
  }, [authHeaders]);

  useEffect(() => {
    const load = async () => {
      if (role !== "admin") {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const results = await Promise.allSettled([fetchUsers(), fetchLeads()]);

      const failed = results.find((result) => result.status === "rejected");
      if (failed) {
        setError(
          failed.reason?.response?.data?.message ||
            failed.reason?.message ||
            "Failed to load admin dashboard"
        );
      }

      setLoading(false);
    };

    load();
  }, [fetchLeads, fetchUsers, role]);

  const summary = useMemo(
    () => ({
      users: users.length,
      admins: users.filter((user) => user.role === "admin").length,
      managers: users.filter((user) => user.role === "sales_manager").length,
      agents: users.filter((user) => user.role === "sales_agent").length,
    }),
    [users]
  );

  const team = useMemo(() => {
    const grouped = new Map();

    leads.forEach((lead) => {
      const assignedId = lead?.assignedTo?._id || "unassigned";
      const assignedEmail = lead?.assignedTo?.email || "Unassigned";

      if (!grouped.has(assignedId)) {
        grouped.set(assignedId, {
          user: {
            _id: assignedId,
            email: assignedEmail,
          },
          total: 0,
          converted: 0,
          followups: 0,
        });
      }

      const item = grouped.get(assignedId);
      item.total += 1;

      if (lead?.status === "closed") {
        item.converted += 1;
      }

      if (lead?.status === "followup") {
        item.followups += 1;
      }
    });

    return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  }, [leads]);

  const openAssigneeLeads = useCallback(
    (member, status = "") => {
      const assigneeId = member?.user?._id;
      const assigneeEmail = member?.user?.email || "Unassigned";
      const params = new URLSearchParams();

      if (assigneeId && assigneeId !== "unassigned") {
        params.set("assignedTo", assigneeId);
      }

      if (assigneeEmail) {
        params.set("assignee", assigneeEmail);
      }

      if (status) {
        params.set("status", status);
      }

      navigate(`/leads?${params.toString()}`);
    },
    [navigate]
  );

  if (role !== "admin") {
    return <div style={styles.empty}>Only admin can access this dashboard.</div>;
  }

  if (loading) {
    return <div style={styles.empty}>Loading admin dashboard...</div>;
  }

  return (
    <div style={{ ...styles.page, padding: isMobile ? "10px" : "14px" }}>
      <div style={{ ...styles.hero, padding: isMobile ? 14 : 18 }}>
        <div>
          <p style={styles.eyebrow}>Admin Dashboard</p>
          <h1 style={{ ...styles.title, fontSize: isMobile ? 20 : 24 }}>System overview</h1>
          <p style={styles.subtitle}>
            Manage users and monitor team pipeline performance from one place.
          </p>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div
        style={{
          ...styles.grid,
          gap: isMobile ? 10 : 12,
        }}
      >
        <SummaryCard title="Total Users" value={summary.users} icon={<FiUsers />} />
        <SummaryCard title="Admins" value={summary.admins} icon={<FiShield />} />
        <SummaryCard title="Managers" value={summary.managers} icon={<FiUserCheck />} />
        <SummaryCard title="Agents" value={summary.agents} icon={<FiTrendingUp />} />
      </div>

      <div style={{ ...styles.panel, padding: isMobile ? 14 : 16 }}>
        <h3 style={styles.panelTitle}>Team Performance</h3>
        {team.length === 0 ? (
          <div style={styles.emptyPanel}>No team data available.</div>
        ) : (
          team.map((member, index) => (
            <button
              key={`${member.user?._id || "unassigned"}-${index}`}
              type="button"
              style={styles.rowButton}
              onClick={() => openAssigneeLeads(member)}
            >
              <div style={styles.row}>
              <div>
                <div style={styles.name}>{member.user?.email || "Unassigned"}</div>
                <div style={styles.meta}>Click to open this user&apos;s leads</div>
              </div>
              <div style={styles.stats}>
                <button
                  type="button"
                  style={styles.metricButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    openAssigneeLeads(member);
                  }}
                >
                  {member.total || 0} leads
                </button>
                <button
                  type="button"
                  style={styles.metricButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    openAssigneeLeads(member, "followup");
                  }}
                >
                  {member.followups || 0} follow-ups
                </button>
                <button
                  type="button"
                  style={{ ...styles.metricButton, ...styles.metricButtonStrong }}
                  onClick={(event) => {
                    event.stopPropagation();
                    openAssigneeLeads(member, "closed");
                  }}
                >
                  {member.converted || 0} closed
                </button>
              </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardIcon}>{icon}</div>
      <div style={styles.cardValue}>{value || 0}</div>
      <div style={styles.cardTitle}>{title}</div>
    </div>
  );
}

const styles = {
  page: {
    padding: "14px",
    minHeight: "100vh",
  },
  hero: {
    background: "#ffffff",
    borderRadius: 18,
    padding: 18,
    border: "1px solid var(--border)",
    boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
    marginBottom: 14,
  },
  eyebrow: {
    margin: 0,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#2563eb",
  },
  title: {
    margin: "8px 0 6px",
    fontSize: 24,
    color: "var(--heading)",
  },
  subtitle: {
    margin: 0,
    color: "var(--text)",
    fontSize: 12,
    lineHeight: 1.5,
  },
  error: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 14,
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    fontSize: 13,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 14,
  },
  card: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 18,
    padding: 13,
    boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: 800,
    color: "var(--heading)",
  },
  cardTitle: {
    marginTop: 4,
    fontSize: 11,
    color: "var(--text)",
    fontWeight: 600,
  },
  panel: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
  },
  panelTitle: {
    margin: "0 0 8px",
    color: "var(--heading)",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "14px 0",
    borderBottom: "1px solid var(--border)",
    flexWrap: "wrap",
  },
  rowButton: {
    width: "100%",
    border: "none",
    background: "transparent",
    padding: 0,
    textAlign: "left",
    cursor: "pointer",
  },
  name: {
    fontWeight: 700,
    color: "var(--heading)",
    fontSize: 13,
  },
  meta: {
    color: "var(--text)",
    fontSize: 11,
    marginTop: 4,
  },
  stats: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    fontSize: 11,
    color: "var(--text)",
  },
  metricButton: {
    border: "1px solid #dbe2ea",
    background: "#ffffff",
    color: "#334155",
    borderRadius: 999,
    padding: "7px 11px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  },
  metricButtonStrong: {
    color: "#0f172a",
  },
  empty: {
    padding: 20,
    color: "var(--text)",
  },
  emptyPanel: {
    padding: 12,
    color: "var(--text)",
  },
};
