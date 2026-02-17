import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  FiBell,
  FiMoon,
  FiSun,
  FiUsers,
  FiCalendar,
  FiBarChart2
} from "react-icons/fi";

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

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [monthly, setMonthly] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [activeTab, setActiveTab] = useState("summary");
  const [darkMode, setDarkMode] = useState(false);
  const [showNotify, setShowNotify] = useState(false);


  const token = localStorage.getItem("token");
  const BASE_URL =
    process.env.REACT_APP_API_URL || "http://localhost:5000";

  /* ================= FETCH ================= */

  const fetchStats = useCallback(async () => {
    if (!token) return;
    const res = await axios.get(
      `${BASE_URL}/api/leads/stats/summary`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setStats(res.data);
  }, [BASE_URL, token]);

  const fetchMonthly = useCallback(async () => {
    if (!token) return;
    const res = await axios.get(
      `${BASE_URL}/api/leads/stats/monthly`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setMonthly(res.data);
  }, [BASE_URL, token]);

  const fetchSchedule = useCallback(async () => {
    if (!token) return;
    const res = await axios.get(
      `${BASE_URL}/api/activities/today`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setSchedule(res.data);
  }, [BASE_URL, token]);

  useEffect(() => {
    fetchStats();
    fetchMonthly();
    fetchSchedule();
  }, [fetchStats, fetchMonthly, fetchSchedule]);

  /* ================= CHART DATA ================= */

  const pieData = {
    labels: ["New", "Follow Up", "Closed"],
    datasets: [
      {
        data: [
          stats.new || 0,
          stats.followup || 0,
          stats.closed || 0
        ],
        backgroundColor: ["#2563eb", "#f59e0b", "#10b981"]
      }
    ]
  };

  const barData = {
    labels: monthly.map((m) => `Month ${m._id}`),
    datasets: [
      {
        label: "Leads",
        data: monthly.map((m) => m.count),
        backgroundColor: "#6366f1"
      }
    ]
  };

  return (
    <div className={darkMode ? "dashboard dark" : "dashboard"}>

 {/* NAVBAR */}
<div className="navbar">
  <div className="navRight">

    {/* NOTIFICATION */}
    <div className="notifyWrapper">
      <div
        className="icon notifyIcon"
        onClick={() => setShowNotify(!showNotify)}
      >
        <FiBell />
        <span className="notifyBadge">3</span>
      </div>

      {showNotify && (
        <div className="notifyDropdown">
          <div className="notifyHeader">Notifications</div>
          <div className="notifyItem">New lead assigned</div>
          <div className="notifyItem">Follow up reminder</div>
          <div className="notifyItem">Site visit scheduled</div>
        </div>
      )}
    </div>

    {/* DARK MODE */}
    <button
      className="iconBtn"
      onClick={() => setDarkMode(!darkMode)}
    >
      {darkMode ? <FiSun /> : <FiMoon />}
    </button>

  </div>
</div>



      {/* TABS */}
      <div className="tabs">
        <Tab
          icon={<FiUsers />}
          label="Lead Summary"
          active={activeTab === "summary"}
          onClick={() => setActiveTab("summary")}
        />
        <Tab
          icon={<FiCalendar />}
          label="Today's Schedule"
          active={activeTab === "schedule"}
          onClick={() => setActiveTab("schedule")}
        />
        <Tab
          icon={<FiBarChart2 />}
          label="Lead Dashboard"
          active={activeTab === "dashboard"}
          onClick={() => setActiveTab("dashboard")}
        />
      </div>

      {/* SUMMARY */}
      {activeTab === "summary" && (
        <div className="kpiWrapper">
          <KpiCard title="All Lead" value={stats.total} />
          <KpiCard title="New Leads" value={stats.new} />
          <KpiCard title="Follow Up" value={stats.followup} />
          <KpiCard title="Not Interested" value={stats.notInterested} />
          <KpiCard title="Junk" value={stats.junk} />
          <KpiCard title="Closed" value={stats.closed} />
          <KpiCard title="Site Visit Planned" value={stats.siteVisitPlanned} />
          <KpiCard title="Site Visit Done" value={stats.siteVisitDone} />
        </div>
      )}

      {/* SCHEDULE */}
      {activeTab === "schedule" && (
        <div className="contentCard">
          <h3>Today's Schedule</h3>
          {schedule.length === 0
            ? <p>No meetings today.</p>
            : schedule.map((item, i) => (
                <div key={i} className="scheduleItem">
                  {item.title} - {item.time}
                </div>
              ))}
        </div>
      )}

      {/* DASHBOARD */}
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

/* COMPONENTS */

function Tab({ icon, label, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className={active ? "tab activeTab" : "tab"}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function KpiCard({ title, value }) {
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
    <div className="kpiCard">
      <h4>{title}</h4>
      <p className="kpiValue">{count}</p>
    </div>
  );
}

