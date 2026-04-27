import React from "react";
import { useNavigate } from "react-router-dom";
import PwaInstallCard from "../components/PwaInstallCard";

export default function MobileIntro() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <img src="/Atisunya.logo.png" alt="AtiSunya" style={styles.logo} />

      <div style={styles.card}>
        <h1 style={styles.heading}>Manage your sales smarter</h1>

        <p style={styles.text}>
          AtiSunya CRM helps your team track leads, close deals faster and grow revenue - all in
          one simple platform.
        </p>

        <img
          src="https://images.unsplash.com/photo-1552664730-d307ca884978"
          alt="crm"
          style={styles.image}
        />

        <button type="button" style={styles.button} onClick={() => navigate("/login")}>
          Get Started -&gt;
        </button>
      </div>

      <div style={styles.installCardWrap}>
        <PwaInstallCard compact />
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
    padding: "20px 16px 28px",
    fontFamily: "Inter, Segoe UI, sans-serif",
    boxSizing: "border-box",
  },
  logo: {
    width: "100%",
    maxWidth: "340px",
    marginBottom: "22px",
    objectFit: "contain",
  },
  card: {
    background: "#ffffff",
    padding: "28px 24px",
    borderRadius: "20px",
    boxShadow: "0 18px 44px rgba(15,23,42,0.08)",
    maxWidth: "440px",
    width: "100%",
    boxSizing: "border-box",
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
    maxWidth: "100%",
    borderRadius: "18px",
    marginBottom: "26px",
    objectFit: "cover",
    display: "block",
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
  installCardWrap: {
    width: "100%",
    maxWidth: "440px",
    marginTop: "14px",
  },
};
