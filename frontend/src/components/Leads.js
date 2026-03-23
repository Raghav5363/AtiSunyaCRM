import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import DeletePopup from "./DeletePopup";
import { useNavigate, useLocation } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

export default function Leads() {

const [leads,setLeads] = useState([]);
const [search,setSearch] = useState("");
const [filterStatus,setFilterStatus] = useState("all");

const [showDeletePopup,setShowDeletePopup] = useState(false);
const [selectedLeadId,setSelectedLeadId] = useState(null);

const navigate = useNavigate();
const location = useLocation();

const token = localStorage.getItem("token");

const BASE_URL =
process.env.REACT_APP_API_URL || "http://localhost:5000";

const API = `${BASE_URL}/api/leads`;

/* ===== URL FILTER ===== */

useEffect(() => {
const params = new URLSearchParams(location.search);
const status = params.get("status");
setFilterStatus(status || "all");
}, [location.search]);

/* ===== FETCH ===== */

const fetchLeads = useCallback(async ()=>{
try{

let url = API;

if(filterStatus !== "all"){
url += `?status=${filterStatus}`;
}

const res = await axios.get(url,{
headers:{ Authorization:`Bearer ${token}` }
});

setLeads(res.data);

}catch{
toast.error("Failed to load leads");
}
},[API,token,filterStatus]);

useEffect(()=>{
fetchLeads();
},[fetchLeads]);

/* ===== DELETE (hidden UI but working) ===== */

const handleDeleteClick = (id)=>{
setSelectedLeadId(id);
setShowDeletePopup(true);
};

const handleConfirmDelete = async()=>{
try{

await axios.delete(`${API}/${selectedLeadId}`,{
headers:{ Authorization:`Bearer ${token}` }
});

toast.success("Lead deleted ✔");

setLeads(prev =>
prev.filter(l => l._id !== selectedLeadId)
);

}catch{
toast.error("Delete failed");
}

setShowDeletePopup(false);
setSelectedLeadId(null);
};

/* ===== FILTER ===== */

const filteredLeads = leads.filter((lead)=>{

const s = search.toLowerCase();

return (
lead.name?.toLowerCase().includes(s) ||
lead.email?.toLowerCase().includes(s) ||
lead.phone?.toLowerCase().includes(s)
);

});

/* ===== FILTER BUTTON STYLE ===== */

const btnStyle = (status)=>({

padding:"6px 12px",
marginRight:10,
marginBottom:8,
borderRadius:6,
cursor:"pointer",
border:"1px solid #d1d5db",
background: filterStatus===status ? "#eef2ff" : "white",
fontWeight: filterStatus===status ? "600" : "400"

});

return (

<div className="card">

{/* BACK BUTTON */}
<div style={{ marginBottom: "12px" }}>
<button
onClick={() => navigate(-1)}
style={{
display: "flex",
alignItems: "center",
gap: "6px",
border: "none",
background: "transparent",
cursor: "pointer",
fontSize: "13px",
color: "#2563eb",
fontWeight: "500"
}}
>
<FiArrowLeft /> Back
</button>
</div>

{/* SEARCH */}
<input
type="text"
placeholder="Search leads..."
value={search}
onChange={(e)=>setSearch(e.target.value)}
style={{
marginBottom:15,
maxWidth:260,
padding:"8px",
borderRadius:"6px",
border:"1px solid #ccc",
fontSize:"13px"
}}
/>

{/* FILTERS */}
<div style={{marginBottom:20,flexWrap:"wrap"}}>

<button onClick={()=>navigate("/leads")} style={btnStyle("all")}>All</button>
<button onClick={()=>navigate("/leads?status=new")} style={btnStyle("new")}>New</button>
<button onClick={()=>navigate("/leads?status=followup")} style={btnStyle("followup")}>Follow Up</button>
<button onClick={()=>navigate("/leads?status=not_interested")} style={btnStyle("not_interested")}>Not Interested</button>
<button onClick={()=>navigate("/leads?status=junk")} style={btnStyle("junk")}>Junk</button>
<button onClick={()=>navigate("/leads?status=closed")} style={btnStyle("closed")}>Closed</button>
<button onClick={()=>navigate("/leads?status=site_visit_planned")} style={btnStyle("site_visit_planned")}>Site Visit Planned</button>
<button onClick={()=>navigate("/leads?status=site_visit_done")} style={btnStyle("site_visit_done")}>Site Visit Done</button>

</div>

{/* TABLE */}
<div style={styles.tableWrapper}>

<table style={styles.table}>

<thead>
<tr>
<th style={styles.th}>Name</th>
<th style={styles.th}>Contact</th>
<th style={styles.th}>Status</th>
<th style={styles.th}>Assigned</th>
</tr>
</thead>

<tbody>

{filteredLeads.map((lead)=>(

<tr key={lead._id} style={styles.row}>

{/* NAME */}
<td
style={styles.name}
onClick={()=>navigate(`/lead/${lead._id}`)}
>
{lead.name}
</td>

{/* CONTACT ICONS */}
<td style={styles.contactCell}>

<span
style={styles.iconBtn}
onClick={()=>navigate(`/lead/${lead._id}`)}
title="Call"
>
📞
</span>

<span
style={styles.iconBtn}
onClick={()=>navigate(`/lead/${lead._id}`)}
title="Email"
>
✉️
</span>

</td>

{/* STATUS */}
<td>
<span style={styles.status}>
{lead.status?.replace(/_/g," ")}
</span>
</td>

{/* ASSIGNED */}
<td style={styles.assigned}>
{lead.assignedTo?.email || "Unassigned"}
</td>

</tr>

))}

</tbody>

</table>

</div>

{/* DELETE POPUP (hidden but working) */}
<DeletePopup
open={showDeletePopup}
onClose={()=>setShowDeletePopup(false)}
onConfirm={handleConfirmDelete}
/>

</div>

);
}

/* ================= STYLES ================= */

const styles = {

tableWrapper:{
overflowX:"auto",
borderRadius:"10px",
background:"#fff",
boxShadow:"0 2px 10px rgba(0,0,0,0.05)"
},

table:{
width:"100%",
borderCollapse:"collapse",
fontSize:"14px"
},

th:{
textAlign:"left",
padding:"12px",
background:"#f9fafb",
fontWeight:"600",
fontSize:"13px",
color:"#374151"
},

row:{
borderBottom:"1px solid #eee"
},

name:{
cursor:"pointer",
color:"#2563eb",
fontWeight:"500",
padding:"12px",
fontSize:"14px"
},

contactCell:{
display:"flex",
gap:"8px",
alignItems:"center",
padding:"10px"
},

iconBtn:{
width:"32px",
height:"32px",
display:"flex",
alignItems:"center",
justifyContent:"center",
background:"#f1f5f9",
borderRadius:"6px",
cursor:"pointer",
fontSize:"14px",
transition:"0.2s"
},

status:{
background:"#eef2ff",
padding:"3px 8px",
borderRadius:"20px",
fontSize:"12px",
textTransform:"capitalize"
},

assigned:{
fontSize:"13px",
color:"#555",
padding:"12px"
}

};