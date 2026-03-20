import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiArrowLeft } from "react-icons/fi";
import { FaPhoneAlt } from "react-icons/fa";

export default function FollowUps() {

  const [today, setToday] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [upcoming, setUpcoming] = useState([]);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const BASE_URL =
    process.env.REACT_APP_API_URL || "http://localhost:5000";

  /* ================= FETCH ================= */
  const fetchFollowUps = useCallback(async () => {
    try {

      const headers = { Authorization: `Bearer ${token}` };

      const [todayRes, overdueRes, upcomingRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/followups/today`, { headers }),
        axios.get(`${BASE_URL}/api/followups/overdue`, { headers }),
        axios.get(`${BASE_URL}/api/followups/upcoming`, { headers })
      ]);

      setToday(todayRes.data);
      setOverdue(overdueRes.data);
      setUpcoming(upcomingRes.data);

    } catch (err) {
      console.log(err);
      toast.error("Failed to load follow-ups");
    }
  }, [BASE_URL, token]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  /* ================= CARD ================= */
  const renderCard = (item, type) => {

    const lead = item.leadId || {};

    return (
      <div
        key={item._id}
        style={{
          ...styles.card,
          borderLeft:
            type === "overdue"
              ? "4px solid #dc2626"
              : type === "upcoming"
              ? "4px solid #f59e0b"
              : "4px solid #0d6efd",
        }}
        onClick={() => navigate(`/lead/${lead._id}`)}
      >

        {/* HEADER */}
        <div style={styles.cardHeader}>
          <div style={styles.name}>{lead.name || "Unknown Lead"}</div>

          <button
            style={styles.callBtn}
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = `tel:${lead.phone}`;
            }}
          >
            <FaPhoneAlt />
          </button>
        </div>

        {/* DATES */}
        <div style={styles.row}>
  <div>
    <div style={styles.label}>Created Date</div>
    <div style={styles.value}>
      {item.leadId?.createdAt
        ? new Date(item.leadId.createdAt).toLocaleString()
        : "-"}
    </div>
  </div>

  <div>
    <div style={styles.label}>Reminder Date</div>
    <div style={styles.value}>
      {item.nextFollowUpDate
        ? new Date(item.nextFollowUpDate).toLocaleString()
        : "-"}
    </div>
  </div>
</div>

        {/* STATUS */}
        <div style={styles.row}>
          <div>
            <div style={styles.status}>
              Status: {item.outcome || "Followup"}
            </div>
            <div style={styles.note}>
              {item.notes || "-"}
            </div>
          </div>

          <div style={styles.purpose}>
            Purpose: Followup
          </div>
        </div>

      </div>
    );
  };

  const renderSection = (title, list, type) => (
    <div style={styles.section}>
      <div style={styles.header}>
        <span>{title}</span>
        <span style={styles.badge}>{list.length}</span>
      </div>

      {list.length > 0
        ? list.map((item) => renderCard(item, type))
        : <div style={styles.empty}>No follow-ups</div>
      }
    </div>
  );

  return (
    <div style={styles.wrapper}>

      {/* BACK */}
      <button onClick={()=>navigate(-1)} style={styles.back}>
        <FiArrowLeft/> Back
      </button>

      <div style={styles.container}>

        {/* ORDER FIXED */}
        {renderSection("Today's Follow-ups", today, "today")}
        {renderSection("Upcoming Follow-ups", upcoming, "upcoming")}
        {renderSection("Overdue Follow-ups", overdue, "overdue")}

      </div>

    </div>
  );
}

/* ================= STYLES ================= */

const styles = {

  wrapper:{
    padding:"20px",
    background:"#f4f6f9",
    minHeight:"100vh"
  },

  back:{
    border:"none",
    background:"transparent",
    cursor:"pointer",
    marginBottom:"10px",
    display:"flex",
    alignItems:"center",
    gap:"6px",
    color:"#2563eb",
    fontWeight:500
  },

  container:{
    maxWidth:"900px",
    margin:"auto",
    display:"flex",
    flexDirection:"column",
    gap:"20px"
  },

  section:{
    background:"#fff",
    padding:"15px",
    borderRadius:"10px",
    boxShadow:"0 4px 12px rgba(0,0,0,0.05)"
  },

  header:{
    display:"flex",
    justifyContent:"space-between",
    marginBottom:"10px",
    fontWeight:600
  },

  badge:{
    background:"#e5e7eb",
    padding:"3px 10px",
    borderRadius:"20px",
    fontSize:"12px"
  },

  card:{
    background:"#fff",
    padding:"15px",
    borderRadius:"10px",
    marginBottom:"10px",
    cursor:"pointer",
    boxShadow:"0 2px 8px rgba(0,0,0,0.04)"
  },

  cardHeader:{
    display:"flex",
    justifyContent:"space-between",
    alignItems:"center",
    marginBottom:"10px"
  },

  name:{
    fontSize:"16px",
    fontWeight:600
  },

  callBtn:{
    border:"none",
    background:"#fee2e2",
    color:"#dc2626",
    padding:"8px",
    borderRadius:"50%",
    cursor:"pointer"
  },

  row:{
    display:"flex",
    justifyContent:"space-between",
    marginBottom:"8px"
  },

  label:{
    fontSize:"12px",
    color:"#6b7280"
  },

  value:{
    fontSize:"13px",
    fontWeight:500
  },

  status:{
    fontWeight:600
  },

  note:{
    fontSize:"13px",
    color:"#6b7280"
  },

  purpose:{
    fontWeight:600
  },

  empty:{
    padding:"10px",
    color:"#6b7280"
  }

};