import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import DeletePopup from "./DeletePopup";
import { useNavigate } from "react-router-dom";

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const BASE_URL =
    process.env.REACT_APP_API_URL || "http://localhost:5000";

  const API = `${BASE_URL}/api/leads`;

  let user = null;
  try {
    user = token ? JSON.parse(atob(token.split(".")[1])) : null;
  } catch {
    user = null;
  }

  const role = user?.role;
  const isAdmin = role === "admin";
  const isManager = role === "sales_manager";

  const canEdit = isAdmin || isManager;
  const canDelete = isAdmin;

  /* ================= FETCH LEADS ================= */
  const fetchLeads = useCallback(async () => {
    try {
      if (!token) {
        toast.error("Unauthorized. Please login again.");
        return;
      }

      const res = await axios.get(API, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setLeads(res.data);
    } catch {
      toast.error("Failed to load leads");
    }
  }, [API, token]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  /* ================= DELETE ================= */
  const handleDeleteClick = (id) => {
    setSelectedLeadId(id);
    setShowDeletePopup(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await axios.delete(`${API}/${selectedLeadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Lead deleted successfully ✔");

      setLeads((prev) =>
        prev.filter((lead) => lead._id !== selectedLeadId)
      );
    } catch {
      toast.error("Failed to delete lead");
    } finally {
      setShowDeletePopup(false);
      setSelectedLeadId(null);
    }
  };

  /* ================= FILTER ================= */
  const filteredLeads = leads.filter((lead) => {
    const s = search.toLowerCase();

    const matchSearch =
      lead.name?.toLowerCase().includes(s) ||
      lead.email?.toLowerCase().includes(s) ||
      lead.phone?.toLowerCase().includes(s) ||
      lead.status?.toLowerCase().includes(s);

    const matchStatus =
      filterStatus === "all"
        ? true
        : lead.status?.toLowerCase() === filterStatus;

    return matchSearch && matchStatus;
  });

  const btnStyle = (status) => ({
    padding: "6px 12px",
    marginRight: 10,
    borderRadius: 6,
    cursor: "pointer",
    border: "1px solid #c7c7c7",
    background: filterStatus === status ? "#e3e3e3" : "white",
    fontWeight: filterStatus === status ? "bold" : "normal",
  });

  return (
    <div>
      <div
        style={{
          background: "white",
          padding: 20,
          borderRadius: 10,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        {/* SEARCH */}
        <input
          type="text"
          placeholder="Search leads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "8px 12px",
            width: 250,
            borderRadius: 6,
            border: "1px solid #c7c7c7",
            marginBottom: 15,
          }}
        />

        {/* FILTERS */}
        <div style={{ marginBottom: 15 }}>
          <button onClick={() => setFilterStatus("all")} style={btnStyle("all")}>All</button>
          <button onClick={() => setFilterStatus("new")} style={btnStyle("new")}>New</button>
          <button onClick={() => setFilterStatus("contacted")} style={btnStyle("contacted")}>Contacted</button>
          <button onClick={() => setFilterStatus("followup")} style={btnStyle("followup")}>Follow Up</button>
          <button onClick={() => setFilterStatus("no_connect")} style={btnStyle("no_connect")}>No Connect</button>
          <button onClick={() => setFilterStatus("converted")} style={btnStyle("converted")}>Converted</button>
        </div>

        {/* TABLE */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f2f4f7", textAlign: "left" }}>
              <th style={{ padding: 12 }}>Name</th>
              <th style={{ padding: 12 }}>Email</th>
              <th style={{ padding: 12 }}>Phone</th>
              <th style={{ padding: 12 }}>Status</th>
              <th style={{ padding: 12 }}>Assigned To</th>
              <th style={{ padding: 12 }}>Created By</th>
              <th style={{ padding: 12 }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredLeads.map((lead) => (
              <tr key={lead._id} style={{ borderBottom: "1px solid #eee" }}>
                <td
                  style={{
                    padding: 12,
                    color: "#1f3a93",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                  onClick={() => navigate(`/lead/${lead._id}`)}
                >
                  {lead.name}
                </td>

                <td style={{ padding: 12 }}>{lead.email}</td>
                <td style={{ padding: 12 }}>{lead.phone}</td>

                <td style={{ padding: 12 }}>
                  {lead.status?.replace("_", " ")}
                </td>

                <td style={{ padding: 12 }}>
                  {lead.assignedTo?.email || "Unassigned"}
                </td>

                <td style={{ padding: 12 }}>
                  {lead.createdBy?.email || "N/A"}
                  {lead.createdBy?.role && (
                    <span
                      style={{
                        marginLeft: 6,
                        padding: "2px 6px",
                        borderRadius: 6,
                        fontSize: 11,
                        background: "#eef2ff",
                        color: "#4338ca",
                      }}
                    >
                      {lead.createdBy.role}
                    </span>
                  )}
                </td>

                <td style={{ padding: 12 }}>
                  {canEdit && (
                    <button
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid #ccc",
                        marginRight: 8,
                      }}
                      onClick={() => navigate(`/edit/${lead._id}`)}
                    >
                      Edit
                    </button>
                  )}

                  {canDelete && (
                    <button
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid red",
                        color: "red",
                      }}
                      onClick={() => handleDeleteClick(lead._id)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canDelete && (
        <DeletePopup
          open={showDeletePopup}
          onClose={() => setShowDeletePopup(false)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
