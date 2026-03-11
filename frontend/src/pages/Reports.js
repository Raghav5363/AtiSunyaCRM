import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { Bar, Pie } from "react-chartjs-2";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

export default function Reports() {

  const [monthly, setMonthly] = useState([]);
  const [team, setTeam] = useState([]);
  const [summary, setSummary] = useState({});

  const token = localStorage.getItem("token");
  const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const reportRef = useRef(null);

  /* ================= FETCH ================= */

  const fetchMonthly = useCallback(async () => {
    try {
      const res = await axios.get(
        `${BASE_URL}/api/leads/stats/monthly`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMonthly(res.data || []);
    } catch (err) {
      console.log(err);
    }
  }, [BASE_URL, token]);

  const fetchTeam = useCallback(async () => {
    try {
      const res = await axios.get(
        `${BASE_URL}/api/leads/stats/team`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTeam(res.data || []);
    } catch (err) {
      console.log(err);
    }
  }, [BASE_URL, token]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await axios.get(
        `${BASE_URL}/api/leads/stats/summary`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSummary(res.data || {});
    } catch (err) {
      console.log(err);
    }
  }, [BASE_URL, token]);

  useEffect(() => {
    fetchMonthly();
    fetchTeam();
    fetchSummary();
  }, [fetchMonthly, fetchTeam, fetchSummary]);

  /* ================= PDF DOWNLOAD ================= */

  const downloadPDF = async () => {

    const element = reportRef.current;

    if (!element) return;

    const canvas = await html2canvas(element);

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p","mm","a4");

    const imgWidth = 210;

    const imgHeight = canvas.height * imgWidth / canvas.width;

    pdf.addImage(imgData,"PNG",0,10,imgWidth,imgHeight);

    pdf.save("CRM_Report.pdf");

  };

  /* ================= CHART DATA ================= */

  const monthlyData = {
    labels: monthly.map(m => `Month ${m._id}`),
    datasets: [
      {
        label: "Leads",
        data: monthly.map(m => m.count),
        backgroundColor: "#4f46e5"
      }
    ]
  };

  const pieData = {
    labels:["New","FollowUp","Closed","Junk"],
    datasets:[
      {
        data:[
          summary.new || 0,
          summary.followup || 0,
          summary.closed || 0,
          summary.junk || 0
        ],
        backgroundColor:[
          "#3b82f6",
          "#f59e0b",
          "#10b981",
          "#ef4444"
        ]
      }
    ]
  };

  return (

<div style={{padding:30}}>

<h2>CRM Reports</h2>

<button
onClick={downloadPDF}
style={{
background:"#2563eb",
color:"#fff",
border:"none",
padding:"10px 16px",
borderRadius:6,
cursor:"pointer",
marginTop:10
}}
>
Download PDF Report
</button>

<div ref={reportRef}>

{/* ================= KPI CARDS ================= */}

<div style={{
display:"grid",
gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
gap:20,
marginTop:30
}}>

<Card title="Total Leads" value={summary.total} />
<Card title="New Leads" value={summary.new} />
<Card title="Followups" value={summary.followup} />
<Card title="Closed Deals" value={summary.closed} />

</div>

{/* ================= CHARTS ================= */}

<div style={{
display:"grid",
gridTemplateColumns:"1fr 1fr",
gap:30,
marginTop:40
}}>

<div style={chartCard}>
<h3>Monthly Leads</h3>
<Bar data={monthlyData}/>
</div>

<div style={chartCard}>
<h3>Status Distribution</h3>
<Pie data={pieData}/>
</div>

</div>

{/* ================= TEAM PERFORMANCE ================= */}

<div style={{marginTop:40}}>

<h3>Team Performance</h3>

<table style={tableStyle}>

<thead>
<tr>
<th>Agent</th>
<th>Converted</th>
</tr>
</thead>

<tbody>

{team.map((t,i)=>(
<tr key={i}>
<td>{t.user?.email}</td>
<td>{t.converted}</td>
</tr>
))}

</tbody>

</table>

</div>

</div>

</div>

  );
}

/* ================= COMPONENTS ================= */

function Card({title,value}){

return(

<div style={{
background:"#fff",
padding:20,
borderRadius:10,
boxShadow:"0 4px 12px rgba(0,0,0,0.08)"
}}>

<h4>{title}</h4>

<p style={{
fontSize:28,
fontWeight:"bold",
marginTop:10
}}>
{value || 0}
</p>

</div>

)

}

const chartCard={
background:"#fff",
padding:20,
borderRadius:10,
boxShadow:"0 4px 12px rgba(0,0,0,0.08)"
}

const tableStyle={
width:"100%",
borderCollapse:"collapse",
marginTop:20
}