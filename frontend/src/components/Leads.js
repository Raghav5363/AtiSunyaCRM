import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate, useLocation } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

export default function Leads() {

  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const navigate = useNavigate();
  const location = useLocation();

  const token = localStorage.getItem("token") || "";

  const BASE_URL =
    process.env.REACT_APP_API_URL || "http://localhost:5000";

  const API = `${BASE_URL}/api/leads`;

  /* ================= FILTER FROM URL ================= */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("status");
    setFilterStatus(status || "all");
  }, [location.search]);

  /* ================= FETCH ================= */
  const fetchLeads = useCallback(async () => {
    try {
      let url = API;

      if (filterStatus !== "all") {
        url += `?status=${filterStatus}`;
      }

      const res = await axios.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
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

  /* ================= FILTER + SEARCH + SORT ================= */
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

  /* ================= STATUS COLOR ================= */
  const getStatusColor = (status) => {
    switch (status) {
      case "new": return "#2563eb";
      case "followup": return "#f59e0b";
      case "closed": return "#10b981";
      case "junk": return "#6b7280";
      case "not_interested": return "#ef4444";
      case "site_visit_planned": return "#7c3aed";
      case "site_visit_done": return "#06b6d4";
      default: return "#64748b";
    }
  };

  const filters = [
    "all",
    "new",
    "followup",
    "site_visit_planned",
    "site_visit_done",
    "not_interested",
    "junk",
    "closed"
  ];

  return (
    <div style={styles.page}>

      {/* BACK */}
      <button onClick={() => navigate(-1)} style={styles.backBtn}>
        <FiArrowLeft /> Back
      </button>

      {/* SEARCH */}
      <input
        placeholder="Search leads..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.search}
      />

      {/* FILTERS */}
      <div style={styles.filterWrap}>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilterStatus(f);
              navigate(`/leads${f === "all" ? "" : `?status=${f}`}`);
            }}
            style={{
              ...styles.filterBtn,
              background: filterStatus === f ? "#2563eb" : "#fff",
              color: filterStatus === f ? "#fff" : "#333"
            }}
          >
            {f.replaceAll("_", " ")}
          </button>
        ))}
      </div>

      {/* LEADS LIST */}
      <div style={styles.grid}>

        {filteredLeads.length === 0 ? (
          <p>No leads found</p>
        ) : (
          filteredLeads.map((lead) => (

            <div
              key={lead._id}
              style={styles.card}
              onClick={() => navigate(`/lead/${lead._id}`)}
            >

              {/* HEADER */}
              <div style={styles.headerRow}>

                <div style={styles.name}>
                  {lead?.name || "No Name"}
                </div>

                <a
                  href={`tel:${lead?.phone || ""}`}
                  style={styles.callBtn}
                  onClick={(e) => e.stopPropagation()}
                >
                  📞
                </a>

              </div>

              {/* DATES */}
              <div style={styles.row}>
                <div>
                  <div style={styles.label}>Created Date</div>
                  <div style={styles.value}>
                    {lead?.createdAt
                      ? new Date(lead.createdAt).toLocaleString()
                      : "-"}
                  </div>
                </div>

                <div>
                  <div style={styles.label}>Reminder Date</div>
                  <div style={styles.value}>
                    {lead?.reminderDate
                      ? new Date(lead.reminderDate).toLocaleString()
                      : "-"}
                  </div>
                </div>
              </div>

              {/* STATUS + PURPOSE */}
              <div style={styles.row}>
                <div>
                  <div style={styles.label}>Status</div>
                  <div style={{
                    ...styles.statusText,
                    color: getStatusColor(lead?.status)
                  }}>
                    {lead?.status?.replaceAll("_", " ") || "-"}
                  </div>
                </div>

                <div>
                  <div style={styles.label}>Purpose</div>
                  <div style={styles.value}>
                    {lead?.purpose || "Followup"}
                  </div>
                </div>
              </div>

              {/* NOTES */}
              <div style={styles.notes}>
                {lead?.notes || "No notes"}
              </div>

            </div>

          ))
        )}

      </div>

    </div>
  );
}

/* ================= STYLES ================= */

const styles = {

  page: {
    padding: "16px",
    background: "#f5f7fb",
    minHeight: "100vh"
  },

  backBtn: {
    border: "none",
    background: "transparent",
    color: "#2563eb",
    cursor: "pointer",
    marginBottom: "10px"
  },

  search: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    marginBottom: "15px"
  },

  filterWrap: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "15px"
  },

  filterBtn: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    cursor: "pointer",
    fontSize: "13px"
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "15px"
  },

  card: {
    background: "#fff",
    padding: "16px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
    cursor: "pointer"
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px"
  },

  name: {
    fontWeight: "600",
    fontSize: "16px"
  },

  callBtn: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "#fee2e2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none"
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px",
    gap: "10px"
  },

  label: {
    fontSize: "12px",
    color: "#777"
  },

  value: {
    fontSize: "13px",
    fontWeight: "500"
  },

  statusText: {
    fontSize: "14px",
    fontWeight: "600"
  },

  notes: {
    fontSize: "12px",
    color: "#555",
    marginTop: "5px"
  }

};