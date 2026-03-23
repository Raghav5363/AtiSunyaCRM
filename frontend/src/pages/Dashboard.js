import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  FiUsers,
  FiCalendar,
  FiBarChart2,
  FiPhone,
  FiMail,
  FiMessageCircle
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
} from "chart.js";

import { Pie, Bar } from "react-chartjs-2";
import "./Dashboard.css";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

/* ================= DATE FORMAT ================= */

const formatDateTime = (date) => {
  if (!date) return "--";

  const d = new Date(date);

  if (isNaN(d)) return "--";

  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
};

/* ================= ACTIVITY ICON ================= */

const getActivityIcon = (type) => {
  switch (type) {
    case "call":
      return <FiPhone size={16} />;
    case "email":
      return <FiMail size={16} />;
    case "whatsapp":
      return <FiMessageCircle size={16} />;
    default:
      return <FiCalendar size={16} />;
  }
};

export default function Dashboard() {

  const navigate = useNavigate();

  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    followup: 0,
    not_interested: 0,
    junk: 0,
    closed: 0,
    site_visit_planned: 0,
    site_visit_done: 0
  });

  const [monthly, setMonthly] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [activeTab, setActiveTab] = useState("summary");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  const BASE_URL =
    process.env.REACT_APP_API_URL || "http://localhost:5000";

  /* ================= FETCH ================= */

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/leads/stats/summary`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      setStats(res.data);
    } catch (err) {
      console.log("Stats error:", err);
    }
  }, [BASE_URL, token]);

  const fetchMonthly = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/leads/stats/monthly`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      setMonthly(res.data);
    } catch (err) {
      console.log("Monthly error:", err);
    }
  }, [BASE_URL, token]);

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/activities/today`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      setSchedule(res.data);
    } catch (err) {
      console.log("Schedule error:", err);
    }
  }, [BASE_URL, token]);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      await Promise.all([
        fetchStats(),
        fetchMonthly(),
        fetchSchedule()
      ]);

      setLoading(false);
    };

    loadDashboard();
  }, [fetchStats, fetchMonthly, fetchSchedule]);

  const todayActivities = schedule;

  /* ================= CHART DATA ================= */

  const pieData = {
    labels: [
      "New",
      "Follow Up",
      "Not Interested",
      "Junk",
      "Closed",
      "Site Visit Planned",
      "Site Visit Done"
    ],
    datasets: [
      {
        data: [
          stats.new,
          stats.followup,
          stats.not_interested,
          stats.junk,
          stats.closed,
          stats.site_visit_planned,
          stats.site_visit_done
        ],
        backgroundColor: [
          "#2563eb",
          "#f59e0b",
          "#ef4444",
          "#9ca3af",
          "#10b981",
          "#6366f1",
          "#06b6d4"
        ]
      }
    ]
  };

  const barData = {
    labels: monthly.map(m =>
      new Date(0, m._id - 1).toLocaleString("default", { month: "short" })
    ),
    datasets: [
      {
        label: "Leads",
        data: monthly.map(m => m.count),
        backgroundColor: "#6366f1"
      }
    ]
  };

  if (loading) {
    return (
      <div className="dashboard">
        <p style={{ textAlign: "center" }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">

      {/* 🔥 TABS */}
      <div className="tabs">
        <Tab icon={<FiUsers />} label="Lead Summary" active={activeTab === "summary"} onClick={() => setActiveTab("summary")} />
        <Tab icon={<FiCalendar />} label="Today's Schedule" active={activeTab === "schedule"} onClick={() => setActiveTab("schedule")} />
        <Tab icon={<FiBarChart2 />} label="Dashboard" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
      </div>

      {/* 🔥 SUMMARY */}
      {activeTab === "summary" && (
        <div className="kpiWrapper">
          <KpiCard title="All Leads" value={stats.total} onClick={() => navigate("/leads")} />
          <KpiCard title="New Leads" value={stats.new} onClick={() => navigate("/leads?status=new")} />
          <KpiCard title="Follow Up" value={stats.followup} onClick={() => navigate("/leads?status=followup")} />
          <KpiCard title="Not Interested" value={stats.not_interested} onClick={() => navigate("/leads?status=not_interested")} />
          <KpiCard title="Junk" value={stats.junk} onClick={() => navigate("/leads?status=junk")} />
          <KpiCard title="Closed" value={stats.closed} onClick={() => navigate("/leads?status=closed")} />
          <KpiCard title="Site Visit Planned" value={stats.site_visit_planned} onClick={() => navigate("/leads?status=site_visit_planned")} />
          <KpiCard title="Site Visit Done" value={stats.site_visit_done} onClick={() => navigate("/leads?status=site_visit_done")} />
        </div>
      )}

      {/* 🔥 SCHEDULE */}
{activeTab === "schedule" && (
  <div className="contentCard">
    <h3>Today's Schedule</h3>

    {todayActivities.length === 0 ? (
      <p>No activities scheduled for today.</p>
    ) : (
      todayActivities.map((item, i) => {

        const createdDate = item.leadId?.createdAt;
        const followUpDate = item.nextFollowUpDate;

        return (
          <div
            key={i}
            onClick={() => navigate(`/lead/${item.leadId?._id}`)}
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: "#fff",
              marginBottom: "12px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              borderLeft: "4px solid #2563eb",
              transition: "0.2s"
            }}
          >

            {/* TOP ROW */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              
              <div>
                <div style={{ fontWeight: "600", fontSize: "15px" }}>
                  {item.leadId?.name || "Unknown Lead"}
                </div>

                <div style={{ fontSize: "13px", color: "#666", marginTop: 4 }}>
                  📞 {item.leadId?.phone || "-"}
                </div>
              </div>

              <div style={{ fontSize: "12px", color: "#999" }}>
                {getActivityIcon(item.activityType)} {item.activityType}
              </div>

            </div>

            {/* DATES */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>

              <div>
                <div style={{ fontSize: "12px", color: "#888" }}>Created</div>
                <div style={{ fontSize: "13px" }}>
                  {createdDate
                    ? new Date(createdDate).toLocaleString("en-IN")
                    : "-"}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "12px", color: "#888" }}>Follow-up</div>
                <div style={{ fontSize: "13px" }}>
                  {followUpDate
                    ? new Date(followUpDate).toLocaleString("en-IN")
                    : "-"}
                </div>
              </div>

            </div>

            {/* TIME */}
            <div style={{ marginTop: 10, fontSize: "12px", color: "#777" }}>
              {formatDateTime(
                item.activityDateTime || item.nextFollowUpDate
              )}
            </div>

          </div>
        );
      })
    )}
  </div>
)}

      {/* 🔥 CHART */}
      {activeTab === "dashboard" && (
        <div className="chartSection">
          <div className="chartCard">
            <h3>Status Distribution</h3>
            <Pie data={pieData} />
          </div>

          <div className="chartCard">
            <h3>Monthly Leads</h3>
            <Bar data={barData} />
          </div>
        </div>
      )}
    </div>
  );
}

/* TAB */
function Tab({ icon, label, active, onClick }) {
  return (
    <div onClick={onClick} className={active ? "tab activeTab" : "tab"}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

/* KPI */
function KpiCard({ title, value, onClick }) {

  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    let start = 0;
    const end = value || 0;
    const duration = 800;
    const increment = end / (duration / 20);

    const timer = setInterval(() => {
      start += increment;

      if (start >= end) {
        start = end;
        clearInterval(timer);
      }

      setCount(Math.floor(start));

    }, 20);

    return () => clearInterval(timer);

  }, [value]);

  return (
    <div className="kpiCard" onClick={onClick} style={{ cursor: "pointer" }}>
      <h4>{title}</h4>
      <div className="kpiCircle">{count}</div>
    </div>
  );
}