import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";

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

  const token = localStorage.getItem("token");

  const API =
    process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  // ✅ Safe token parsing
  let user = null;
  try {
    user = token ? JSON.parse(atob(token.split(".")[1])) : null;
  } catch {
    user = null;
  }

  /* ================= FETCH SUMMARY ================= */
  const fetchStats = useCallback(async () => {
    try {
      if (!token) return;

      const res = await axios.get(
        `${API}/leads/stats/summary`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setStats(res.data);
    } catch (err) {
      console.log(err);
    }
  }, [API, token]);

  /* ================= FETCH MONTHLY ================= */
  const fetchMonthly = useCallback(async () => {
    try {
      if (!token) return;

      const res = await axios.get(
        `${API}/leads/stats/monthly`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMonthly(res.data);
    } catch (err) {
      console.log(err);
    }
  }, [API, token]);

  // ✅ Fixed dependency error
  useEffect(() => {
    fetchStats();
    fetchMonthly();
  }, [fetchStats, fetchMonthly]);

  /* ================= CARD ================= */
  const Card = ({ title, value }) => (
    <div
      style={{
        background: "white",
        padding: 25,
        borderRadius: 12,
        width: 230,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        textAlign: "center",
      }}
    >
      <h3>{title}</h3>
      <div style={{ fontSize: 32, fontWeight: "bold", marginTop: 10 }}>
        {value || 0}
      </div>
    </div>
  );

  /* ================= PIE CHART ================= */
  const pieData = {
    labels: ["New", "Followup", "Converted"],
    datasets: [
      {
        data: [
          stats.new || 0,
          stats.followup || 0,
          stats.converted || 0
        ],
        backgroundColor: ["#3498db", "#f1c40f", "#2ecc71"],
      },
    ],
  };

  /* ================= BAR CHART ================= */
  const barData = {
    labels: monthly.map((m) => `Month ${m._id}`),
    datasets: [
      {
        label: "Leads",
        data: monthly.map((m) => m.count),
        backgroundColor: "#2980b9",
      },
    ],
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>CRM Dashboard ({user?.role || "User"})</h2>

      {/* ================= STATS ================= */}
      <div
        style={{
          display: "flex",
          gap: 25,
          marginTop: 30,
          flexWrap: "wrap",
        }}
      >
        <Card title="Total Leads" value={stats.total} />
        <Card title="New Leads" value={stats.new} />
        <Card title="Follow Ups" value={stats.followup} />
        <Card title="Converted" value={stats.converted} />
      </div>

      {/* ================= CHARTS ================= */}
      <div
        style={{
          display: "flex",
          gap: 50,
          marginTop: 50,
          flexWrap: "wrap",
        }}
      >
        <div style={{ width: 350 }}>
          <h3>Status Distribution</h3>
          <Pie data={pieData} />
        </div>

        <div style={{ width: 500 }}>
          <h3>Monthly Leads</h3>
          <Bar data={barData} />
        </div>
      </div>
    </div>
  );
}
