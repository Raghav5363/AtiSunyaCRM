import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import {
  FaPhoneAlt,
  FaWhatsapp,
  FaEnvelope,
  FaSms,
} from "react-icons/fa";

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
        {
          activityType,
          activityDateTime,
          outcome,
          notes,
          nextFollowUpDate,
        },
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

  // ✅ NEW — CALL CLICK
  const handleCallClick = () => {
    navigator.clipboard.writeText(lead.phone);
    toast.success("Number copied ✔");

    window.location.href = `tel:${lead.phone}`;
  };

  // ✅ NEW — SMS CLICK
  const handleSmsClick = () => {
    navigator.clipboard.writeText(lead.phone);
    toast.success("Number copied ✔");

    window.location.href = `sms:${lead.phone}`;
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h2 style={styles.name}>{lead.name}</h2>

        <div style={styles.details}>
          <p><b>Email:</b> {lead.email}</p>
          <p><b>Phone:</b> {lead.phone}</p>

          {/* ACTION BUTTONS */}
          <div style={styles.actions}>
            
            {/* ✅ UPDATED */}
            <button onClick={handleCallClick} style={styles.iconBtn}>
              <FaPhoneAlt />
            </button>

            {/* ✅ UPDATED */}
            <button onClick={handleSmsClick} style={styles.iconBtn}>
              <FaSms />
            </button>

            {/* UNCHANGED */}
            <a href={`mailto:${lead.email}`} style={styles.iconBtn}>
              <FaEnvelope />
            </a>

            {/* UNCHANGED */}
            <a
              href={`https://wa.me/${cleanNumber}`}
              target="_blank"
              rel="noreferrer"
              style={{ ...styles.iconBtn, background: "#25D366" }}
            >
              <FaWhatsapp />
            </a>
          </div>

          <p>
            <b>Status:</b>{" "}
            <span style={styles.status}>{lead.status}</span>
          </p>

          <p>
            <b>Assigned To:</b>{" "}
            {lead.assignedTo?.email || "Unassigned"}
          </p>
        </div>

        {/* ADD ACTIVITY */}
        <div style={styles.card}>
          <h3>Add Activity</h3>

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

          <input
            type="datetime-local"
            value={activityDateTime}
            onChange={(e) => setActivityDateTime(e.target.value)}
            style={styles.input}
          />

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

          <textarea
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={styles.input}
          />

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

        {/* TIMELINE */}
        <div>
          <h3>Activity Timeline</h3>

          {activities.length === 0 ? (
            <p>No activities yet</p>
          ) : (
            activities.map((a) => (
              <div key={a._id} style={styles.timeline}>
                <b>{a.activityType}</b> — {a.outcome}
                <p>{a.notes}</p>

                {a.nextFollowUpDate && (
                  <small>
                    Next Follow-up:{" "}
                    {new Date(a.nextFollowUpDate).toLocaleDateString()}
                  </small>
                )}

                <div style={styles.time}>
                  {new Date(a.activityDateTime).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* STYLES SAME — NO CHANGE */
