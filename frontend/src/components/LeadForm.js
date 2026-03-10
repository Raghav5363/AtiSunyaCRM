import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

const BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

const API_URL = `${BASE_URL}/api/leads`;

export default function LeadForm() {

const navigate = useNavigate();
const { id } = useParams();
const isEdit = Boolean(id);

const [name,setName]=useState("");
const [email,setEmail]=useState("");
const [phone,setPhone]=useState("");
const [status,setStatus]=useState("new");
const [source,setSource]=useState("");
const [assignedTo,setAssignedTo]=useState("");

const [salesAgents,setSalesAgents]=useState([]);

const [emailError,setEmailError]=useState("");
const [phoneError,setPhoneError]=useState("");
const [apiMsg,setApiMsg]=useState("");
const [loading,setLoading]=useState(false);

const authConfig=()=>({
headers:{
Authorization:`Bearer ${localStorage.getItem("token")}`
}
});

/* =========================
   LOAD SALES AGENTS
========================= */

useEffect(()=>{

axios
.get(`${BASE_URL}/api/users/sales-agents`,authConfig())
.then(res=>setSalesAgents(res.data))
.catch(()=>{});

},[]);

/* =========================
   LOAD LEAD (EDIT MODE)
========================= */

useEffect(()=>{

if(!isEdit) return;

setLoading(true);

axios.get(`${API_URL}/${id}`,authConfig())

.then(res=>{

const lead=res.data;

setName(lead.name||"");
setEmail(lead.email||"");
setPhone(lead.phone||"");
setStatus(lead.status||"new");
setSource(lead.source||"");
setAssignedTo(lead.assignedTo?._id||"");

})

.catch(err=>{
setApiMsg(err?.response?.data?.message || "Failed to load lead");
})

.finally(()=>setLoading(false));

},[id,isEdit]);

/* =========================
   EMAIL VALIDATION
========================= */

useEffect(()=>{

if(!email) return setEmailError("");

const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if(!emailRegex.test(email)){
setEmailError("Enter valid email");
}else{
setEmailError("");
}

},[email]);

/* =========================
   PHONE VALIDATION
========================= */

useEffect(()=>{

if(!phone) return setPhoneError("");

const cleaned=phone.replace(/\D/g,"");

if(!/^\d{10}$/.test(cleaned)){
setPhoneError("Phone must be 10 digits");
}else{
setPhoneError("");
}

},[phone]);

/* =========================
   FORM VALIDATION
========================= */

const isFormValid=()=>{

if(!name.trim()) return false;
if(!email.trim() || emailError) return false;
if(!phone.trim() || phoneError) return false;

return true;

};

/* =========================
   SUBMIT
========================= */

const handleSubmit=async(e)=>{

e.preventDefault();

setApiMsg("");

if(!isFormValid()){
setApiMsg("Please fix errors");
return;
}

const payload={

name:name.trim(),
email:email.trim(),
phone:phone.replace(/\D/g,""),
status,
source,
assignedTo:assignedTo || null

};

try{

setLoading(true);

if(isEdit){

await axios.put(`${API_URL}/${id}`,payload,authConfig());
toast.success("Lead updated");

}else{

await axios.post(API_URL,payload,authConfig());
toast.success("Lead created");

}

navigate("/");

}catch(err){

console.error(err);

setApiMsg(err?.response?.data?.message || "Failed to save lead");

}finally{

setLoading(false);

}

};

return(

<div style={styles.page}>

<div style={styles.card}>

<h2 style={styles.title}>
{isEdit ? "Edit Lead" : "Add New Lead"}
</h2>

{apiMsg && <div style={styles.apiError}>{apiMsg}</div>}

<form onSubmit={handleSubmit}>

<div style={styles.grid}>

<Field label="Full Name *">
<input
value={name}
onChange={e=>setName(e.target.value)}
style={styles.input}
/>
</Field>

<Field label="Email *">
<input
value={email}
onChange={e=>setEmail(e.target.value)}
style={{
...styles.input,
borderColor:emailError ? "#e53935":"#ddd"
}}
/>
{emailError && <Error text={emailError}/>}
</Field>

<Field label="Phone *">
<input
value={phone}
onChange={e=>setPhone(e.target.value)}
style={{
...styles.input,
borderColor:phoneError ? "#e53935":"#ddd"
}}
/>
{phoneError && <Error text={phoneError}/>}
</Field>

<Field label="Lead Status">

<select
value={status}
onChange={e=>setStatus(e.target.value)}
style={styles.input}
>

<option value="new">New</option>
<option value="followup">Follow Up</option>
<option value="not_interested">Not Interested</option>
<option value="junk">Junk</option>
<option value="closed">Closed</option>
<option value="site_visit_planned">Site Visit Planned</option>
<option value="site_visit_done">Site Visit Done</option>

</select>

</Field>

<Field label="Assigned To">

<select
value={assignedTo}
onChange={e=>setAssignedTo(e.target.value)}
style={styles.input}
>

<option value="">Unassigned</option>

{salesAgents.map(agent=>(
<option key={agent._id} value={agent._id}>
{agent.email}
</option>
))}

</select>

</Field>

<Field label="Lead Source">

<select
value={source}
onChange={e=>setSource(e.target.value)}
style={styles.input}
>

<option value="">Select Source</option>
<option value="website">Website</option>
<option value="facebook">Facebook</option>
<option value="google">Google</option>
<option value="whatsapp">Whatsapp</option>
<option value="reference">Reference</option>
<option value="other">Other</option>

</select>

</Field>

</div>

<div style={styles.buttonWrap}>

<button
type="submit"
disabled={!isFormValid() || loading}
style={{
...styles.button,
opacity:!isFormValid()?0.6:1
}}
>

{loading ? "Saving..." : isEdit ? "Update Lead":"Create Lead"}

</button>

</div>

</form>

</div>

</div>

);

}

/* SMALL COMPONENTS */

function Field({label,children}){

return(

<div style={styles.field}>
<label style={styles.label}>{label}</label>
{children}
</div>

)

}

function Error({text}){
return <div style={styles.error}>{text}</div>
}

/* STYLES */

const styles={

page:{
minHeight:"100vh",
padding:"20px 15px",
display:"flex",
justifyContent:"center",
background:"#f5f7fb"
},

card:{
width:"100%",
maxWidth:"850px",
background:"#fff",
padding:"25px",
borderRadius:"10px",
boxShadow:"0 4px 14px rgba(0,0,0,0.08)"
},

title:{
marginBottom:"20px"
},

grid:{
display:"grid",
gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
gap:"16px"
},

field:{
display:"flex",
flexDirection:"column"
},

label:{
fontSize:"13px",
fontWeight:"600",
marginBottom:"5px"
},

input:{
width:"100%",
padding:"10px",
borderRadius:"6px",
border:"1px solid #ddd",
fontSize:"14px",
boxSizing:"border-box"
},

buttonWrap:{
marginTop:"20px",
display:"flex",
justifyContent:"flex-end"
},

button:{
background:"#2563eb",
color:"#fff",
border:"none",
padding:"10px 18px",
borderRadius:"6px",
fontWeight:"600",
cursor:"pointer"
},

error:{
color:"#e53935",
fontSize:"12px",
marginTop:"3px"
},

apiError:{
background:"#ffeaea",
padding:"10px",
marginBottom:"12px",
borderRadius:"6px",
color:"#d32f2f"
}

};