import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

const API_URL = "http://localhost:5000/api/leads";

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

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/users/sales-agents", authConfig())
      .then(res => setSalesAgents(res.data))
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
        setSource(lead.source || "");
        setAssignedTo(lead.assignedTo?._id || "");
      })
      .catch((err) => {
        setApiMsg(err?.response?.data?.message || "Failed to load lead");
      })
      .finally(() => setLoading(false));
  }, [id, isEdit]);

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
      setApiMsg(err?.response?.data?.message || "Failed to save lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(to bottom right, #d8c7ff, #f4e9ff)", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 600, background: "white", borderRadius: 16, padding: "32px 40px", boxShadow: "0 4px 18px rgba(0,0,0,0.12)" }}>
        {apiMsg && <div style={{ color: "red", marginBottom: 12, textAlign: "center" }}>{apiMsg}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <label style={{ fontWeight: 600 }}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />

          <label style={labelStyle}>Business Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, borderColor: emailError ? "red" : "#ccc" }} />
          {emailError && <div style={errorText}>{emailError}</div>}

          <label style={labelStyle}>Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} style={{ ...inputStyle, borderColor: phoneError ? "red" : "#ccc" }} />
          {phoneError && <div style={errorText}>{phoneError}</div>}

          <label style={labelStyle}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="followup">Follow Up</option>
            <option value="no_connect">No Connect</option>
            <option value="converted">Converted</option>
          </select>

          <label style={labelStyle}>Assigned To</label>
          <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} style={inputStyle}>
            <option value="">Unassigned</option>
            {salesAgents.map(agent => (
              <option key={agent._id} value={agent._id}>{agent.email}</option>
            ))}
          </select>

          <label style={labelStyle}>Source</label>
          <input value={source} onChange={(e) => setSource(e.target.value)} style={inputStyle} />

          <button type="submit" disabled={!isFormValid() || loading} style={{ width: "100%", marginTop: 25, padding: "12px 0", background: "linear-gradient(90deg,#0d1b4c,#1f3a93,#6f4aff)", color: "white", borderRadius: 30, fontSize: 18, fontWeight: 600, border: "none", cursor: isFormValid() ? "pointer" : "not-allowed", opacity: isFormValid() ? 1 : 0.6 }}>
            {isEdit ? loading ? "Saving..." : "Save Changes" : loading ? "Adding..." : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid #ccc", marginBottom: 18, fontSize: 15 };
const labelStyle = { fontWeight: 600, marginBottom: 5, display: "block" };
const errorText = { color: "red", fontSize: 12, marginTop: -10, marginBottom: 14 };