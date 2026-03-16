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

        /* REDIRECT */
        window.location.href = "/dashboard";

      }

    } catch (err) {

      setError(err.message || "Server error");

    }

    setLoading(false);

  };

  return (

    <div style={styles.page}>

      {/* TOP LOGO */}

      <div style={styles.topbar}>
        <img
          src="/InfratechLogo.png"
          alt="AtiSunya Infratech"
          style={styles.logo}
        />
      </div>


      {/* LOGIN AREA */}

      <div style={styles.container}>

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
fontFamily:"Inter, Segoe UI, sans-serif",
background:"#f1f5f9"
},

topbar:{
height:60,
display:"flex",
alignItems:"center",
justifyContent:"center",
background:"#ffffff",
borderBottom:"1px solid #e5e7eb",
padding:"5px 0"
},

logo:{
height:40,
objectFit:"contain"
},

container:{
minHeight:"calc(100vh - 60px)",
display:"flex",
justifyContent:"center",
alignItems:"flex-start",
paddingTop:40
},

card:{
background:"#ffffff",
padding:35,
borderRadius:12,
width:380,
boxShadow:"0 10px 30px rgba(0,0,0,0.08)"
},

title:{
fontSize:26,
fontWeight:600,
marginBottom:8
},

subtitle:{
color:"#64748b",
marginBottom:25
},

label:{
fontSize:14,
fontWeight:600,
display:"block",
marginBottom:6
},

input:{
width:"100%",
padding:13,
borderRadius:8,
border:"1px solid #d1d5db",
marginBottom:18,
fontSize:14
},

button:{
width:"100%",
padding:14,
background:"#2563eb",
color:"white",
border:"none",
borderRadius:8,
fontWeight:600,
cursor:"pointer",
fontSize:15,
marginTop:10
},

error:{
background:"#fef2f2",
color:"#dc2626",
padding:12,
borderRadius:8,
marginBottom:15
},

footer:{
textAlign:"center",
marginTop:25,
fontSize:12,
color:"#94a3b8"
}

};

export default Login;