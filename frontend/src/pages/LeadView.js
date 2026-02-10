import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { FaPhoneAlt, FaWhatsapp, FaEnvelope, FaSms } from "react-icons/fa";

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
  const authConfig = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    axios
      .get(`http://localhost:5000/api/leads/${id}`, authConfig)
      .then((res) => setLead(res.data))
      .catch(() => toast.error("Failed to load lead"));

    axios
      .get(`http://localhost:5000/api/activities/${id}`, authConfig)
      .then((res) => setActivities(res.data))
      .catch(() => toast.error("Failed to load activities"));
  }, [id]);

  const handleAddActivity = async () => {
    if (!activityDateTime || !outcome || !notes.trim()) {
      toast.error("Fill required fields");
      return;
    }
    try {
      const res = await axios.post(
        `http://localhost:5000/api/activities/${id}`,
        { activityType, activityDateTime, outcome, notes, nextFollowUpDate },
        authConfig
      );
      setActivities([res.data, ...activities]);
      setOutcome("");
      setNotes("");
      setNextFollowUpDate("");
      toast.success("Activity Added ✔");
    } catch {
      toast.error("Error adding activity");
    }
  };

  if (!lead) return <div>Loading...</div>;

  const cleanNumber = lead.phone.replace(/\D/g, "");
  const today = new Date();

  const handleCallClick = () => {
    navigator.clipboard.writeText(lead.phone);
    toast.success("Number copied ✔");
    window.location.href = `tel:${lead.phone}`;
  };
  const handleSmsClick = () => {
    navigator.clipboard.writeText(lead.phone);
    toast.success("Number copied ✔");
    window.location.href = `sms:${lead.phone}`;
  };

  const getFollowUpStatus = (dateStr) => {
    if (!dateStr) return { label: "", color: "#ccc" };
    const d = new Date(dateStr);
    const diff = d.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
    if (diff === 0) return { label: "Today", color: "#ffc107" }; // yellow
    if (diff > 0) return { label: "Upcoming", color: "#17a2b8" }; // blue
    return { label: "Past", color: "#6c757d" }; // gray
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* LEAD HEADER */}
        <div style={styles.header}>
          <h2 style={styles.name}>{lead.name}</h2>
          <div style={styles.contactButtons}>
            <button onClick={handleCallClick} style={styles.iconBtn}>
              <FaPhoneAlt />
            </button>
            <button onClick={handleSmsClick} style={styles.iconBtn}>
              <FaSms />
            </button>
            <a href={`mailto:${lead.email}`} style={styles.iconBtn}>
              <FaEnvelope />
            </a>
            <a
              href={`https://wa.me/${cleanNumber}`}
              target="_blank"
              rel="noreferrer"
              style={{ ...styles.iconBtn, backgroundColor: "#25D366" }}
            >
              <FaWhatsapp />
            </a>
          </div>
        </div>

        <div style={styles.details}>
          <p>
            <b>Email:</b> {lead.email}
          </p>
          <p>
            <b>Phone:</b> {lead.phone}
          </p>
          <p>
            <b>Status:</b>{" "}
            <span style={{ ...styles.status }}>{lead.status}</span>
          </p>
          <p>
            <b>Assigned To:</b> {lead.assignedTo?.email || "Unassigned"}
          </p>
        </div>

        {/* ADD ACTIVITY FORM */}
        <div style={styles.card}>
          <h3 style={{ marginBottom: 15 }}>Add Activity</h3>

          <label style={styles.label}>Activity Type</label>
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
            style={styles.input}
          >
            <option value="call">Call</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
          </select>

          <label style={styles.label}>Activity Date & Time</label>
          <input
            type="datetime-local"
            value={activityDateTime}
            onChange={(e) => setActivityDateTime(e.target.value)}
            style={styles.input}
          />

          <label style={styles.label}>Result</label>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            style={styles.input}
          >
            <option value="">Select Result</option>
            <option>Connected</option>
            <option>Not Picked</option>
            <option>Busy</option>
            <option>Switch Off</option>
          </select>

          <label style={styles.label}>Notes</label>
          <textarea
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={styles.input}
          />

          <label style={styles.label}>Next Follow-Up Date</label>
          <input
            type="date"
            value={nextFollowUpDate}
            onChange={(e) => setNextFollowUpDate(e.target.value)}
            style={styles.input}
          />

          <button onClick={handleAddActivity} style={styles.button}>
            Add Activity
          </button>
        </div>

        {/* ACTIVITY TIMELINE */}
        <div style={{ marginTop: 25 }}>
          <h3>Activity Timeline</h3>
          {activities.length === 0 ? (
            <p>No activities yet</p>
          ) : (
            activities.map((a) => {
              const followUp = getFollowUpStatus(a.nextFollowUpDate);
              return (
                <div key={a._id} style={styles.timeline}>
                  <div style={styles.timelineHeader}>
                    <b style={{ textTransform: "capitalize" }}>{a.activityType}</b>{" "}
                    — {a.outcome}
                    {a.nextFollowUpDate && (
                      <span
                        style={{
                          ...styles.followUpLabel,
                          backgroundColor: followUp.color,
                        }}
                      >
                        {followUp.label}: {new Date(a.nextFollowUpDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p>{a.notes}</p>
                  <div style={styles.time}>
                    {new Date(a.activityDateTime).toLocaleString()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== STYLES ===== */
const styles = {
  page: {
    padding: "10px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    backgroundColor: "#f4f6f9",
    minHeight: "100vh",
  },
  container: {
    maxWidth: "1000px",
    margin: "0 auto",
    backgroundColor: "#fff",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "15px",
  },
  name: { fontSize: "28px", fontWeight: 600, margin: 0 },
  contactButtons: { display: "flex", gap: "10px", flexWrap: "wrap" },
  iconBtn: {
    padding: "10px",
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    backgroundColor: "#eee",
    fontSize: "16px",
  },
  details: { fontSize: "16px", marginBottom: "20px", lineHeight: 1.5 },
  status: {
    padding: "4px 10px",
    borderRadius: "6px",
    backgroundColor: "#e0e0e0",
    fontWeight: 500,
    fontSize: "14px",
  },
  card: { backgroundColor: "#f7f9fb", padding: "20px", borderRadius: "10px" },
  label: { fontWeight: 500, marginBottom: 5, display: "block", fontSize: 14 },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "12px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "15px",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  button: {
    padding: "10px 15px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#007bff",
    color: "#fff",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: 500,
  },
  timeline: {
    backgroundColor: "#f5f5f5",
    padding: "14px",
    borderRadius: "8px",
    marginBottom: "12px",
    fontSize: "15px",
  },
  timelineHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
    flexWrap: "wrap",
    gap: "10px",
  },
  followUpLabel: {
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "12px",
    color: "#fff",
    fontWeight: 500,
  },
  time: { fontSize: "12px", color: "#555", marginTop: "5px" },
};
