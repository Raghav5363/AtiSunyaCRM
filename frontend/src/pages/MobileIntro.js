import React from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowRight, FiCheckCircle, FiDownload, FiShield, FiSmartphone } from "react-icons/fi";
import PwaInstallCard from "../components/PwaInstallCard";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80";

export default function MobileIntro() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.brandRow}>
          <img src="/Atisunya.brand.png" alt="AtiSunya CRM" style={styles.logo} />
        </div>

        <div style={styles.heroCard}>
          <div style={styles.contentPane}>
            <div style={styles.kicker}>AtiSunya CRM</div>
            <h1 style={styles.heading}>Manage leads, follow-ups, reminders, and visits in one place</h1>
            <p style={styles.text}>
              Built for real estate and sales teams who need a clean, fast, professional CRM that
              feels great on mobile and desktop.
            </p>

            <div style={styles.featureList}>
              <div style={styles.featureItem}>
                <FiCheckCircle style={styles.featureIcon} />
                <span>Live reminders, notifications, and follow-up tracking</span>
              </div>
              <div style={styles.featureItem}>
                <FiShield style={styles.featureIcon} />
                <span>Professional dashboard, reports, and team workflow</span>
              </div>
              <div style={styles.featureItem}>
                <FiSmartphone style={styles.featureIcon} />
                <span>Works like a mobile app and can be installed directly</span>
              </div>
            </div>

            <div style={styles.actionRow}>
              <button style={styles.primaryButton} onClick={() => navigate("/login")}>
                <span>Open CRM</span>
                <FiArrowRight />
              </button>
              <a href="#install" style={styles.secondaryButton}>
                <FiDownload />
                <span>Install App</span>
              </a>
            </div>
          </div>

          <div style={styles.visualPane}>
            <img src={HERO_IMAGE} alt="AtiSunya CRM workspace" style={styles.heroImage} />
            <div style={styles.visualBadge}>Daily lead operations, follow-ups, and closure flow</div>
          </div>
        </div>

        <div id="install" style={styles.installSection}>
          <PwaInstallCard />
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100dvh",
    background:
      "radial-gradient(circle at top right, rgba(37,99,235,0.18), transparent 24%), linear-gradient(135deg, #e0f2fe, #f8fafc 46%, #eef2ff)",
    padding: "28px 18px 34px",
    fontFamily: "Inter, Segoe UI, sans-serif",
  },
  shell: {
    width: "100%",
    maxWidth: 1120,
    margin: "0 auto",
  },
  brandRow: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 24,
  },
  logo: {
    width: "100%",
    maxWidth: 300,
    height: "auto",
    objectFit: "contain",
    filter: "drop-shadow(0 12px 24px rgba(15,23,42,0.12))",
  },
  heroCard: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.02fr) minmax(320px, 0.98fr)",
    gap: 22,
    padding: 24,
    background: "rgba(255,255,255,0.9)",
    borderRadius: 30,
    border: "1px solid rgba(255,255,255,0.76)",
    boxShadow: "0 30px 70px rgba(15,23,42,0.12)",
    backdropFilter: "blur(16px)",
    alignItems: "center",
  },
  contentPane: {
    padding: "8px 6px 8px 4px",
  },
  kicker: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 14px",
    borderRadius: 999,
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 16,
  },
  heading: {
    margin: 0,
    fontSize: 48,
    lineHeight: 1.02,
    letterSpacing: "-0.04em",
    color: "#172033",
    fontWeight: 900,
    maxWidth: 560,
  },
  text: {
    margin: "18px 0 0",
    fontSize: 18,
    lineHeight: 1.68,
    color: "#52607a",
    maxWidth: 560,
  },
  featureList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginTop: 24,
  },
  featureItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    color: "#1f2b45",
    fontSize: 15,
    fontWeight: 600,
  },
  featureIcon: {
    color: "#1d4ed8",
    fontSize: 18,
    flexShrink: 0,
  },
  actionRow: {
    marginTop: 28,
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  primaryButton: {
    border: "none",
    borderRadius: 16,
    padding: "15px 22px",
    minWidth: 180,
    background: "linear-gradient(135deg, #0f172a, #1d4ed8)",
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    boxShadow: "0 16px 32px rgba(29,78,216,0.2)",
    textDecoration: "none",
  },
  secondaryButton: {
    borderRadius: 16,
    padding: "15px 22px",
    minWidth: 180,
    background: "#ffffff",
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 800,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    textDecoration: "none",
    border: "1px solid #d7e1f0",
    boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
  },
  visualPane: {
    position: "relative",
    minHeight: 520,
    borderRadius: 26,
    overflow: "hidden",
    background: "#dbeafe",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.4)",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    minHeight: 520,
    objectFit: "cover",
    display: "block",
  },
  visualBadge: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
    padding: "14px 16px",
    borderRadius: 18,
    background: "rgba(15,23,42,0.72)",
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: 700,
    backdropFilter: "blur(10px)",
  },
  installSection: {
    maxWidth: 720,
    margin: "22px auto 0",
  },
};
