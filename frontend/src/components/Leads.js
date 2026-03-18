import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import DeletePopup from "./DeletePopup";
import { useNavigate, useLocation } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi"; // ✅ ADDED

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


/* ===== TOKEN DECODE ===== */

let user = null;

try{
user = token ? JSON.parse(atob(token.split(".")[1])) : null;
}catch{
user = null;
}

const role = user?.role;

const isAdmin = role === "admin";
const isManager = role === "sales_manager";

const canEdit = isAdmin || isManager;
const canDelete = isAdmin;


/* ===== 🔥 URL FILTER SYNC ===== */

useEffect(() => {
const params = new URLSearchParams(location.search);
const status = params.get("status");

if (status) {
setFilterStatus(status);
} else {
setFilterStatus("all");
}
}, [location.search]);


/* ===== FETCH LEADS ===== */

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



/* ===== DELETE ===== */

const handleDeleteClick = (id)=>{
setSelectedLeadId(id);
setShowDeletePopup(true);
};

const handleConfirmDelete = async()=>{

try{

await axios.delete(`${API}/${selectedLeadId}`,{
headers:{ Authorization:`Bearer ${token}` }
});

toast.success("Lead deleted successfully ✔");

setLeads(prev =>
prev.filter(l => l._id !== selectedLeadId)
);

}catch{
toast.error("Failed to delete lead");
}

setShowDeletePopup(false);
setSelectedLeadId(null);

};



/* ===== FILTER ===== */

const filteredLeads = leads.filter((lead)=>{

const s = search.toLowerCase();

const matchSearch =
lead.name?.toLowerCase().includes(s) ||
lead.email?.toLowerCase().includes(s) ||
lead.phone?.toLowerCase().includes(s) ||
lead.status?.toLowerCase().includes(s);

const matchStatus =
filterStatus === "all"
? true
: lead.status?.toLowerCase() === filterStatus;

return matchSearch && matchStatus;

});


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

{/* ✅ BACK BUTTON */}
<div style={{ marginBottom: "15px" }}>
  <button
    onClick={() => navigate(-1)}
    style={{
      display: "flex",
      alignItems: "center",
      gap: "6px",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      fontSize: "14px",
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
className="search-input"
style={{marginBottom:15,maxWidth:280}}
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

<div className="table-wrapper">

<table className="lead-table">

<thead>

<tr>

<th>Name</th>
<th>Email</th>
<th>Phone</th>
<th>Status</th>
<th>Assigned To</th>
<th>Created By</th>
<th>Actions</th>

</tr>

</thead>

<tbody>

{filteredLeads.map((lead)=>{

return(

<tr key={lead._id}>

<td
style={{
cursor:"pointer",
color:"#2563eb",
fontWeight:500
}}
onClick={()=>navigate(`/lead/${lead._id}`)}
>
{lead.name}
</td>

<td>{lead.email}</td>

<td>{lead.phone}</td>

<td>

<span className={`badge ${lead.status}`}>
{lead.status?.replace(/_/g," ")}
</span>

</td>

<td>
{lead.assignedTo?.email || "Unassigned"}
</td>

<td>

{lead.createdBy?.email || "N/A"}

{lead.createdBy?.role && (

<span
style={{
marginLeft:6,
padding:"2px 6px",
borderRadius:6,
fontSize:11,
background:"#eef2ff",
color:"#4338ca"
}}
>
{lead.createdBy.role}
</span>

)}

</td>

<td>

{canEdit && (

<button
style={{
padding:"6px 10px",
borderRadius:6,
border:"1px solid #d1d5db",
marginRight:8,
cursor:"pointer"
}}
onClick={()=>navigate(`/edit/${lead._id}`)}
>
Edit
</button>

)}

{canDelete && (

<button
style={{
padding:"6px 10px",
borderRadius:6,
border:"1px solid red",
color:"red",
cursor:"pointer"
}}
onClick={()=>handleDeleteClick(lead._id)}
>
Delete
</button>

)}

</td>

</tr>

)

})}

</tbody>

</table>

</div>


{canDelete && (

<DeletePopup
open={showDeletePopup}
onClose={()=>setShowDeletePopup(false)}
onConfirm={handleConfirmDelete}
/>

)}

</div>

);

}