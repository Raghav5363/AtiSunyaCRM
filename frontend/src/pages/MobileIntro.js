import React from "react";
import { useNavigate } from "react-router-dom";

export default function MobileIntro() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <img
        src="/Atisunya.logo.png"
        alt="AtiSunya"
        style={styles.logo}
      />

      <div style={styles.card}>
        <h1 style={styles.heading}>Manage your sales smarter</h1>

        <p style={styles.text}>
          AtiSunya CRM helps your team track leads, follow-ups, reminders, and site visits in one simple workspace.
        </p>

        <img
          src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80"
          alt="CRM workspace"
          style={styles.image}
        />

        <button
          style={styles.button}
          onClick={() => navigate("/login")}
        >
          Get Started
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #e0f2fe, #f8fafc)",
    textAlign: "center",
    padding: "20px",
    fontFamily: "Inter, Segoe UI, sans-serif",
  },
  logo: {
    width: "100%",
    maxWidth: "220px",
    height: "auto",
    marginBottom: "22px",
    objectFit: "contain",
  },
  card: {
    background: "#ffffff",
    padding: "28px",
    borderRadius: "18px",
    boxShadow: "0 18px 42px rgba(0,0,0,0.08)",
    maxWidth: "430px",
    width: "100%",
  },
  heading: {
    fontSize: "30px",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "12px",
    lineHeight: "1.2",
  },
  text: {
    fontSize: "15px",
    color: "#475569",
    marginBottom: "22px",
    lineHeight: "1.6",
  },
  image: {
    width: "100%",
    maxWidth: "320px",
    borderRadius: "16px",
    marginBottom: "24px",
    objectFit: "cover",
    boxShadow: "0 10px 28px rgba(15,23,42,0.12)",
  },
  button: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "14px",
    width: "100%",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "0.2s",
    boxShadow: "0 10px 24px rgba(37,99,235,0.24)",
  },
};