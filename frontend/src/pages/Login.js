import React, { useState, useEffect } from "react";

const BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  /* ===== SCREEN CHECK ===== */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        `${BASE_URL}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      if (data.token) {
        localStorage.clear();
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role);
        localStorage.setItem("userId", data.id);
        window.location.href = "/";
      }
    } catch (err) {
      setError(err.message || "Server error");
    }

    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <img src="InfratechLogo.png" alt="logo" style={styles.logo} />
      </div>

      <div
        style={{
          ...styles.container,
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        {!isMobile && (
          <div style={styles.left}>
            <h1 style={styles.heading}>
              Manage your sales smarter
            </h1>

            <p style={styles.text}>
              AtiSunya CRM helps your team track leads,
              close deals faster and grow revenue —
              all in one simple platform.
            </p>

            <img
              src="https://images.unsplash.com/photo-1552664730-d307ca884978"
              alt=""
              style={styles.image}
            />
          </div>
        )}

        <div style={styles.right}>
          <div
            style={{
              ...styles.card,
              width: isMobile ? "95%" : 380,
              padding: isMobile ? 25 : 40,
            }}
          >
            <h2 style={styles.title}>Sign in</h2>
            <p style={styles.subtitle}>
              Welcome back! Please login
            </p>

            {error && (
              <div style={styles.error}>{error}</div>
            )}

            <form onSubmit={handleLogin}>
              <label style={styles.label}>
                Work Email
              </label>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.input}
              />

              <label style={styles.label}>
                Password
              </label>
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
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p style={styles.footer}>
              © 2026 AtiSunya Infratech Pvt Ltd
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- SAME CSS ---- */

const styles = {
  page: {
    height: "100vh",
    fontFamily: "Inter, Segoe UI, sans-serif",
    background: "#f1f5f9",
  },
  topbar: {
    height: 65,
    display: "flex",
    alignItems: "center",
    padding: "0 30px",
    background: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
  },
  logo: { height: 45 },
  container: {
    display: "flex",
    height: "calc(100vh - 65px)",
  },
  left: {
    flex: 1,
    padding: "80px",
    background: "#ffffff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  heading: {
    fontSize: 42,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    color: "#475569",
    maxWidth: 500,
    lineHeight: 1.6,
    marginBottom: 40,
  },
  image: {
    width: 420,
    borderRadius: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  },
  right: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    background: "#ffffff",
    borderRadius: 14,
    boxShadow: "0 20px 40px rgba(0,0,0,0.06)",
  },
  title: { fontSize: 26, fontWeight: 600, marginBottom: 8 },
  subtitle: { color: "#64748b", marginBottom: 25 },
  label: {
    fontSize: 14,
    fontWeight: 600,
    display: "block",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: 13,
    borderRadius: 8,
    border: "1px solid #d1d5db",
    marginBottom: 18,
    fontSize: 14,
  },
  button: {
    width: "100%",
    padding: 14,
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 15,
    marginTop: 10,
  },
  error: {
    background: "#fef2f2",
    color: "#dc2626",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  footer: {
    textAlign: "center",
    marginTop: 25,
    fontSize: 12,
    color: "#94a3b8",
  },
};

export default Login;
