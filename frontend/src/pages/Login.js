import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowRight, FiLock, FiMail, FiShield } from "react-icons/fi";
import PwaInstallCard from "../components/PwaInstallCard";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function isTokenValid(token) {
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload?.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCompact, setIsCompact] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 980 : false
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (isTokenValid(token)) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const handleResize = () => {
      setIsCompact(window.innerWidth < 980);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      if (!data.token) {
        throw new Error("Token not received from server");
      }

      localStorage.clear();
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role || "");
      localStorage.setItem("userId", data.id || "");

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to sign in right now");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.ambientGlowTop} />
      <div style={styles.ambientGlowBottom} />

      <div style={{ ...styles.shell, ...(isCompact ? styles.shellCompact : null) }}>
        <section style={{ ...styles.brandPanel, ...(isCompact ? styles.brandPanelCompact : null) }}>
          <div style={styles.brandBadge}>
            <FiShield />
            <span>AtiSunya CRM</span>
          </div>

          <img
            src="/Atisunya.brand.png"
            alt="AtiSunya CRM"
            style={styles.logo}
          />

          <h1 style={styles.heading}>Lead operations that feel clean, fast, and ready for work.</h1>
          <p style={styles.description}>
            Sign in to manage leads, follow-ups, reminders, site visits, reports, and team activity
            from one professional workspace.
          </p>

          <div style={styles.highlights}>
            <div style={styles.highlightItem}>Real-time follow-up workflow</div>
            <div style={styles.highlightItem}>Reports and role-based dashboards</div>
            <div style={styles.highlightItem}>Install directly on mobile as an app</div>
          </div>

          <div style={styles.installWrap}>
            <PwaInstallCard compact />
          </div>

          <Link to="/welcome" style={styles.secondaryLink}>
            View welcome screen
          </Link>
        </section>

        <section style={{ ...styles.formPanel, ...(isCompact ? styles.formPanelCompact : null) }}>
          <div style={{ ...styles.formCard, ...(isCompact ? styles.formCardCompact : null) }}>
            <div style={styles.formEyebrow}>Secure sign in</div>
            <h2 style={styles.formTitle}>Welcome back</h2>
            <p style={styles.formSubtitle}>Use your company credentials to access the CRM dashboard.</p>

            {error ? <div style={styles.error}>{error}</div> : null}

            <form onSubmit={handleLogin} style={styles.form}>
              <label style={styles.label} htmlFor="email">
                Work email
              </label>
              <div style={styles.inputWrap}>
                <FiMail style={styles.inputIcon} />
                <input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  style={styles.input}
                />
              </div>

              <label style={styles.label} htmlFor="password">
                Password
              </label>
              <div style={styles.inputWrap}>
                <FiLock style={styles.inputIcon} />
                <input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                  style={styles.input}
                />
              </div>

              <button type="submit" disabled={loading} style={styles.button}>
                <span>{loading ? "Signing in..." : "Sign in to CRM"}</span>
                {!loading ? <FiArrowRight /> : null}
              </button>
            </form>

            <div style={styles.footer}>
              <span>Protected workspace for AtiSunya Infratech teams</span>
              <span>(c) 2026</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100dvh",
    position: "relative",
    overflow: "hidden",
    background:
      "linear-gradient(145deg, #f3f7fb 0%, #e7eef7 42%, #f8fafc 100%)",
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    padding: "24px",
  },
  ambientGlowTop: {
    position: "absolute",
    top: -120,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(29,78,216,0.18), transparent 70%)",
    pointerEvents: "none",
  },
  ambientGlowBottom: {
    position: "absolute",
    right: -120,
    bottom: -140,
    width: 360,
    height: 360,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(15,118,110,0.14), transparent 70%)",
    pointerEvents: "none",
  },
  shell: {
    position: "relative",
    zIndex: 1,
    maxWidth: 1180,
    minHeight: "calc(100dvh - 48px)",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.08fr) minmax(360px, 0.92fr)",
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(255,255,255,0.7)",
    borderRadius: 32,
    boxShadow: "0 28px 80px rgba(15,23,42,0.12)",
    backdropFilter: "blur(18px)",
    overflow: "hidden",
  },
  shellCompact: {
    minHeight: "auto",
    gridTemplateColumns: "minmax(0, 1fr)",
  },
  brandPanel: {
    padding: "48px 46px",
    background:
      "linear-gradient(160deg, rgba(255,255,255,0.72) 0%, rgba(219,234,254,0.7) 100%)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  brandPanelCompact: {
    padding: "32px 22px 18px",
  },
  brandBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    width: "fit-content",
    padding: "8px 14px",
    borderRadius: 999,
    background: "#e0ecff",
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  logo: {
    width: "100%",
    maxWidth: 280,
    marginTop: 28,
    objectFit: "contain",
  },
  heading: {
    margin: "30px 0 0",
    fontSize: 48,
    lineHeight: 1.02,
    letterSpacing: "-0.04em",
    color: "#0f172a",
    fontWeight: 900,
    maxWidth: 600,
  },
  description: {
    margin: "20px 0 0",
    maxWidth: 560,
    fontSize: 17,
    lineHeight: 1.7,
    color: "#475569",
  },
  highlights: {
    display: "grid",
    gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
    gap: 12,
    marginTop: 28,
    maxWidth: 520,
  },
  highlightItem: {
    padding: "14px 16px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(148,163,184,0.18)",
    boxShadow: "0 10px 22px rgba(15,23,42,0.05)",
    color: "#1e293b",
    fontSize: 14,
    fontWeight: 700,
  },
  installWrap: {
    maxWidth: 460,
    marginTop: 28,
  },
  secondaryLink: {
    marginTop: 20,
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 700,
    textDecoration: "none",
    opacity: 0.8,
  },
  formPanel: {
    padding: "40px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(180deg, rgba(248,250,252,0.94) 0%, rgba(255,255,255,0.98) 100%)",
  },
  formPanelCompact: {
    padding: "8px 18px 24px",
  },
  formCard: {
    width: "100%",
    maxWidth: 430,
    background: "#ffffff",
    borderRadius: 28,
    padding: "34px 30px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 24px 56px rgba(15,23,42,0.1)",
  },
  formCardCompact: {
    maxWidth: "100%",
    padding: "28px 20px",
  },
  formEyebrow: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#0f766e",
  },
  formTitle: {
    margin: "12px 0 0",
    fontSize: 32,
    lineHeight: 1.05,
    color: "#0f172a",
    fontWeight: 900,
  },
  formSubtitle: {
    margin: "12px 0 0",
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.65,
  },
  error: {
    marginTop: 18,
    padding: "12px 14px",
    borderRadius: 14,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: 600,
  },
  form: {
    marginTop: 24,
  },
  label: {
    display: "block",
    marginBottom: 8,
    color: "#334155",
    fontSize: 13,
    fontWeight: 800,
  },
  inputWrap: {
    position: "relative",
    marginBottom: 18,
  },
  inputIcon: {
    position: "absolute",
    top: "50%",
    left: 14,
    transform: "translateY(-50%)",
    color: "#64748b",
    fontSize: 17,
    pointerEvents: "none",
  },
  input: {
    width: "100%",
    minHeight: 56,
    padding: "16px 16px 16px 44px",
    borderRadius: 16,
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#0f172a",
    fontSize: 15,
    outline: "none",
  },
  button: {
    width: "100%",
    minHeight: 56,
    marginTop: 8,
    border: "none",
    borderRadius: 16,
    background: "linear-gradient(135deg, #0f172a, #1d4ed8)",
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 800,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    cursor: "pointer",
    boxShadow: "0 16px 34px rgba(29,78,216,0.24)",
    transition: "transform 0.18s ease, opacity 0.18s ease",
  },
  footer: {
    marginTop: 18,
    paddingTop: 18,
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    color: "#94a3b8",
    fontSize: 12,
    flexWrap: "wrap",
  },
};
