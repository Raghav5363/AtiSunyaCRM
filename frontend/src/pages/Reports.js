import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
);

export default function Reports() {
  const [monthly, setMonthly] = useState([]);
  const [team, setTeam] = useState([]);

  const token = localStorage.getItem("token");

  // ✅ Production Base URL
  const BASE_URL = process.env.REACT_APP_API_URL;

  /* =========================
     FETCH MONTHLY STATS
  ========================= */
  const fetchMonthly = useCallback(async () => {
    try {
      const res = await axios.get(
        `${BASE_URL}/api/leads/stats/monthly`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMonthly(res.data);
    } catch (err) {
      console.log(err);
    }
  }, [BASE_URL, token]);

  /* =========================
     FETCH TEAM STATS
  ========================= */
  const fetchTeam = useCallback(async () => {
    try {
      const res = await axios.get(
        `${BASE_URL}/api/leads/stats/team`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTeam(res.data);
    } catch (err) {
      console.log(err);
    }
  }, [BASE_URL, token]);

  /* =========================
     LOAD DATA
  ========================= */
  useEffect(() => {
    fetchMonthly();
    fetchTeam();
  }, [fetchMonthly, fetchTeam]);

  const monthlyData = {
    labels: monthly.map((m) => `Month ${m._id}`),
    datasets: [
      {
        label: "Leads",
        data: monthly.map((m) => m.count),
        backgroundColor: "#3498db",
      },
    ],
  };

  const teamData = {
    labels: team.map((t) => t.user.email),
    datasets: [
      {
        label: "Converted",
        data: team.map((t) => t.converted),
        backgroundColor: "#2ecc71",
      },
    ],
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>Reports Dashboard</h2>

      <div style={{ width: 600, marginTop: 40 }}>
        <h3>Monthly Leads</h3>
        <Bar data={monthlyData} />
      </div>

      <div style={{ width: 600, marginTop: 60 }}>
        <h3>Team Performance</h3>
        <Bar data={teamData} />
      </div>
    </div>
  );
}
