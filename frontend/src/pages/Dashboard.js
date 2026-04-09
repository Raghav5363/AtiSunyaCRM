import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiActivity,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiSlash,
  FiTarget,
  FiTrendingUp,
  FiUsers,
  FiPhone,
  FiMail,
  FiMessageCircle,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
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

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const formatDateTime = (date) => {
  if (!date) return "--";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "--";

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatMetaDateTime = (date) => {
  if (!date) return "--";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "--";

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

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
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role") || "sales_agent";

  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    followup: 0,
    not_interested: 0,
    junk: 0,
    closed: 0,
    site_visit_planned: 0,
    site_visit_done: 0,
  });
  const [monthly, setMonthly] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [team, setTeam] = useState([]);
  const [activeTab, setActiveTab] = useState("summary");
  const [loading, setLoading] = useState(true);

  const authHeaders = useMemo(
    () => ({
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    }),
    [token]
  );

  const fetchStats = useCallback(async () => {
    const res = await axios.get(`${BASE_URL}/api/leads/stats/summary`, authHeaders);
    setStats(res.data || {});
  }, [authHeaders]);

  const fetchMonthly = useCallback(async () => {
    const res = await axios.get(`${BASE_URL}/api/leads/stats/monthly`, authHeaders);
    setMonthly(res.data || []);
  }, [authHeaders]);

  const fetchSchedule = useCallback(async () => {
    const res = await axios.get(`${BASE_URL}/api/activities/today`, authHeaders);
    setSchedule(Array.isArray(res.data) ? res.data : []);
  }, [authHeaders]);

  const fetchTeam = useCallback(async () => {
    if (role === "sales_agent") return;

    try {
      const res = await axios.get(`${BASE_URL}/api/leads/stats/team`, authHeaders);
      setTeam(Array.isArray(res.data) ? res.data : []);
    } catch {
      setTeam([]);
    }
  }, [authHeaders, role]);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      try {
        await Promise.all([
          fetchStats(),
          fetchMonthly(),
          fetchSchedule(),
          fetchTeam(),
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [fetchMonthly, fetchSchedule, fetchStats, fetchTeam]);

  const tabs = useMemo(() => {
    const baseTabs = [
      { key: "summary", label: "Lead Summary", icon: <FiUsers /> },
      { key: "schedule", label: "Today's Schedule", icon: <FiCalendar /> },
      { key: "insights", label: "Dashboard", icon: <FiBarChart2 /> },
    ];

    if (role === "sales_manager") {
      baseTabs.push({ key: "team", label: "Team Dashboard", icon: <FiUsers /> });
    }

    return baseTabs;
  }, [role]);

  const summaryCards = [
    {
      title: role === "sales_agent" ? "My Total" : "Total",
      value: stats.total,
      accent: "#0f766e",
      path: "/leads",
      icon: <FiTarget />,
    },
    {
      title: "New",
      value: stats.new,
      accent: "#2563eb",
      path: "/leads?status=new",
      icon: <FiTrendingUp />,
    },
    {
      title: "Follow Up",
      value: stats.followup,
      accent: "#f59e0b",
      path: "/leads?status=followup",
      icon: <FiClock />,
    },
    {
      title: "Not Interested",
      value: stats.not_interested,
      accent: "#ef4444",
      path: "/leads?status=not_interested",
      icon: <FiSlash />,
    },
    {
      title: "Junk",
      value: stats.junk,
      accent: "#64748b",
      path: "/leads?status=junk",
      icon: <FiActivity />,
    },
    {
      title: "Closed",
      value: stats.closed,
      accent: "#10b981",
      path: "/leads?status=closed",
      icon: <FiCheckCircle />,
    },
    {
      title: "Site Visit Planned",
      value: stats.site_visit_planned,
      accent: "#7c3aed",
      path: "/leads?status=site_visit_planned",
      icon: <FiMapPin />,
    },
    {
      title: "Site Visit Done",
      value: stats.site_visit_done,
      accent: "#06b6d4",
      path: "/leads?status=site_visit_done",
      icon: <FiCheckCircle />,
    },
  ];

  const teamSummary = {
    members: team.length,
    assignedLeads: team.reduce((sum, item) => sum + (item.total || 0), 0),
    converted: team.reduce((sum, item) => sum + (item.converted || 0), 0),
    followups: team.reduce((sum, item) => sum + (item.followups || 0), 0),
  };

  const pieData = {
    labels: [
      "New",
      "Follow Up",
      "Not Interested",
      "Junk",
      "Closed",
      "Site Visit Planned",
      "Site Visit Done",
    ],
    datasets: [
      {
        data: [
          stats.new || 0,
          stats.followup || 0,
          stats.not_interested || 0,
          stats.junk || 0,
          stats.closed || 0,
          stats.site_visit_planned || 0,
          stats.site_visit_done || 0,
        ],
        backgroundColor: [
          "#2563eb",
          "#f59e0b",
          "#ef4444",
          "#94a3b8",
          "#10b981",
          "#7c3aed",
          "#06b6d4",
        ],
      },
    ],
  };

  const barData = {
    labels: monthly.map((m) =>
      new Date(0, (m._id || 1) - 1).toLocaleString("default", { month: "short" })
    ),
    datasets: [
      {
        label: "Leads",
        data: monthly.map((m) => m.count || 0),
        backgroundColor: "#2563eb",
        borderRadius: 10,
      },
    ],
  };

  const pieOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 10,
            padding: 14,
            font: { size: 11 },
          },
        },
      },
    }),
    []
  );

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
          },
        },
      },
    }),
    []
  );

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboardHero">
          <div>
            <p className="eyebrow">CRM Dashboard</p>
            <h1>Loading workspace...</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboardHero">
        <div>
          <p className="eyebrow">{role.replace(/_/g, " ")}</p>
          <h1>
            {role === "admin"
              ? "Business command center"
              : role === "sales_manager"
                ? "Team performance overview"
                : "Your daily sales cockpit"}
          </h1>
          <p className="heroSub">
            Track leads, follow-ups, conversions, and daily work from one place.
          </p>
        </div>
        <div className="heroStats">
          <div className="heroStat">
            <FiTrendingUp />
            <span>{stats.closed || 0} closed</span>
          </div>
          <div className="heroStat">
            <FiActivity />
            <span>{schedule.length} tasks today</span>
          </div>
        </div>
      </div>

      <div className="tabs tabsAuto">
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            icon={tab.icon}
            label={tab.label}
            active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          />
        ))}
      </div>

      {activeTab === "summary" && (
        <>
          <div className="kpiWrapper kpiWrapperWide">
            {summaryCards.map((card) => (
              <KpiCard
                key={card.title}
                title={card.title}
                value={card.value}
                accent={card.accent}
                icon={card.icon}
                onClick={() => navigate(card.path)}
              />
            ))}
          </div>
        </>
      )}

      {activeTab === "schedule" && (
        <div className="contentCard">
          <div className="sectionHeader">
            <div>
              <h3>Today&apos;s schedule</h3>
              <p>Calls, meetings, and follow-ups planned for today.</p>
            </div>
          </div>

          {schedule.length === 0 ? (
            <p className="emptyText">No activities scheduled for today.</p>
          ) : (
            schedule.map((item, index) => (
              <div
                key={`${item._id}-${index}`}
                className="scheduleCard"
                onClick={() => navigate(`/lead/${item.leadId?._id}`)}
              >
                <div className="scheduleTop">
                  <div>
                    <div className="scheduleName">{item.leadId?.name || "Unknown Lead"}</div>
                    <div className="schedulePhone">{item.leadId?.phone || "-"}</div>
                  </div>
                  <div className="scheduleType">
                    {getActivityIcon(item.activityType)}
                    <span>{item.activityType || "activity"}</span>
                  </div>
                </div>

                <div className="scheduleTags">
                  <span className="scheduleTag statusTag">
                    {(item.leadId?.status || "new").replace(/_/g, " ")}
                  </span>
                  <span className="scheduleTag purposeTag">
                    {(item.leadId?.purpose || "followup").replace(/_/g, " ")}
                  </span>
                </div>

                <div className="scheduleMeta">
                  <div>
                    <span className="metaLabel">Created</span>
                    <span>{formatMetaDateTime(item.leadId?.createdAt)}</span>
                  </div>
                  <div>
                    <span className="metaLabel">Reminder</span>
                    <span>{formatMetaDateTime(item.leadId?.reminderDate || item.nextFollowUpDate)}</span>
                  </div>
                </div>

                <div className="scheduleNotes">
                  {item.notes || item.leadId?.notes || "No notes added"}
                </div>

                <div className="scheduleFooter">
                  Scheduled: {formatDateTime(item.activityDateTime || item.nextFollowUpDate)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "insights" && (
        <div className="chartSection">
          <div className="chartCard">
            <h3>Status distribution</h3>
            <div className="chartCanvas">
              <Pie data={pieData} options={pieOptions} />
            </div>
          </div>
          <div className="chartCard">
            <h3>Monthly leads</h3>
            <div className="chartCanvas">
              <Bar data={barData} options={barOptions} />
            </div>
          </div>
        </div>
      )}

      {activeTab === "team" && role === "sales_manager" && (
        <div className="dashboardGrid">
          <div className="contentCard">
            <div className="sectionHeader">
              <div>
                <h3>Manager overview</h3>
                <p>Live team numbers based on assigned pipeline.</p>
              </div>
            </div>

            <div className="miniGrid">
              <MiniCard title="Team Members" value={teamSummary.members} />
              <MiniCard title="Assigned Leads" value={teamSummary.assignedLeads} />
              <MiniCard title="Converted" value={teamSummary.converted} />
              <MiniCard title="Follow Ups" value={teamSummary.followups} />
            </div>
          </div>

          <div className="contentCard">
            <div className="sectionHeader">
              <div>
                <h3>Team leaderboard</h3>
                <p>Who owns the most active pipeline right now.</p>
              </div>
            </div>

            {team.length === 0 ? (
              <p className="emptyText">No team performance data yet.</p>
            ) : (
              team.map((member, index) => (
                <div key={`${member.user?._id || "unassigned"}-${index}`} className="leaderRow">
                  <div>
                    <div className="leaderName">{member.user?.email || "Unassigned"}</div>
                    <div className="leaderMeta">{member.followups || 0} in follow-up</div>
                  </div>
                  <div className="leaderStats">
                    <span>{member.total || 0} leads</span>
                    <strong>{member.converted || 0} closed</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Tab({ icon, label, active, onClick }) {
  return (
    <div onClick={onClick} className={active ? "tab activeTab" : "tab"}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function KpiCard({ title, value, onClick, accent, icon }) {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    let start = 0;
    const end = value || 0;
    const duration = 220;
    const increment = end / Math.max(duration / 20, 1);

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
    <div className="kpiCard" onClick={onClick} style={{ cursor: "pointer", borderTop: `4px solid ${accent}` }}>
      <div className="kpiHead">
        <h4>{title}</h4>
        <span className="kpiBadge" style={{ color: accent, background: `${accent}16` }}>
          {icon}
        </span>
      </div>
      <div className="kpiCircle">{count}</div>
    </div>
  );
}

function MiniCard({ title, value }) {
  return (
    <div className="miniCard">
      <span>{title}</span>
      <strong>{value || 0}</strong>
    </div>
  );
}
