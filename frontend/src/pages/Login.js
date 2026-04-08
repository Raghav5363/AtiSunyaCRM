import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      if (data.token) {
        localStorage.clear();
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role);
        localStorage.setItem("userId", data.id);
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Server error");
    }

    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <button style={styles.backButton} onClick={() => navigate("/")}>
        Back
      </button>

      <div style={styles.wrapper}>
        <img
          src="/InfratechLogo.png"
          alt="AtiSunya Infratech"
          style={styles.logo}
        />

        <div style={styles.card}>
          <h2 style={styles.title}>Welcome Back</h2>
          <p style={styles.subtitle}>Sign in to your CRM account</p>

          {error && <div style={styles.error}>{error}</div>}

          <form onSubmit={handleLogin}>
            <label style={styles.label}>Work Email</label>
            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />

            <label style={styles.label}>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />

            <button
              disabled={loading}
              style={{
                ...styles.button,
                opacity: loading ? 0.75 : 1,
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p style={styles.footer}>© 2026 AtiSunya Infratech</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #e0f2fe, #f8fafc)",
    fontFamily: "Inter, Segoe UI, sans-serif",
    padding: "20px",
    position: "relative",
  },
  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    color: "#2563eb",
    border: "none",
    background: "transparent",
  },
  wrapper: {
    width: "100%",
    maxWidth: "420px",
    textAlign: "center",
  },
  logo: {
    width: "100%",
    maxWidth: "230px",
    height: "auto",
    marginBottom: "22px",
    objectFit: "contain",
  },
  card: {
    background: "#ffffff",
    padding: "34px 28px",
    borderRadius: "16px",
    boxShadow: "0 16px 40px rgba(0,0,0,0.08)",
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    marginBottom: "6px",
    color: "#0f172a",
  },
  subtitle: {
    color: "#64748b",
    marginBottom: "24px",
    fontSize: "14px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "700",
    display: "block",
    marginBottom: "6px",
    textAlign: "left",
    color: "#334155",
  },
  input: {
    width: "100%",
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    marginBottom: "18px",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    background: "#ffffff",
  },
  button: {
    width: "100%",
    padding: "14px",
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
    fontSize: "15px",
    transition: "0.2s",
    boxShadow: "0 10px 24px rgba(37,99,235,0.2)",
  },
  error: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "10px",
    borderRadius: "8px",
    marginBottom: "15px",
    fontSize: "13px",
  },
  footer: {
    marginTop: "20px",
    fontSize: "12px",
    color: "#94a3b8",
  },
};

export default Login;