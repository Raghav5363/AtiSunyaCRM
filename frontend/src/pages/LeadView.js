import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { FaPhoneAlt, FaWhatsapp, FaEnvelope, FaSms } from "react-icons/fa"; // ❌ FaEdit removed
import { FiArrowLeft } from "react-icons/fi";

export default function LeadView() {

const { id } = useParams();
const navigate = useNavigate();

const [lead,setLead] = useState(null);
const [activities,setActivities] = useState([]);

const [activityType,setActivityType] = useState("call");
const [activityDateTime,setActivityDateTime] = useState("");
const [outcome,setOutcome] = useState("");
const [notes,setNotes] = useState("");
const [nextFollowUpDate,setNextFollowUpDate] = useState("");

const token = localStorage.getItem("token");

const BASE_URL =
process.env.REACT_APP_API_URL || "http://localhost:5000";

const authConfig = useMemo(() => ({
headers:{ Authorization:`Bearer ${token}` }
}),[token]);

/* ================= LOAD DATA ================= */

const loadLead = useCallback(async()=>{
try{
const res = await axios.get(`${BASE_URL}/api/leads/${id}`,authConfig);
setLead(res.data);
}catch{
toast.error("Failed to load lead");
}
},[BASE_URL,id,authConfig]);

const loadActivities = useCallback(async()=>{
try{
const res = await axios.get(`${BASE_URL}/api/activities/${id}`,authConfig);
setActivities(res.data);
}catch{
toast.error("Failed to load activities");
}
},[BASE_URL,id,authConfig]);

useEffect(()=>{
loadLead();
loadActivities();
},[loadLead,loadActivities]);

/* ================= ADD ACTIVITY ================= */

const handleAddActivity = async()=>{

if(!activityDateTime || !outcome || !notes.trim()){
toast.error("Fill required fields");
return;
}

try{
const res = await axios.post(
`${BASE_URL}/api/activities/${id}`,
{ activityType, activityDateTime, outcome, notes, nextFollowUpDate },
authConfig
);

setActivities(prev=>[res.data,...prev]);

setOutcome("");
setNotes("");
setNextFollowUpDate("");
setActivityDateTime("");

toast.success("Activity Added ✔");
loadLead();

}catch{
toast.error("Error adding activity");
}
};

if(!lead) return <div style={{padding:40}}>Loading...</div>;

const cleanNumber = lead.phone ? lead.phone.replace(/\D/g,"") : "";

/* ================= FOLLOWUP STATUS ================= */

const getFollowUpStatus = (dateStr)=>{

if(!dateStr) return { label:"",color:"#ccc" };

const today = new Date();
today.setHours(0,0,0,0);

const d = new Date(dateStr);
d.setHours(0,0,0,0);

const diff = d - today;

if(diff === 0) return {label:"Today",color:"#ffc107"};
if(diff > 0) return {label:"Upcoming",color:"#17a2b8"};

return {label:"Past",color:"#6c757d"};

};

return (

<div style={styles.page}>

{/* BACK BUTTON */}
<div style={{marginBottom:"10px"}}>
<button onClick={()=>navigate(-1)} style={styles.backBtn}>
<FiArrowLeft/> Back
</button>
</div>

<div style={styles.container}>

{/* HEADER */}

<div style={styles.header}>

<h2 style={styles.name}>{lead.name}</h2>

{/* ICON ROW */}
<div style={styles.iconRow}>

<button onClick={()=>window.location.href=`tel:${lead.phone}`} style={styles.iconBtn}>
<FaPhoneAlt/>
</button>

<button onClick={()=>window.location.href=`sms:${lead.phone}`} style={styles.iconBtn}>
<FaSms/>
</button>

<a href={`mailto:${lead.email}`} style={styles.iconBtn}>
<FaEnvelope/>
</a>

<a
href={`https://wa.me/${cleanNumber}`}
target="_blank"
rel="noreferrer"
style={styles.whatsappBtn}
>
<FaWhatsapp/>
</a>

</div>

</div>

{/* DETAILS */}

<div style={styles.details}>

<p><b>Email:</b> {lead.email}</p>
<p><b>Phone:</b> {lead.phone}</p>

<p>
<b>Status:</b>
<span style={styles.status}>
{lead.status?.replace(/_/g," ")}
</span>
</p>

<p>
<b>Assigned To:</b>
{lead.assignedTo?.email || "Unassigned"}
</p>

<p>
<b>Created By:</b>
{lead.createdBy?.email || "N/A"}

{lead.createdBy?.role && (
<span style={styles.roleBadge}>
{lead.createdBy.role}
</span>
)}

</p>

<p>
<b>Created On:</b>
{new Date(lead.createdAt).toLocaleDateString()}
</p>

</div>

{/* ADD ACTIVITY */}

<div style={styles.card}>
<h3 style={{marginBottom:15}}>Add Activity</h3>

<label style={styles.label}>Activity Type</label>
<select value={activityType} onChange={(e)=>setActivityType(e.target.value)} style={styles.input}>
<option value="call">Call</option>
<option value="whatsapp">WhatsApp</option>
<option value="email">Email</option>
<option value="meeting">Meeting</option>
</select>

<label style={styles.label}>Activity Date & Time</label>
<input type="datetime-local" value={activityDateTime} onChange={(e)=>setActivityDateTime(e.target.value)} style={styles.input}/>

<label style={styles.label}>Outcome</label>
<select value={outcome} onChange={(e)=>setOutcome(e.target.value)} style={styles.input}>
<option value="">Select Result</option>
<option>Connected</option>
<option>Not Picked</option>
<option>Busy</option>
<option>Switch Off</option>
</select>

<label style={styles.label}>Notes</label>
<textarea value={notes} onChange={(e)=>setNotes(e.target.value)} style={styles.input}/>

<label style={styles.label}>Next Follow Up Date</label>
<input type="date" value={nextFollowUpDate} onChange={(e)=>setNextFollowUpDate(e.target.value)} style={styles.input}/>

<button onClick={handleAddActivity} style={styles.button}>
Add Activity
</button>

</div>

{/* TIMELINE */}

<div style={{marginTop:30}}>
<h3>Activity Timeline</h3>

{activities.length===0 ? (
<p>No activities yet</p>
) : (
activities.map((a)=>{

const followUp = getFollowUpStatus(a.nextFollowUpDate);

return(
<div key={a._id} style={styles.timeline}>

<div style={styles.timelineHeader}>

<b style={{textTransform:"capitalize"}}>
{a.activityType}
</b>

<div style={styles.timelineRight}>
<span>{a.outcome}</span>

{a.nextFollowUpDate && (
<span style={{...styles.followUpLabel, backgroundColor:followUp.color}}>
{followUp.label} : {new Date(a.nextFollowUpDate).toLocaleDateString()}
</span>
)}

</div>

</div>

<p style={styles.notes}>{a.notes}</p>

<div style={styles.time}>
{new Date(a.activityDateTime).toLocaleString()}
</div>

</div>
)

})
)}

</div>

</div>
</div>
);
}

/* ================= STYLES ================= */

const styles = {

page:{ background:"#f4f6f9", minHeight:"100vh", padding:"20px" },

container:{
maxWidth:"900px",
margin:"auto",
background:"#fff",
padding:"25px",
borderRadius:"10px",
boxShadow:"0 4px 15px rgba(0,0,0,0.08)"
},

header:{
display:"flex",
justifyContent:"space-between",
alignItems:"center",
flexWrap:"wrap", // ✅ mobile fix
gap:"10px",
marginBottom:"20px"
},

iconRow:{
display:"flex",
gap:"10px",
flexWrap:"wrap" // ✅ mobile fix
},

name:{ margin:0 },

iconBtn:{
width:"42px",
height:"42px",
borderRadius:"10px",
border:"none",
background:"#f1f5f9",
display:"flex",
alignItems:"center",
justifyContent:"center",
cursor:"pointer"
},

whatsappBtn:{
width:"42px",
height:"42px",
borderRadius:"10px",
background:"#25D366",
color:"#fff",
display:"flex",
alignItems:"center",
justifyContent:"center",
textDecoration:"none"
},

backBtn:{
display:"flex",
alignItems:"center",
gap:"6px",
border:"none",
background:"transparent",
cursor:"pointer",
fontSize:"14px",
color:"#2563eb",
fontWeight:"500"
},

details:{ marginBottom:"30px", lineHeight:"1.8" },

status:{
background:"#e8f0ff",
padding:"4px 8px",
borderRadius:"6px",
marginLeft:"5px",
fontSize:"13px"
},

roleBadge:{
marginLeft:"8px",
background:"#eef2ff",
padding:"3px 6px",
borderRadius:"6px",
fontSize:"12px"
},

card:{ border:"1px solid #eee", padding:"20px", borderRadius:"8px" },

label:{ fontWeight:"600", marginTop:"10px", display:"block" },

input:{
width:"100%",
padding:"10px",
marginTop:"5px",
marginBottom:"10px",
border:"1px solid #ccc",
borderRadius:"6px"
},

button:{
background:"#2563eb",
color:"#fff",
border:"none",
padding:"10px",
borderRadius:"6px",
cursor:"pointer"
},

timeline:{
borderLeft:"3px solid #2563eb",
paddingLeft:"15px",
marginBottom:"20px"
},

timelineHeader:{
display:"flex",
justifyContent:"space-between",
flexWrap:"wrap", // ✅ mobile fix
gap:"8px"
},

timelineRight:{
display:"flex",
gap:"8px",
flexWrap:"wrap", // ✅ mobile fix
alignItems:"center"
},

followUpLabel:{
color:"#fff",
padding:"3px 6px",
borderRadius:"4px",
fontSize:"12px"
},

notes:{ margin:"5px 0" },

time:{ fontSize:"12px", color:"#777" }

};