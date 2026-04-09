import React from "react";
import { useNavigate } from "react-router-dom";

export default function MobileIntro() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <img src="/Atisunya.logo.png" alt="AtiSunya" style={styles.logo} />

      <div style={styles.card}>
        <h1 style={styles.heading}>Manage your sales smarter</h1>

        <p style={styles.text}>
          AtiSunya CRM helps your team track leads, close deals faster and grow revenue — all in
          one simple platform.
        </p>

        <img
          src="https://images.unsplash.com/photo-1552664730-d307ca884978"
          alt="crm"
          style={styles.image}
        />

        <button style={styles.button} onClick={() => navigate("/login")}>
          Get Started →
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
    maxWidth: "260px",
    marginBottom: "25px",
    objectFit: "contain",
  },
  card: {
    background: "#ffffff",
    padding: "30px",
    borderRadius: "16px",
    boxShadow: "0 15px 40px rgba(0,0,0,0.08)",
    maxWidth: "420px",
    width: "100%",
  },
  heading: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "12px",
    lineHeight: "1.3",
  },
  text: {
    fontSize: "15px",
    color: "#475569",
    marginBottom: "25px",
    lineHeight: "1.6",
  },
  image: {
    width: "100%",
    maxWidth: "320px",
    borderRadius: "14px",
    marginBottom: "30px",
    objectFit: "cover",
  },
  button: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "14px",
    width: "100%",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "0.2s",
    boxShadow: "0 8px 20px rgba(37,99,235,0.25)",
  },
};
