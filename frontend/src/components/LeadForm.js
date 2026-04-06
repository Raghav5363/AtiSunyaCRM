import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FiArrowLeft } from "react-icons/fi";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const API_URL = `${BASE_URL}/api/leads`;

function toLocalDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

export default function LeadForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("new");
  const [purpose, setPurpose] = useState("followup");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const [salesAgents, setSalesAgents] = useState([]);
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [apiMsg, setApiMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const authConfig = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  useEffect(() => {
    axios
      .get(`${BASE_URL}/api/users/sales-agents`, authConfig())
      .then((res) => setSalesAgents(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;

    setLoading(true);

    axios
      .get(`${API_URL}/${id}`, authConfig())
      .then((res) => {
        const lead = res.data;
        setName(lead.name || "");
        setEmail(lead.email || "");
        setPhone(lead.phone || "");
        setStatus(lead.status || "new");
        setPurpose(lead.purpose || "followup");
        setSource(lead.source || "");
        setNotes(lead.notes || "");
        setAssignedTo(lead.assignedTo?._id || "");
        setReminderDate(toLocalDateTimeInput(lead.reminderDate || lead.nextFollowUpDate));
      })
      .catch((err) => {
        setApiMsg(err?.response?.data?.message || "Failed to load lead");
      })
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  useEffect(() => {
    if (!email) {
      setEmailError("");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailError(emailRegex.test(email) ? "" : "Enter valid email");
  }, [email]);

  useEffect(() => {
    if (!phone) {
      setPhoneError("");
      return;
    }
    const cleaned = phone.replace(/\D/g, "");
    setPhoneError(/^\d{10}$/.test(cleaned) ? "" : "Phone must be 10 digits");
  }, [phone]);

  const requiresReminder = status === "followup" || status === "site_visit_planned";
  const sourceError = submitted && !source ? "Select lead source" : "";
  const reminderError =
    submitted && requiresReminder && !reminderDate
      ? "Reminder date is required for follow up and site visit planned leads"
      : "";

  const isFormValid = () => {
    if (!name.trim()) return false;
    if (!email.trim() || emailError) return false;
    if (!phone.trim() || phoneError) return false;
    if (!source) return false;
    if (requiresReminder && !reminderDate) return false;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiMsg("");
    setSubmitted(true);

    if (!isFormValid()) {
      setApiMsg("Please fix errors");
      return;
    }

    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.replace(/\D/g, ""),
      status,
      purpose,
      source,
      notes: notes.trim(),
      reminderDate: reminderDate ? new Date(reminderDate).toISOString() : null,
      assignedTo: assignedTo || null,
    };

    try {
      setLoading(true);
      if (isEdit) {
        await axios.put(`${API_URL}/${id}`, payload, authConfig());
        toast.success("Lead updated");
      } else {
        await axios.post(API_URL, payload, authConfig());
        toast.success("Lead created");
      }
      navigate("/leads");
    } catch (err) {
      console.error(err);
      setApiMsg(err?.response?.data?.message || "Failed to save lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <FiArrowLeft /> Back
        </button>

        <h2 style={styles.title}>{isEdit ? "Edit Lead" : "Add New Lead"}</h2>
        <p style={styles.subtitle}>Fill lead details clearly for fast follow-up and reminder tracking.</p>

        <div style={styles.guidance}>
          <div style={styles.guidanceItem}>
            <strong>Required:</strong> Name, email, phone, source
          </div>
          <div style={styles.guidanceItem}>
            <strong>Recommended:</strong> Purpose, notes, assigned user
          </div>
          <div style={styles.guidanceItem}>
            <strong>Important:</strong> Reminder date should be set for follow-up and site visit leads
          </div>
        </div>

        {apiMsg && <div style={styles.apiError}>{apiMsg}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.grid}>
            <Field label="Full Name *">
              <input value={name} onChange={(e) => setName(e.target.value)} style={styles.input} />
            </Field>

            <Field label="Email *">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ ...styles.input, borderColor: emailError ? "#e53935" : "#dbe2ea" }}
              />
              {emailError && <Error text={emailError} />}
            </Field>

            <Field label="Phone *">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ ...styles.input, borderColor: phoneError ? "#e53935" : "#dbe2ea" }}
              />
              {phoneError && <Error text={phoneError} />}
            </Field>

            <Field label="Lead Status">
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.input}>
                <option value="new">New</option>
                <option value="followup">Follow Up</option>
                <option value="not_interested">Not Interested</option>
                <option value="junk">Junk</option>
                <option value="closed">Closed</option>
                <option value="site_visit_planned">Site Visit Planned</option>
                <option value="site_visit_done">Site Visit Done</option>
              </select>
            </Field>

            <Field label="Purpose">
              <select value={purpose} onChange={(e) => setPurpose(e.target.value)} style={styles.input}>
                <option value="followup">Follow Up</option>
                <option value="call">Call</option>
                <option value="meeting">Meeting</option>
                <option value="site_visit">Site Visit</option>
                <option value="negotiation">Negotiation</option>
                <option value="closure">Closure</option>
              </select>
            </Field>

            <Field label="Assigned To">
              <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} style={styles.input}>
                <option value="">Unassigned</option>
                {salesAgents.map((agent) => (
                  <option key={agent._id} value={agent._id}>
                    {agent.email}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Lead Source *">
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                style={{ ...styles.input, borderColor: sourceError ? "#e53935" : "#dbe2ea" }}
              >
                <option value="">Select Source</option>
                <option value="website">Website</option>
                <option value="facebook">Facebook</option>
                <option value="google">Google</option>
                <option value="whatsapp">Whatsapp</option>
                <option value="reference">Reference</option>
                <option value="other">Other</option>
              </select>
              {sourceError && <Error text={sourceError} />}
            </Field>

            <Field label={`Reminder Date${requiresReminder ? " *" : ""}`}>
              <input
                type="datetime-local"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                style={{ ...styles.input, borderColor: reminderError ? "#e53935" : "#dbe2ea" }}
              />
              {reminderError ? (
                <Error text={reminderError} />
              ) : (
                <div style={styles.helper}>Use this when you want bell notification and scheduled follow-up.</div>
              )}
            </Field>
          </div>

          <Field label="Lead Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ ...styles.input, minHeight: 110, resize: "vertical" }}
            />
            <div style={styles.helper}>Add short context so follow-up owners know exactly what to do next.</div>
          </Field>

          <div style={styles.buttonWrap}>
            <button
              type="submit"
              disabled={!isFormValid() || loading}
              style={{ ...styles.button, opacity: !isFormValid() || loading ? 0.65 : 1 }}
            >
              {loading ? "Saving..." : isEdit ? "Update Lead" : "Create Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

function Error({ text }) {
  return <div style={styles.error}>{text}</div>;
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "14px",
    display: "flex",
    justifyContent: "center",
    background: "var(--bg)",
  },
  card: {
    width: "100%",
    maxWidth: "820px",
    background: "var(--card)",
    padding: "18px",
    borderRadius: "18px",
    boxShadow: "0 10px 22px rgba(15,23,42,0.05)",
    border: "1px solid var(--border)",
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
  title: {
    margin: 0,
    color: "var(--heading)",
    fontSize: "24px",
  },
  subtitle: {
    margin: "8px 0 18px",
    color: "var(--text)",
    fontSize: "13px",
  },
  guidance: {
    display: "grid",
    gap: "8px",
    padding: "12px",
    borderRadius: "14px",
    marginBottom: "16px",
    background: "rgba(239,246,255,0.85)",
    border: "1px solid #bfdbfe",
  },
  guidanceItem: {
    fontSize: "12px",
    color: "#1d4ed8",
    lineHeight: 1.5,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "14px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    marginBottom: "14px",
  },
  label: {
    fontSize: "12px",
    fontWeight: "700",
    marginBottom: "6px",
    color: "var(--heading)",
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #dbe2ea",
    fontSize: "14px",
    boxSizing: "border-box",
    background: "var(--card)",
    color: "var(--text)",
  },
  buttonWrap: {
    marginTop: "14px",
    display: "flex",
    justifyContent: "flex-end",
  },
  button: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "12px 18px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(37,99,235,0.18)",
  },
  error: {
    color: "#e53935",
    fontSize: "12px",
    marginTop: "4px",
  },
  helper: {
    fontSize: "11px",
    color: "var(--text)",
    marginTop: "6px",
    lineHeight: 1.45,
  },
  apiError: {
    background: "#ffeaea",
    padding: "10px",
    marginBottom: "12px",
    borderRadius: "10px",
    color: "#d32f2f",
    fontSize: "13px",
  },
};
