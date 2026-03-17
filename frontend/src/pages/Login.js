import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

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

      {/* BACK BUTTON */}
      <div style={styles.backButton} onClick={() => navigate("/")}>
        ← Back
      </div>

      <div style={styles.wrapper}>

        {/* LOGO (BIGGER & CENTERED) */}
        <img
          src="/InfratechLogo.png"
          alt="AtiSunya Infratech"
          style={styles.logo}
        />

        {/* LOGIN CARD */}
        <div style={styles.card}>

          <h2 style={styles.title}>Welcome Back</h2>

          <p style={styles.subtitle}>
            Sign in to your CRM account
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
              onChange={(e)=>setEmail(e.target.value)}
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
              onChange={(e)=>setPassword(e.target.value)}
              required
              style={styles.input}
            />

            <button
              disabled={loading}
              style={{
                ...styles.button,
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

          </form>

          <p style={styles.footer}>
            © 2026 AtiSunya Pvt Ltd
          </p>

        </div>

      </div>

    </div>

  );

}

/* ===== STYLES ===== */

const styles = {

page:{
minHeight:"100vh",
display:"flex",
justifyContent:"center",
alignItems:"center",
background:"linear-gradient(135deg, #e0f2fe, #f8fafc)",
fontFamily:"Inter, Segoe UI, sans-serif",
padding:"20px",
position:"relative"
},

backButton:{
position:"absolute",
top:20,
left:20,
cursor:"pointer",
fontSize:15,
fontWeight:600,
color:"#2563eb"
},

wrapper:{
width:"100%",
maxWidth:"420px",
textAlign:"center"
},

/* 🔥 BIGGER LOGO */
logo:{
width:"100%",
maxWidth:"240px",
height:"auto",
marginBottom:"25px",
objectFit:"contain"
},

card:{
background:"#ffffff",
padding:"36px",
borderRadius:"14px",
boxShadow:"0 15px 40px rgba(0,0,0,0.08)"
},

title:{
fontSize:"28px",
fontWeight:"600",
marginBottom:"5px"
},

subtitle:{
color:"#64748b",
marginBottom:"25px",
fontSize:"14px"
},

label:{
fontSize:"14px",
fontWeight:"600",
display:"block",
marginBottom:"6px",
textAlign:"left"
},

input:{
width:"100%",
padding:"14px",
borderRadius:"8px",
border:"1px solid #d1d5db",
marginBottom:"18px",
fontSize:"14px",
outline:"none"
},

button:{
width:"100%",
padding:"14px",
background:"#2563eb",
color:"#ffffff",
border:"none",
borderRadius:"8px",
fontWeight:"600",
cursor:"pointer",
fontSize:"15px",
transition:"0.2s"
},

error:{
background:"#fee2e2",
color:"#b91c1c",
padding:"10px",
borderRadius:"6px",
marginBottom:"15px",
fontSize:"13px"
},

footer:{
marginTop:"22px",
fontSize:"12px",
color:"#94a3b8"
}

};

export default Login;