import React from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowRight, FiBell, FiTarget, FiTrendingUp } from "react-icons/fi";
import PwaInstallCard from "../components/PwaInstallCard";

export default function MobileIntro() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <div style={styles.glowTop} />
      <div style={styles.glowBottom} />

      <div style={styles.shell}>
        <div style={styles.brandWrap}>
          <div style={styles.kicker}>Mobile CRM Workspace</div>
          <img src="/Atisunya.logo.png" alt="AtiSunya" style={styles.logo} />
        </div>

        <div style={styles.card}>
          <div style={styles.eyebrow}>AtiSunya CRM</div>
          <h1 style={styles.heading}>Manage leads with clarity and speed</h1>

          <p style={styles.text}>
            Keep follow-ups organized, track every conversation, and move deals forward from one
            clean mobile-first workspace.
          </p>

          <div style={styles.featureGrid}>
            <FeaturePill icon={<FiTarget />} label="Lead tracking" />
            <FeaturePill icon={<FiBell />} label="Real-time reminders" />
            <FeaturePill icon={<FiTrendingUp />} label="Faster follow-ups" />
          </div>

          <div style={styles.imageWrap}>
            <img
              src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80"
              alt="Team reviewing CRM workflow"
              style={styles.image}
            />
          </div>

          <button type="button" style={styles.button} onClick={() => navigate("/login")}>
            <span>Get Started</span>
            <FiArrowRight />
          </button>
        </div>

        <div style={styles.installCardWrap}>
          <PwaInstallCard compact />
        </div>
      </div>
    </div>
  );
}

function FeaturePill({ icon, label }) {
  return (
    <div style={styles.featurePill}>
      <span style={styles.featureIcon}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at top, rgba(56,189,248,0.18), transparent 28%), linear-gradient(180deg, #eef6ff 0%, #f8fbff 54%, #ffffff 100%)",
    padding: "24px 16px calc(env(safe-area-inset-bottom, 0px) + 24px)",
    boxSizing: "border-box",
  },
  glowTop: {
    position: "absolute",
    top: -80,
    right: -30,
    width: 220,
    height: 220,
    borderRadius: 999,
    background: "rgba(59,130,246,0.16)",
    filter: "blur(10px)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -100,
    left: -50,
    width: 240,
    height: 240,
    borderRadius: 999,
    background: "rgba(14,165,233,0.12)",
    filter: "blur(10px)",
  },
  shell: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 460,
    display: "grid",
    gap: 18,
  },
  brandWrap: {
    display: "grid",
    gap: 12,
    justifyItems: "center",
    textAlign: "center",
  },
  kicker: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.8)",
    border: "1px solid rgba(191,219,254,0.9)",
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.03em",
  },
  logo: {
    width: "100%",
    maxWidth: 320,
    objectFit: "contain",
  },
  card: {
    width: "100%",
    boxSizing: "border-box",
    textAlign: "center",
    background: "rgba(255,255,255,0.94)",
    border: "1px solid rgba(226,232,240,0.9)",
    borderRadius: 28,
    padding: "clamp(16px, 5vw, 26px)",
    boxShadow: "0 24px 60px rgba(15,23,42,0.1)",
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: 800,
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  heading: {
    fontSize: "clamp(30px, 8vw, 34px)",
    fontWeight: 800,
    color: "#0f172a",
    margin: "12px 0 0",
    lineHeight: 1.1,
  },
  text: {
    fontSize: 16,
    color: "#475569",
    margin: "16px 0 0",
    lineHeight: 1.7,
  },
  featureGrid: {
    marginTop: 20,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10,
  },
  featurePill: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 46,
    padding: "10px 12px",
    borderRadius: 16,
    background: "rgba(248,250,252,0.95)",
    border: "1px solid rgba(226,232,240,0.92)",
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 700,
    boxSizing: "border-box",
  },
  featureIcon: {
    color: "#2563eb",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  imageWrap: {
    marginTop: 22,
    borderRadius: 22,
    overflow: "hidden",
    boxShadow: "0 18px 38px rgba(15,23,42,0.1)",
  },
  image: {
    width: "100%",
    display: "block",
    objectFit: "cover",
    aspectRatio: "16 / 11",
  },
  button: {
    width: "100%",
    marginTop: 22,
    boxSizing: "border-box",
    border: "none",
    borderRadius: 18,
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    padding: "16px 18px",
    fontSize: 17,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 16px 34px rgba(37,99,235,0.26)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  installCardWrap: {
    width: "100%",
  },
};
