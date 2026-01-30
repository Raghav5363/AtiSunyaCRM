import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

export default function LeadView() {
  const { id } = useParams();

  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);

  const [activityType, setActivityType] = useState("call");
  const [activityDateTime, setActivityDateTime] = useState("");
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");

  const token = localStorage.getItem("token");

  const authConfig = {
    headers: { Authorization: `Bearer ${token}` },
  };

  useEffect(() => {
    if (!token) return;

    axios
      .get(`http://localhost:5000/api/leads/${id}`, authConfig)
      .then((res) => setLead(res.data))
      .catch(() => toast.error("Failed to load lead"));

    axios
      .get(`http://localhost:5000/api/activities/${id}`, authConfig)
      .then((res) => setActivities(res.data))
      .catch(() => toast.error("Failed to load activities"));
  }, [id, token]);

  const handleAddActivity = async () => {
    if (!activityDateTime || !outcome || !notes.trim()) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const payload = {
        activityType,
        activityDateTime,
        outcome,
        notes,
        nextFollowUpDate: nextFollowUpDate || null,
      };

      const res = await axios.post(
        `http://localhost:5000/api/activities/${id}`,
        payload,
        authConfig
      );

      setActivities((prev) => [res.data, ...prev]);
      setOutcome("");
      setNotes("");
      setNextFollowUpDate("");
      toast.success("Activity added ✔");
    } catch {
      toast.error("Failed to add activity");
    }
  };

  if (!lead) return <div>Loading...</div>;

  const whatsappNumber = lead.phone.replace(/\D/g, "");

  return (
    <div
      style={{
        background: "white",
        padding: 30,
        borderRadius: 12,
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
      }}
    >
      <h2 style={{ marginBottom: 30 }}>{lead.name}</h2>

      {/* LEAD DETAILS */}
      <div style={{ marginBottom: 40, lineHeight: "2.3" }}>
        <div>
          <strong>Email:</strong> {lead.email}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <strong>Phone:</strong>
          <span>{lead.phone}</span>

          {/* 📞 CALL */}
          <a
            href={`tel:${lead.phone}`}
            style={{
              padding: "6px 12px",
              background: "#1f3a93",
              color: "white",
              borderRadius: 20,
              textDecoration: "none",
              fontSize: 13,
            }}
          >
            📞 Call
          </a>

          {/* 💬 WHATSAPP */}
          <a
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "6px 12px",
              background: "#25D366",
              color: "white",
              borderRadius: 20,
              textDecoration: "none",
              fontSize: 13,
            }}
          >
            💬 WhatsApp
          </a>
        </div>

        <div>
          <strong>Status:</strong>
          <span
            style={{
              marginLeft: 10,
              padding: "6px 14px",
              borderRadius: 20,
              background: "#e6d9ff",
              fontSize: 12,
              textTransform: "capitalize",
            }}
          >
            {lead.status.replace("_", " ")}
          </span>
        </div>

        <div>
          <strong>Assigned To:</strong>{" "}
          {lead.assignedTo?.email || "Unassigned"}
        </div>
      </div>

      {/* ADD ACTIVITY */}
      <div
        style={{
          marginBottom: 45,
          padding: 25,
          border: "1px solid #eee",
          borderRadius: 12,
        }}
      >
        <h3 style={{ marginBottom: 20 }}>Add Activity</h3>

        <div style={{ display: "grid", gap: 18 }}>
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
            style={{ padding: 10, borderRadius: 6 }}
          >
            <option value="call">Call</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
          </select>

          <input
            type="datetime-local"
            value={activityDateTime}
            onChange={(e) => setActivityDateTime(e.target.value)}
            style={{ padding: 10, borderRadius: 6 }}
          />

          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            style={{ padding: 10, borderRadius: 6 }}
          >
            <option value="">Call Result</option>
            <option value="Connected">Connected</option>
            <option value="Not Picked">Not Picked</option>
            <option value="Busy">Busy</option>
            <option value="Switch Off">Switch Off</option>
          </select>

          <textarea
            placeholder="Notes (mandatory)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{ padding: 12, borderRadius: 6 }}
          />

          <input
            type="date"
            value={nextFollowUpDate}
            onChange={(e) => setNextFollowUpDate(e.target.value)}
            style={{ padding: 10, borderRadius: 6 }}
          />

          <button
            onClick={handleAddActivity}
            style={{
              padding: "12px 24px",
              background: "#1f3a93",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Add Activity
          </button>
        </div>
      </div>

      {/* ACTIVITY TIMELINE */}
      <div>
        <h3 style={{ marginBottom: 20 }}>Activity Timeline</h3>

        {activities.length === 0 ? (
          <div style={{ color: "#888" }}>No activities yet.</div>
        ) : (
          activities.map((act) => (
            <div
              key={act._id}
              style={{
                marginBottom: 22,
                padding: 20,
                borderRadius: 10,
                background: "#f9f9f9",
                border: "1px solid #eee",
                lineHeight: "2",
              }}
            >
              <strong style={{ textTransform: "capitalize" }}>
                {act.activityType}
              </strong>{" "}
              — {act.outcome}

              <div>{act.notes}</div>

              {act.nextFollowUpDate && (
                <div style={{ fontSize: 13, color: "#555" }}>
                  Next Follow-up:{" "}
                  {new Date(act.nextFollowUpDate).toLocaleDateString()}
                </div>
              )}

              <div style={{ fontSize: 12, color: "#999", marginTop: 6 }}>
                {new Date(act.activityDateTime).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}