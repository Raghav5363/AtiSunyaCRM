import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate, useLocation } from "react-router-dom";
import { FiArrowLeft, FiPhone } from "react-icons/fi";

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const navigate = useNavigate();
  const location = useLocation();

  const token = localStorage.getItem("token") || "";
  const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const API = `${BASE_URL}/api/leads`;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("status");
    setFilterStatus(status || "all");
  }, [location.search]);

  const fetchLeads = useCallback(async () => {
    try {
      let url = API;
      if (filterStatus !== "all") {
        url += `?status=${filterStatus}`;
      }

      const res = await axios.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      setLeads(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load leads");
    }
  }, [API, token, filterStatus]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filteredLeads = leads
    .filter((lead) => {
      if (filterStatus !== "all" && lead?.status !== filterStatus) {
        return false;
      }

      const s = search.toLowerCase();
      return (
        (lead?.name || "").toLowerCase().includes(s) ||
        (lead?.email || "").toLowerCase().includes(s) ||
        (lead?.phone || "").includes(s)
      );
    })
    .sort((a, b) => new Date(b?.createdAt) - new Date(a?.createdAt));

  const filters = [
    "all",
    "new",
    "followup",
    "site_visit_planned",
    "site_visit_done",
    "not_interested",
    "junk",
    "closed",
  ];

  return (
    <div style={styles.page}>
      <button onClick={() => navigate(-1)} style={styles.backBtn}>
        <FiArrowLeft /> Back
      </button>

      <input
        placeholder="Search leads..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.search}
      />

      <div style={styles.filterWrap}>
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => {
              setFilterStatus(filter);
              navigate(`/leads${filter === "all" ? "" : `?status=${filter}`}`);
            }}
            style={{
              ...styles.filterBtn,
              background: filterStatus === filter ? "#2563eb" : "var(--card)",
              color: filterStatus === filter ? "#fff" : "var(--text)",
              borderColor: filterStatus === filter ? "#2563eb" : "var(--border)",
            }}
          >
            {filter.replaceAll("_", " ")}
          </button>
        ))}
      </div>

      <div style={styles.grid}>
        {filteredLeads.length === 0 ? (
          <p style={styles.empty}>No leads found</p>
        ) : (
          filteredLeads.map((lead) => (
            <div
              key={lead._id}
              style={styles.card}
              onClick={() => navigate(`/lead/${lead._id}`)}
            >
              <div style={styles.headerRow}>
                <div style={styles.name}>{lead?.name || "No Name"}</div>

                <a
                  href={`tel:${lead?.phone || ""}`}
                  style={styles.callBtn}
                  onClick={(e) => e.stopPropagation()}
                >
                  <FiPhone />
                </a>
              </div>

              <div style={styles.compactRow}>
                <div>
                  <div style={styles.label}>Status</div>
                  <div style={styles.value}>{lead?.status?.replaceAll("_", " ") || "-"}</div>
                </div>

                <div>
                  <div style={styles.label}>Purpose</div>
                  <div style={styles.value}>{lead?.purpose || "Followup"}</div>
                </div>
              </div>

              <div style={styles.compactRow}>
                <div>
                  <div style={styles.label}>Created</div>
                  <div style={styles.value}>
                    {lead?.createdAt ? new Date(lead.createdAt).toLocaleDateString("en-IN") : "-"}
                  </div>
                </div>

                <div>
                  <div style={styles.label}>Reminder</div>
                  <div style={styles.value}>
                    {lead?.reminderDate || lead?.nextFollowUpDate
                      ? new Date(lead.reminderDate || lead.nextFollowUpDate).toLocaleDateString("en-IN")
                      : "-"}
                  </div>
                </div>
              </div>

              <div style={styles.notes}>{lead?.notes || "No notes"}</div>
            </div>
          ))
        )}
      </div>
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
    marginBottom: "10px",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontWeight: 700,
  },
  search: {
    width: "100%",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    marginBottom: "12px",
    background: "var(--card)",
    color: "var(--text)",
  },
  filterWrap: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "14px",
  },
  filterBtn: {
    padding: "8px 12px",
    borderRadius: "999px",
    border: "1px solid var(--border)",
    cursor: "pointer",
    fontSize: "12px",
    textTransform: "capitalize",
    fontWeight: 700,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "12px",
  },
  card: {
    background: "var(--card)",
    padding: "14px",
    borderRadius: "18px",
    boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
    cursor: "pointer",
    border: "1px solid var(--border)",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "10px",
    gap: 10,
  },
  name: {
    fontWeight: "700",
    fontSize: "16px",
    color: "var(--heading)",
  },
  callBtn: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "#fee2e2",
    color: "#dc2626",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    flexShrink: 0,
  },
  compactRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginBottom: "10px",
  },
  label: {
    fontSize: "11px",
    color: "var(--text)",
    marginBottom: 4,
  },
  value: {
    fontSize: "12px",
    fontWeight: "600",
    color: "var(--heading)",
    textTransform: "capitalize",
  },
  notes: {
    fontSize: "12px",
    color: "var(--text)",
    marginTop: "4px",
    lineHeight: 1.5,
  },
  empty: {
    color: "var(--text)",
  },
};
