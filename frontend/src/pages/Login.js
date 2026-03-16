import React, { useState } from "react";

const BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* ===== LOGIN ===== */

  const handleLogin = async (e) => {

    e.preventDefault();

    setError("");
    setLoading(true);

    try {

      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
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

        window.location.href = "/dashboard";

      }

    } catch (err) {

      setError(err.message || "Server error");

    }

    setLoading(false);

  };

  return (

    <div style={styles.page}>

      <div style={styles.wrapper}>

        {/* LOGO */}

        <img
          src="/aspl-new-logo-1.jpg"
          alt="AtiSunya Infratech"
          style={styles.logo}
        />

        {/* LOGIN CARD */}

        <div style={styles.card}>

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
            © 2026 AtiSunya Infratech Pvt Ltd
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
background:"#f1f5f9",
fontFamily:"Inter, Segoe UI, sans-serif",
padding:"20px"
},

wrapper:{
width:"100%",
maxWidth:"420px",
textAlign:"center"
},

logo:{
height:"55px",
marginBottom:"20px",
objectFit:"contain"
},

card:{
background:"#ffffff",
padding:"32px",
borderRadius:"12px",
boxShadow:"0 10px 30px rgba(0,0,0,0.08)"
},

title:{
fontSize:"26px",
fontWeight:"600",
marginBottom:"6px"
},

subtitle:{
color:"#64748b",
marginBottom:"25px"
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
padding:"13px",
borderRadius:"8px",
border:"1px solid #d1d5db",
marginBottom:"18px",
fontSize:"14px"
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
marginTop:"5px"
},

error:{
background:"#fee2e2",
color:"#b91c1c",
padding:"10px",
borderRadius:"6px",
marginBottom:"15px"
},

footer:{
marginTop:"20px",
fontSize:"12px",
color:"#94a3b8"
}

};

export default Login;