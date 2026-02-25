import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

/* ================= SAFE BASE URL ================= */
const BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

const API_URL = `${BASE_URL}/api/leads`;

export default function LeadForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("new");
  const [source, setSource] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [salesAgents, setSalesAgents] = useState([]);

  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [apiMsg, setApiMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const authConfig = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  /* ================= LOAD SALES AGENTS ================= */
  useEffect(() => {
    axios
      .get(`${BASE_URL}/api/users/sales-agents`, authConfig())
      .then((res) => setSalesAgents(res.data))
      .catch(() => {});
  }, []);

  /* ================= LOAD LEAD (EDIT MODE) ================= */
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
        setSource(lead.source || "");
        setAssignedTo(lead.assignedTo?._id || "");
      })
      .catch((err) => {
        setApiMsg(
          err?.response?.data?.message || "Failed to load lead"
        );
      })
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  /* ================= EMAIL VALIDATION ================= */
  useEffect(() => {
    if (!email) return setEmailError("");

    if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
      setEmailError("Enter a valid email.");
      return;
    }

    const parts = email.split("@");
    if (!parts[1] || !parts[1].includes(".")) {
      setEmailError("Email must contain a domain (example.com)");
      return;
    }

    setEmailError("");
  }, [email]);

  /* ================= PHONE VALIDATION ================= */
  useEffect(() => {
    if (!phone) return setPhoneError("");

    const cleaned = phone.replace(/\D/g, "");

    if (!/^\d{10}$/.test(cleaned)) {
      setPhoneError("Phone must be 10 digits.");
    } else {
      setPhoneError("");
    }
  }, [phone]);

  const isFormValid = () => {
    if (!name.trim()) return false;
    if (!email.trim() || emailError) return false;
    if (!phone.trim() || phoneError) return false;
    return true;
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiMsg("");

    if (!isFormValid()) {
      setApiMsg("Please fix validation errors before submitting.");
      return;
    }

    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.replace(/\D/g, ""),
      status,
      source: source.trim() || undefined,
      assignedTo: assignedTo || undefined,
    };

    try {
      setLoading(true);

      if (isEdit) {
        await axios.put(`${API_URL}/${id}`, payload, authConfig());
        toast.success("Lead updated successfully ✔");
      } else {
        await axios.post(API_URL, payload, authConfig());
        toast.success("Lead added successfully ✔");
      }

      navigate("/");
    } catch (err) {
      setApiMsg(
        err?.response?.data?.message || "Failed to save lead"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageWrapper}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0 }}>
            {isEdit ? "Edit Lead" : "Create Lead"}
          </h2>
          <p style={subText}>
            Enter lead details below
          </p>
        </div>

        {apiMsg && <div style={apiErrorStyle}>{apiMsg}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div style={formGrid}>
            
            <div style={fieldWrapper}>
              <label style={labelStyle}>Full Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
                placeholder="Enter full name"
              />
            </div>

            <div style={fieldWrapper}>
              <label style={labelStyle}>Business Email *</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  ...inputStyle,
                  borderColor: emailError ? "#e53935" : "#dcdcdc",
                }}
                placeholder="example@company.com"
              />
              {emailError && <div style={errorText}>{emailError}</div>}
            </div>

            <div style={fieldWrapper}>
              <label style={labelStyle}>Phone *</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  ...inputStyle,
                  borderColor: phoneError ? "#e53935" : "#dcdcdc",
                }}
                placeholder="10 digit mobile number"
              />
              {phoneError && <div style={errorText}>{phoneError}</div>}
            </div>

            <div style={fieldWrapper}>
              <label style={labelStyle}>Lead Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={inputStyle}
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="followup">Follow Up</option>
                <option value="no_connect">No Connect</option>
                <option value="converted">Converted</option>
              </select>
            </div>

            <div style={fieldWrapper}>
              <label style={labelStyle}>Assigned To</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                style={inputStyle}
              >
                <option value="">Unassigned</option>
                {salesAgents.map((agent) => (
                  <option key={agent._id} value={agent._id}>
                    {agent.email}
                  </option>
                ))}
              </select>
            </div>

            <div style={fieldWrapper}>
              <label style={labelStyle}>Lead Source</label>
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                style={inputStyle}
                placeholder="Website, Referral, LinkedIn..."
              />
            </div>
          </div>

          <div style={buttonWrapper}>
            <button
              type="submit"
              disabled={!isFormValid() || loading}
              style={{
                ...buttonStyle,
                opacity: !isFormValid() ? 0.6 : 1,
              }}
            >
              {isEdit
                ? loading
                  ? "Saving..."
                  : "Update Lead"
                : loading
                ? "Creating..."
                : "Create Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ================= RESPONSIVE STYLES ================= */

const pageWrapper = {
  minHeight: "100vh",
  background: "#f5f7fb",
  padding: "40px 20px",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start", // top align instead of center
};

const cardStyle = {
  width: "100%",
  maxWidth: "1200px", // 🔥 increased width
  background: "#ffffff",
  borderRadius: "10px",
  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
  padding: "35px 40px",
};

const headerStyle = {
  borderBottom: "1px solid #eee",
  paddingBottom: "15px",
  marginBottom: "20px",
};

const subText = {
  margin: "6px 0 0",
  color: "#666",
  fontSize: "14px",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "25px",
};

const fieldWrapper = {
  display: "flex",
  flexDirection: "column",
};

const labelStyle = {
  fontSize: "13px",
  fontWeight: "600",
  marginBottom: "6px",
  color: "#333",
};

const inputStyle = {
  padding: "10px 12px",
  borderRadius: "6px",
  border: "1px solid #dcdcdc",
  fontSize: "14px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const buttonWrapper = {
  marginTop: "25px",
  display: "flex",
  justifyContent: "flex-end",
};

const buttonStyle = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "10px 22px",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: "600",
};

const errorText = {
  color: "#e53935",
  fontSize: "12px",
  marginTop: "4px",
};

const apiErrorStyle = {
  background: "#ffeaea",
  color: "#d32f2f",
  padding: "10px 14px",
  borderRadius: "6px",
  marginBottom: "15px",
  fontSize: "13px",
};