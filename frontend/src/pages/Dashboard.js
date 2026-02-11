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

  // ✅ Clean Base URL (Local + Production Safe)
  const BASE_URL =
    process.env.REACT_APP_API_URL || "http://localhost:5000";

  // ✅ Safe token decode
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
        `${BASE_URL}/api/leads/stats/summary`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setStats(res.data);
    } catch (err) {
      console.log(err);
    }
  }, [BASE_URL, token]);

  /* ================= FETCH MONTHLY ================= */
  const fetchMonthly = useCallback(async () => {
    try {
      if (!token) return;

      const res = await axios.get(
        `${BASE_URL}/api/leads/stats/monthly`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMonthly(res.data);
    } catch (err) {
      console.log(err);
    }
  }, [BASE_URL, token]);

  useEffect(() => {
    fetchStats();
    fetchMonthly();
  }, [fetchStats, fetchMonthly]);

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
        backgroundColor: "#2563eb",
      },
    ],
  };

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.heading}>
        CRM Dashboard ({user?.role || "User"})
      </h2>

      {/* ================= CARDS ================= */}
      <div style={styles.cardContainer}>
        <StatCard title="Total Leads" value={stats.total} />
        <StatCard title="New Leads" value={stats.new} />
        <StatCard title="Follow Ups" value={stats.followup} />
        <StatCard title="Converted" value={stats.converted} />
      </div>

      {/* ================= CHARTS ================= */}
      <div style={styles.chartContainer}>
        <div style={styles.chartBox}>
          <h3>Status Distribution</h3>
          <Pie data={pieData} />
        </div>

        <div style={styles.chartBoxLarge}>
          <h3>Monthly Leads</h3>
          <Bar data={barData} />
        </div>
      </div>
    </div>
  );
}

/* ================= STAT CARD COMPONENT ================= */
function StatCard({ title, value }) {
  return (
    <div style={styles.card}>
      <h4 style={{ margin: 0 }}>{title}</h4>
      <div style={styles.cardValue}>{value || 0}</div>
    </div>
  );
}

/* ================= CSS ================= */

const styles = {
  wrapper: {
    padding: "30px",
    background: "#f4f6f9",
    minHeight: "100vh",
  },

  heading: {
    fontSize: "24px",
    fontWeight: 600,
  },

  cardContainer: {
    display: "flex",
    gap: 25,
    marginTop: 30,
    flexWrap: "wrap",
  },

  card: {
    background: "white",
    padding: 25,
    borderRadius: 12,
    width: 230,
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
    textAlign: "center",
    transition: "transform 0.2s ease",
  },

  cardValue: {
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 10,
    color: "#0f172a",
  },

  chartContainer: {
    display: "flex",
    gap: 50,
    marginTop: 50,
    flexWrap: "wrap",
  },

  chartBox: {
    width: 350,
    background: "white",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
  },

  chartBoxLarge: {
    width: 500,
    background: "white",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
  },
};
