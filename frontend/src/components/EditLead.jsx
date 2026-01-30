// frontend/src/components/EditLead.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

export default function EditLead() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    status: "new",
    source: "",
  });

  const [loading, setLoading] = useState(true);
  const [apiMsg, setApiMsg] = useState("");

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/leads/${id}`);
        const lead = res.data;
        setForm({
          name: lead.name || "",
          email: lead.email || "",
          phone: lead.phone || "",
          status: lead.status || "new",
          source: lead.source || "",
        });
        setLoading(false);
      } catch (err) {
        console.error(err);
        setApiMsg("Failed to load lead.");
        setLoading(false);
      }
    };

    fetchLead();
  }, [id]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiMsg("");
    try {
      await axios.put(`http://localhost:5000/api/leads/${id}, form`);
      navigate("/");
    } catch (err) {
      console.error(err);
      setApiMsg("Failed to update lead.");
    }
  };

  if (loading) return <div className="msg">Loading...</div>;

  return (
    <div
      style={{
        padding: "30px",
        background: "linear-gradient(135deg, #0a1a32, #132d4a, #1d3b63)",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 650,
          background: "white",
          padding: "30px",
          borderRadius: 15,
          boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
          marginTop: 20,
        }}
      >
        <h2
          style={{
            textAlign: "center",
            marginBottom: 20,
            fontWeight: 600,
            color: "#0a1a32",
          }}
        >
          Edit Lead
        </h2>

        {apiMsg && (
          <div style={{ color: "red", textAlign: "center", marginBottom: 10 }}>
            {apiMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Input Fields */}
          <div className="form-row">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Full Name"
              required
              style={inputBox}
            />
          </div>

          <div className="form-row">
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              type="email"
              required
              style={inputBox}
            />
          </div>

          <div className="form-row">
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Phone Number"
              required
              style={inputBox}
            />
          </div>

          <div className="form-row">
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              style={inputBox}
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="converted">Converted</option>
            </select>
          </div>

          <div className="form-row">
            <input
              name="source"
              value={form.source}
              onChange={handleChange}
              placeholder="Source (Referral, Website, etc.)"
              style={inputBox}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button style={cancelBtn} type="button" onClick={() => navigate("/")}>
              Cancel
            </button>

            <button style={saveBtn} type="submit">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* --- Reusable Styles --- */

const inputBox = {
  width: "100%",
  padding: "12px 14px",
  marginBottom: 14,
  borderRadius: 8,
  border: "1px solid #cfcfcf",
  fontSize: 15,
  outline: "none",
  transition: "0.2s",
};

const cancelBtn = {
  flex: 1,
  padding: "12px 0",
  borderRadius: 8,
  border: "1px solid #999",
  background: "white",
  cursor: "pointer",
  fontWeight: 500,
};

const saveBtn = {
  flex: 1,
  padding: "12px 0",
  borderRadius: 8,
  border: "none",
  background: "#0a68ff",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
};