import React from "react";
import { useNavigate } from "react-router-dom";

export default function MobileIntro() {

const navigate = useNavigate();

return (

<div style={styles.page}>

<img
src="/aspl-new-logo-1.jpg"
alt="AtiSunya"
style={styles.logo}
/>

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
alt="crm"
style={styles.image}
/>

<button
style={styles.button}
onClick={()=>navigate("/login")}
>
Start Now
</button>

</div>

);

}

const styles = {

page:{
height:"100vh",
display:"flex",
flexDirection:"column",
alignItems:"center",
justifyContent:"center",
background:"#f8fafc",
textAlign:"center",
padding:20
},

logo:{
width:170,
marginBottom:20
},

heading:{
fontSize:30,
fontWeight:700,
color:"#0f172a",
marginBottom:10
},

text:{
fontSize:15,
color:"#475569",
maxWidth:420,
marginBottom:30
},

image:{
width:"90%",
maxWidth:350,
borderRadius:14,
marginBottom:40
},

button:{
background:"#2563eb",
color:"#fff",
border:"none",
padding:"14px 30px",
borderRadius:10,
fontSize:16,
fontWeight:600,
cursor:"pointer"
}

};