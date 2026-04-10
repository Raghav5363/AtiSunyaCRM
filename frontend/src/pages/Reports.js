import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Legend,
} from "chart.js";
import {
  FiBarChart2,
  FiCalendar,
  FiClock,
  FiDownload,
  FiFileText,
  FiFilter,
  FiRefreshCw,
  FiTarget,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function splitMonthValue(value) {
  const safeValue = /^\d{4}-\d{2}$/.test(String(value || "")) ? String(value) : getCurrentMonthValue();
  const [year, month] = safeValue.split("-");
  return { year, month };
}

function buildYearOptions(selectedYear) {
  const currentYear = new Date().getFullYear();
  const baseYear = Number(selectedYear) || currentYear;
  const years = new Set([currentYear, baseYear]);

  for (let offset = -3; offset <= 3; offset += 1) {
    years.add(baseYear + offset);
  }

  return Array.from(years).sort((a, b) => b - a);
}

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatHumanLabel(value, fallback = "Unknown") {
  if (!value) return fallback;
  return String(value).replace(/_/g, " ");
}

function getBreakdownTone(tone) {
  if (tone === "positive") {
    return { color: "#047857", background: "#d1fae5" };
  }

  if (tone === "warning") {
    return { color: "#b45309", background: "#fef3c7" };
  }

  return { color: "#475569", background: "#e2e8f0" };
}

function normalizeSource(source) {
  const value = String(source || "").trim();
  return value || "Direct/Unknown";
}

function getMonthContext(monthValue) {
  let parsedDate = null;

  if (/^\d{4}-\d{2}$/.test(String(monthValue || ""))) {
    const [yearPart, monthPart] = String(monthValue).split("-").map(Number);

    if (yearPart && monthPart >= 1 && monthPart <= 12) {
      parsedDate = new Date(yearPart, monthPart - 1, 1);
    }
  }

  const baseDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : new Date();
  const year = baseDate.getFullYear();
  const monthIndex = baseDate.getMonth();
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);
  const yearStart = new Date(year, 0, 1, 0, 0, 0, 0);
  const yearEnd = new Date(year + 1, 0, 1, 0, 0, 0, 0);

  return {
    month: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    label: baseDate.toLocaleString("en-IN", { month: "long", year: "numeric" }),
    year,
    monthIndex,
    start,
    end,
    yearStart,
    yearEnd,
    daysInMonth: new Date(year, monthIndex + 1, 0).getDate(),
  };
}

function buildCountList(items, normalizer, sortByCount = true) {
  const counts = new Map();

  items.forEach((item) => {
    const label = normalizer(item);
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  const result = Array.from(counts.entries()).map(([label, count]) => ({
    label,
    count,
  }));

  if (sortByCount) {
    result.sort((a, b) => b.count - a.count);
  }

  return result;
}

function buildMonthlyTrend(leads, year) {
  const trend = Array.from({ length: 12 }, (_, index) => ({
    monthIndex: index,
    month: new Date(year, index, 1).toLocaleString("en-IN", { month: "short" }),
    total: 0,
    closed: 0,
    followup: 0,
  }));

  leads.forEach((lead) => {
    const createdAt = new Date(lead.createdAt);
    if (Number.isNaN(createdAt.getTime())) return;

    const bucket = trend[createdAt.getMonth()];
    if (!bucket) return;

    bucket.total += 1;
    if (lead.status === "closed") bucket.closed += 1;
    if (lead.status === "followup") bucket.followup += 1;
  });

  return trend;
}

function buildDailyTrend(leads, activities, monthContext) {
  const daily = Array.from({ length: monthContext.daysInMonth }, (_, index) => ({
    day: index + 1,
    label: `${index + 1}`,
    leads: 0,
    activities: 0,
  }));

  leads.forEach((lead) => {
    const createdAt = new Date(lead.createdAt);
    if (Number.isNaN(createdAt.getTime())) return;

    const bucket = daily[createdAt.getDate() - 1];
    if (bucket) bucket.leads += 1;
  });

  activities.forEach((activity) => {
    const activityDate = new Date(activity.activityDateTime);
    if (Number.isNaN(activityDate.getTime())) return;

    const bucket = daily[activityDate.getDate() - 1];
    if (bucket) bucket.activities += 1;
  });

  return daily;
}

function buildReportPayload(monthValue, leads, rawActivities) {
  const monthContext = getMonthContext(monthValue);
  const periodLeads = leads.filter((lead) => {
    const createdAt = new Date(lead.createdAt);
    return createdAt >= monthContext.start && createdAt < monthContext.end;
  });
  const yearlyLeads = leads.filter((lead) => {
    const createdAt = new Date(lead.createdAt);
    return createdAt >= monthContext.yearStart && createdAt < monthContext.yearEnd;
  });
  const activities = rawActivities.filter((activity) => {
    const activityDate = new Date(activity.activityDateTime);
    return activityDate >= monthContext.start && activityDate < monthContext.end;
  });

  const statusCounts = {
    new: 0,
    followup: 0,
    not_interested: 0,
    junk: 0,
    closed: 0,
    site_visit_planned: 0,
    site_visit_done: 0,
  };

  let remindersScheduled = 0;
  let overdueReminders = 0;
  let dueToday = 0;
  let upcomingReminders = 0;
  let callsLogged = 0;
  let connectedCalls = 0;
  let pendingCalls = 0;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  periodLeads.forEach((lead) => {
    if (Object.prototype.hasOwnProperty.call(statusCounts, lead.status)) {
      statusCounts[lead.status] += 1;
    }

    if (lead.reminderDate) {
      remindersScheduled += 1;
      const reminderDate = new Date(lead.reminderDate);
      if (!Number.isNaN(reminderDate.getTime())) {
        if (reminderDate < todayStart) overdueReminders += 1;
        else if (reminderDate >= todayStart && reminderDate < tomorrowStart) dueToday += 1;
        else upcomingReminders += 1;
      }
    }
  });

  const statusBreakdown = [
    { key: "new", label: "New", count: statusCounts.new || 0 },
    { key: "followup", label: "Follow Up", count: statusCounts.followup || 0 },
    { key: "not_interested", label: "Not Interested", count: statusCounts.not_interested || 0 },
    { key: "junk", label: "Junk", count: statusCounts.junk || 0 },
    { key: "closed", label: "Closed", count: statusCounts.closed || 0 },
    { key: "site_visit_planned", label: "Site Visit Planned", count: statusCounts.site_visit_planned || 0 },
    { key: "site_visit_done", label: "Site Visit Done", count: statusCounts.site_visit_done || 0 },
  ];

  const sourceBreakdown = buildCountList(periodLeads, (lead) => normalizeSource(lead.source));
  const purposeBreakdown = buildCountList(periodLeads, (lead) => formatHumanLabel(lead.purpose, "Follow Up"));
  const activityTypeBreakdown = buildCountList(activities, (activity) => formatHumanLabel(activity.activityType, "Other"));
  const activityOutcomeBreakdown = buildCountList(
    activities.filter((activity) => activity.outcome),
    (activity) => activity.outcome
  );

  const assigneeMap = new Map();
  periodLeads.forEach((lead) => {
    const assigneeId = lead.assignedTo?._id || lead.assignedTo || "unassigned";
    const assigneeName = lead.assignedTo?.email || "Unassigned";
    const assigneeRole = lead.assignedTo?.role || "";

    if (!assigneeMap.has(assigneeId)) {
      assigneeMap.set(assigneeId, {
        id: String(assigneeId),
        name: assigneeName,
        role: assigneeRole,
        total: 0,
        closed: 0,
        followups: 0,
        siteVisitsDone: 0,
      });
    }

    const item = assigneeMap.get(assigneeId);
    item.total += 1;
    if (lead.status === "closed") item.closed += 1;
    if (lead.status === "followup") item.followups += 1;
    if (lead.status === "site_visit_done") item.siteVisitsDone += 1;
  });

  const assigneeBreakdown = Array.from(assigneeMap.values())
    .map((item) => ({
      ...item,
      conversionRate: item.total ? Number(((item.closed / item.total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const leadRegister = periodLeads
    .map((lead) => ({
      id: lead._id,
      name: lead.name || "Lead",
      phone: lead.phone || "",
      email: lead.email || "",
      source: normalizeSource(lead.source),
      purpose: formatHumanLabel(lead.purpose, "Follow Up"),
      status: formatHumanLabel(lead.status, "New"),
      assignedTo: lead.assignedTo?.email || "Unassigned",
      assignedRole: lead.assignedTo?.role || "",
      createdBy: lead.createdBy?.email || "",
      createdAt: lead.createdAt,
      reminderDate: lead.reminderDate,
      nextFollowUpDate: lead.nextFollowUpDate,
      notes: lead.notes || "",
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const activityRegister = activities
    .map((activity) => ({
      id: activity._id,
      leadId: activity.leadId?._id || activity.leadId || "",
      leadName: activity.leadName || "Lead",
      type: formatHumanLabel(activity.activityType, "Activity"),
      rawType: activity.activityType || "",
      outcome: activity.outcome || "No outcome",
      notes: activity.notes || "",
      activityDateTime: activity.activityDateTime,
      nextFollowUpDate: activity.nextFollowUpDate,
      createdBy: activity.createdBy?.email || "",
    }))
    .sort((a, b) => new Date(b.activityDateTime) - new Date(a.activityDateTime));

  const callActivities = activityRegister.filter((activity) => activity.rawType === "call");
  callsLogged = callActivities.length;
  connectedCalls = callActivities.filter((activity) =>
    ["Connected", "Interested", "Visited"].includes(activity.outcome)
  ).length;
  pendingCalls = callActivities.filter((activity) =>
    ["Not Picked", "Busy", "Switch Off", "No outcome"].includes(activity.outcome)
  ).length;

  const callOutcomeBreakdown = buildCountList(
    callActivities,
    (activity) => activity.outcome || "No outcome"
  );

  const callStatusBoard = callOutcomeBreakdown.map((item) => ({
    ...item,
    tone:
      item.label === "Connected" || item.label === "Interested" || item.label === "Visited"
        ? "positive"
        : item.label === "Busy" || item.label === "Not Picked" || item.label === "Switch Off"
          ? "warning"
          : "neutral",
  }));

  return {
    period: {
      month: monthContext.month,
      label: monthContext.label,
      start: monthContext.start,
      end: monthContext.end,
    },
    summary: {
      totalLeads: periodLeads.length,
      newLeads: statusCounts.new || 0,
      followupLeads: statusCounts.followup || 0,
      closedLeads: statusCounts.closed || 0,
      notInterested: statusCounts.not_interested || 0,
      junk: statusCounts.junk || 0,
      siteVisitPlanned: statusCounts.site_visit_planned || 0,
      siteVisitDone: statusCounts.site_visit_done || 0,
      remindersScheduled,
      overdueReminders,
      dueToday,
      upcomingReminders,
      activitiesLogged: activities.length,
      callsLogged,
      connectedCalls,
      pendingCalls,
      conversionRate: periodLeads.length
        ? Number(((statusCounts.closed / periodLeads.length) * 100).toFixed(1))
        : 0,
    },
    monthlyTrend: buildMonthlyTrend(yearlyLeads, monthContext.year),
    dailyTrend: buildDailyTrend(periodLeads, activities, monthContext),
    statusBreakdown,
    sourceBreakdown,
    purposeBreakdown,
    activityTypeBreakdown,
    activityOutcomeBreakdown,
    callOutcomeBreakdown,
    callStatusBoard,
    assigneeBreakdown,
    recentLeads: leadRegister.slice(0, 8),
    recentActivities: activityRegister.slice(0, 8),
    leadRegister,
    activityRegister,
  };
}

function createCsvContent(report) {
  const rows = [];
  const periodLabel = report?.period?.label || "Selected Month";
  const summary = report?.summary || {};

  rows.push(["CRM Report", periodLabel]);
  rows.push([]);
  rows.push(["Summary"]);
  rows.push(["Total Leads", summary.totalLeads || 0]);
  rows.push(["New Leads", summary.newLeads || 0]);
  rows.push(["Follow Ups", summary.followupLeads || 0]);
  rows.push(["Closed Leads", summary.closedLeads || 0]);
  rows.push(["Site Visit Planned", summary.siteVisitPlanned || 0]);
  rows.push(["Site Visit Done", summary.siteVisitDone || 0]);
  rows.push(["Not Interested", summary.notInterested || 0]);
  rows.push(["Junk", summary.junk || 0]);
  rows.push(["Activities Logged", summary.activitiesLogged || 0]);
  rows.push(["Conversion Rate", `${summary.conversionRate || 0}%`]);
  rows.push([]);

  rows.push([
    "Leads",
    "Name",
    "Phone",
    "Email",
    "Source",
    "Purpose",
    "Status",
    "Assigned To",
    "Created At",
    "Reminder Date",
    "Next Follow Up",
    "Notes",
  ]);

  (report?.leadRegister || []).forEach((lead) => {
    rows.push([
      "",
      lead.name || "",
      lead.phone || "",
      lead.email || "",
      lead.source || "",
      lead.purpose || "",
      lead.status || "",
      lead.assignedTo || "",
      formatDateTime(lead.createdAt),
      formatDateTime(lead.reminderDate),
      formatDateTime(lead.nextFollowUpDate),
      lead.notes || "",
    ]);
  });

  rows.push([]);
  rows.push([
    "Activities",
    "Lead Name",
    "Type",
    "Outcome",
    "Date",
    "Next Follow Up",
    "Created By",
    "Notes",
  ]);

  (report?.activityRegister || []).forEach((activity) => {
    rows.push([
      "",
      activity.leadName || "",
      activity.type || "",
      activity.outcome || "",
      formatDateTime(activity.activityDateTime),
      formatDateTime(activity.nextFollowUpDate),
      activity.createdBy || "",
      activity.notes || "",
    ]);
  });

  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
}

export default function Reports() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role") || "sales_agent";
  const reportRef = useRef(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [month, setMonth] = useState(getCurrentMonthValue());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const { year: selectedYear, month: selectedMonth } = useMemo(() => splitMonthValue(month), [month]);
  const yearOptions = useMemo(() => buildYearOptions(selectedYear), [selectedYear]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchFallbackReport = useCallback(async () => {
    const leadsRes = await axios.get(`${BASE_URL}/api/leads`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const leads = Array.isArray(leadsRes.data) ? leadsRes.data : [];
    const monthContext = getMonthContext(month);
    const periodLeads = leads.filter((lead) => {
      const createdAt = new Date(lead.createdAt);
      return createdAt >= monthContext.start && createdAt < monthContext.end;
    });

    const activityResponses = await Promise.all(
      periodLeads.map(async (lead) => {
        try {
          const res = await axios.get(`${BASE_URL}/api/activities/${lead._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const activities = Array.isArray(res.data) ? res.data : [];
          return activities.map((activity) => ({
            ...activity,
            leadName: lead.name || "Lead",
          }));
        } catch {
          return [];
        }
      })
    );

    const allActivities = activityResponses.flat();
    return buildReportPayload(month, leads, allActivities);
  }, [month, token]);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get(`${BASE_URL}/api/leads/reports/overview`, {
        params: { month },
        headers: { Authorization: `Bearer ${token}` },
      });

      setReport(res.data || null);
    } catch (err) {
      if (err?.response?.status === 404) {
        try {
          const fallbackReport = await fetchFallbackReport();
          setReport(fallbackReport);
          setError("");
        } catch (fallbackError) {
          setError(
            fallbackError?.response?.data?.message ||
              fallbackError?.message ||
              "Failed to load reports"
          );
        }
      } else {
        setError(err?.response?.data?.message || "Failed to load reports");
      }
    } finally {
      setLoading(false);
    }
  }, [month, token, fetchFallbackReport]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const summary = report?.summary || {};
  const pageStyle = {
    ...styles.page,
    padding: isMobile ? 10 : 14,
  };
  const heroStyle = {
    ...styles.hero,
    padding: isMobile ? 14 : 16,
    gap: isMobile ? 12 : 14,
  };
  const titleStyle = {
    ...styles.title,
    fontSize: isMobile ? 20 : 24,
  };
  const subtitleStyle = {
    ...styles.subtitle,
    fontSize: isMobile ? 12 : 13,
  };
  const controlsStyle = {
    ...styles.controls,
    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(150px, 1fr))",
  };
  const bannerStyle = {
    ...styles.banner,
    padding: isMobile ? 14 : 16,
    gap: isMobile ? 10 : 12,
    flexDirection: isMobile ? "column" : "row",
  };
  const bannerTitleStyle = {
    ...styles.bannerTitle,
    fontSize: isMobile ? 18 : 24,
  };
  const kpiGridStyle = {
    ...styles.kpiGrid,
    gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(170px, 1fr))",
  };
  const chartGridStyle = {
    ...styles.chartGrid,
    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))",
  };
  const gridTwoStyle = {
    ...styles.gridTwo,
    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))",
  };
  const chartCanvasStyle = {
    ...styles.chartCanvas,
    height: isMobile ? 220 : 280,
  };

  const monthlyTrendData = useMemo(
    () => ({
      labels: (report?.monthlyTrend || []).map((item) => item.month),
      datasets: [
        {
          label: "Leads",
          data: (report?.monthlyTrend || []).map((item) => item.total || 0),
          backgroundColor: "#2563eb",
          borderRadius: 10,
        },
        {
          label: "Closed",
          data: (report?.monthlyTrend || []).map((item) => item.closed || 0),
          backgroundColor: "#10b981",
          borderRadius: 10,
        },
      ],
    }),
    [report]
  );

  const dailyTrendData = useMemo(
    () => ({
      labels: (report?.dailyTrend || []).map((item) => item.label),
      datasets: [
        {
          label: "Leads",
          data: (report?.dailyTrend || []).map((item) => item.leads || 0),
          backgroundColor: "#3b82f6",
          borderRadius: 6,
        },
        {
          label: "Activities",
          data: (report?.dailyTrend || []).map((item) => item.activities || 0),
          backgroundColor: "#f59e0b",
          borderRadius: 6,
        },
      ],
    }),
    [report]
  );

  const statusPieData = useMemo(
    () => ({
      labels: (report?.statusBreakdown || []).map((item) => item.label),
      datasets: [
        {
          data: (report?.statusBreakdown || []).map((item) => item.count || 0),
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
    }),
    [report]
  );

  const sourceBarData = useMemo(
    () => ({
      labels: (report?.sourceBreakdown || []).slice(0, 6).map((item) => item.label),
      datasets: [
        {
          label: "Leads",
          data: (report?.sourceBreakdown || []).slice(0, 6).map((item) => item.count || 0),
          backgroundColor: "#1d4ed8",
          borderRadius: 10,
        },
      ],
    }),
    [report]
  );

  const activityBarData = useMemo(
    () => ({
      labels: (report?.activityTypeBreakdown || []).map((item) => item.label),
      datasets: [
        {
          label: "Activities",
          data: (report?.activityTypeBreakdown || []).map((item) => item.count || 0),
          backgroundColor: "#0ea5e9",
          borderRadius: 10,
        },
      ],
    }),
    [report]
  );

  const chartOptions = useMemo(
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
      scales: {
        x: {
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
        },
      },
    }),
    []
  );

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

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;

    try {
      setDownloading(true);

      const canvas = await html2canvas(reportRef.current, {
        scale: 1.6,
        useCORS: true,
        backgroundColor: "#f7f9fc",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let position = 0;
      let heightLeft = imgHeight;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`CRM_Report_${report?.period?.month || month}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadCsv = () => {
    const csvContent = createCsvContent(report || {});
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `CRM_Report_${report?.period?.month || month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={styles.loadingCard}>Loading monthly CRM reports...</div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={heroStyle}>
        <div>
          <p style={styles.eyebrow}>Reports</p>
          <h1 style={titleStyle}>Monthly CRM performance reports</h1>
          <p style={subtitleStyle}>
            Month-wise leads, follow-ups, conversions, team activity, and export-ready reporting.
          </p>
        </div>

        <div style={controlsStyle}>
          <div style={styles.filterCard}>
            <span style={styles.filterLabel}>
              <FiFilter />
              Report Month
            </span>
            <div style={styles.monthSelector}>
              <select
                value={selectedMonth}
                onChange={(e) => setMonth(`${selectedYear}-${e.target.value}`)}
                style={styles.monthInput}
              >
                {MONTH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setMonth(`${e.target.value}-${selectedMonth}`)}
                style={styles.monthInput}
              >
                {yearOptions.map((option) => (
                  <option key={option} value={String(option)}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button onClick={fetchReport} style={styles.secondaryButton} type="button">
            <FiRefreshCw />
            Refresh
          </button>

          <button
            onClick={handleDownloadPdf}
            style={styles.primaryButton}
            type="button"
            disabled={downloading}
          >
            <FiDownload />
            {downloading ? "Preparing PDF..." : "Download PDF"}
          </button>

          <button onClick={handleDownloadCsv} style={styles.secondaryButton} type="button">
            <FiFileText />
            Download CSV
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div ref={reportRef}>
        <div style={bannerStyle}>
          <div>
            <div style={styles.bannerLabel}>{report?.period?.label || month}</div>
            <div style={bannerTitleStyle}>
              {role === "admin"
                ? "Business report"
                : role === "sales_manager"
                  ? "Manager report"
                  : "Personal report"}
            </div>
          </div>

          <div style={styles.bannerMeta}>
            <span style={styles.bannerChip}>
              <FiCalendar />
              Month filter active
            </span>
            <span style={styles.bannerChip}>
              <FiUsers />
              Role scoped data
            </span>
          </div>
        </div>

        <div style={kpiGridStyle}>
          <MetricCard
            icon={<FiTarget />}
            title="Total Leads"
            value={summary.totalLeads}
            note="Leads created in selected month"
          />
          <MetricCard
            icon={<FiTrendingUp />}
            title="Closed Leads"
            value={summary.closedLeads}
            note={`${summary.conversionRate || 0}% conversion`}
          />
          <MetricCard
            icon={<FiClock />}
            title="Follow Ups"
            value={summary.followupLeads}
            note={`${summary.activitiesLogged || 0} activities logged`}
          />
          <MetricCard
            icon={<FiBarChart2 />}
            title="Calls Logged"
            value={summary.callsLogged || 0}
            note={`${summary.connectedCalls || 0} connected`}
          />
          <MetricCard
            icon={<FiCalendar />}
            title="Site Visits"
            value={`${summary.siteVisitPlanned || 0} / ${summary.siteVisitDone || 0}`}
            note="Planned / completed"
          />
          <MetricCard
            icon={<FiClock />}
            title="Reminders"
            value={`${summary.overdueReminders || 0} / ${summary.dueToday || 0}`}
            note="Overdue / due today"
          />
          <MetricCard
            icon={<FiClock />}
            title="Pipeline Loss"
            value={`${(summary.notInterested || 0) + (summary.junk || 0)}`}
            note="Not interested + junk"
          />
        </div>

        <div style={chartGridStyle}>
          <ChartCard title="Yearly lead trend" subtitle="Monthly lead intake vs closed count">
            <ChartCanvas style={chartCanvasStyle}>
              <Bar data={monthlyTrendData} options={chartOptions} />
            </ChartCanvas>
          </ChartCard>

          <ChartCard title="Status mix" subtitle="Current result of leads created this month">
            <ChartCanvas style={chartCanvasStyle}>
              <Pie data={statusPieData} options={pieOptions} />
            </ChartCanvas>
          </ChartCard>

          <ChartCard title="Daily flow" subtitle="How many leads and activities happened each day">
            <ChartCanvas style={chartCanvasStyle}>
              <Bar data={dailyTrendData} options={chartOptions} />
            </ChartCanvas>
          </ChartCard>

          <ChartCard title="Top sources" subtitle="Which channels brought the most leads">
            <ChartCanvas style={chartCanvasStyle}>
              <Bar data={sourceBarData} options={chartOptions} />
            </ChartCanvas>
          </ChartCard>

          <ChartCard title="Activity channels" subtitle="How the team connected with leads">
            <ChartCanvas style={chartCanvasStyle}>
              <Bar data={activityBarData} options={chartOptions} />
            </ChartCanvas>
          </ChartCard>
        </div>

        <div style={gridTwoStyle}>
          <SectionCard
            title="Assignee performance"
            subtitle="Who handled the most leads and how they converted"
          >
            {(report?.assigneeBreakdown || []).length === 0 ? (
              <EmptyState text="No assignee data for this month." />
            ) : (
              (report?.assigneeBreakdown || []).map((item) => (
                <div key={item.id} style={styles.row}>
                  <div>
                    <div style={styles.name}>{item.name}</div>
                    <div style={styles.meta}>
                      {item.role ? item.role.replace(/_/g, " ") : "Unassigned"}
                    </div>
                  </div>
                  <div style={styles.rowStats}>
                    <span>{item.total} leads</span>
                    <span>{item.followups} follow-ups</span>
                    <strong>{item.closed} closed</strong>
                    <span>{item.conversionRate}%</span>
                  </div>
                </div>
              ))
            )}
          </SectionCard>

          <SectionCard
            title="Activity type summary"
            subtitle="Which activity channels were used this month"
          >
            {(report?.activityTypeBreakdown || []).length === 0 ? (
              <EmptyState text="No activities logged in this month." />
            ) : (
              <div style={styles.breakdownGrid}>
                {(report?.activityTypeBreakdown || []).map((item) => (
                  <BreakdownCard key={item.label} label={item.label} count={item.count} />
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div style={gridTwoStyle}>
          <SectionCard
            title="Lead register"
            subtitle="Latest leads created in the selected month with current status"
          >
            {(report?.recentLeads || []).length === 0 ? (
              <EmptyState text="No leads found in this month." />
            ) : (
              (report?.recentLeads || []).map((lead) => (
                <div key={lead.id} style={styles.row}>
                  <div>
                    <div style={styles.name}>{lead.name}</div>
                    <div style={styles.meta}>
                      {lead.source} | {lead.assignedTo}
                    </div>
                  </div>
                  <div style={styles.rowStack}>
                    <span style={styles.statusTag}>{lead.status}</span>
                    <span>{lead.purpose}</span>
                    <span>{formatDateTime(lead.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </SectionCard>

          <SectionCard
            title="Recent activity log"
            subtitle="Latest follow-up and communication outcomes in selected month"
          >
            {(report?.recentActivities || []).length === 0 ? (
              <EmptyState text="No activities found in this month." />
            ) : (
              (report?.recentActivities || []).map((activity) => (
                <div key={activity.id} style={styles.row}>
                  <div>
                    <div style={styles.name}>{activity.leadName}</div>
                    <div style={styles.meta}>
                      {activity.type} | {activity.outcome}
                    </div>
                  </div>
                  <div style={styles.rowStack}>
                    <span>{formatDateTime(activity.activityDateTime)}</span>
                    <span>{activity.createdBy || "System"}</span>
                  </div>
                </div>
              ))
            )}
          </SectionCard>
        </div>

        <div style={gridTwoStyle}>
          <SectionCard
            title="Call performance"
            subtitle="Month-wise call outcomes in a clean CRM format"
          >
            {(report?.callStatusBoard || []).length === 0 ? (
              <EmptyState text="No call activity logged in this month." />
            ) : (
              <div style={styles.breakdownGrid}>
                {(report?.callStatusBoard || []).map((item) => (
                  <BreakdownCard
                    key={item.label}
                    label={item.label}
                    count={item.count}
                    tone={item.tone}
                  />
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Purpose breakdown"
            subtitle="What kind of business intent came in this month"
          >
            {(report?.purposeBreakdown || []).length === 0 ? (
              <EmptyState text="No purpose data found." />
            ) : (
              <div style={styles.breakdownGrid}>
                {(report?.purposeBreakdown || []).map((item) => (
                  <BreakdownCard key={item.label} label={item.label} count={item.count} />
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Outcome breakdown"
            subtitle="What happened after activities this month"
          >
            {(report?.activityOutcomeBreakdown || []).length === 0 ? (
              <EmptyState text="No activity outcomes found." />
            ) : (
              <div style={styles.breakdownGrid}>
                {(report?.activityOutcomeBreakdown || []).map((item) => (
                  <BreakdownCard key={item.label} label={item.label} count={item.count} />
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, title, value, note }) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricIcon}>{icon}</div>
      <div style={styles.metricTitle}>{title}</div>
      <div style={styles.metricValue}>{value ?? 0}</div>
      <div style={styles.metricNote}>{note}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div style={styles.chartCard}>
      <div style={styles.sectionHeader}>
        <div>
          <h3 style={styles.sectionTitle}>{title}</h3>
          <p style={styles.sectionSubtitle}>{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ChartCanvas({ children, style }) {
  return <div style={{ ...styles.chartCanvas, ...style }}>{children}</div>;
}

function SectionCard({ title, subtitle, children }) {
  return (
    <div style={styles.sectionCard}>
      <div style={styles.sectionHeader}>
        <div>
          <h3 style={styles.sectionTitle}>{title}</h3>
          <p style={styles.sectionSubtitle}>{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function BreakdownCard({ label, count, tone = "neutral" }) {
  const toneStyle = getBreakdownTone(tone);

  return (
    <div style={{ ...styles.breakdownCard, background: toneStyle.background }}>
      <div style={{ ...styles.breakdownCount, color: toneStyle.color }}>{count || 0}</div>
      <div style={{ ...styles.breakdownLabel, color: toneStyle.color }}>{label}</div>
    </div>
  );
}

function EmptyState({ text }) {
  return <div style={styles.empty}>{text}</div>;
}

const styles = {
  page: {
    padding: 14,
    background:
      "radial-gradient(circle at top left, rgba(37,99,235,0.08), transparent 24%), var(--bg)",
    minHeight: "100vh",
  },
  loadingCard: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 18,
    padding: 24,
    color: "var(--heading)",
    textAlign: "center",
    boxShadow: "0 10px 22px rgba(15,23,42,0.05)",
  },
  hero: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 20,
    padding: 16,
    boxShadow: "0 10px 22px rgba(15,23,42,0.05)",
    display: "grid",
    gap: 14,
    marginBottom: 14,
  },
  eyebrow: {
    margin: 0,
    fontSize: 11,
    color: "#2563eb",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  title: {
    margin: "8px 0 6px",
    color: "var(--heading)",
    fontSize: 24,
  },
  subtitle: {
    margin: 0,
    color: "var(--text)",
    fontSize: 13,
    lineHeight: 1.6,
  },
  controls: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 10,
    alignItems: "stretch",
  },
  filterCard: {
    background: "rgba(239,246,255,0.9)",
    border: "1px solid #bfdbfe",
    borderRadius: 16,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  filterLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    fontWeight: 700,
    color: "#1d4ed8",
  },
  monthSelector: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.2fr) minmax(96px, 0.8fr)",
    gap: 8,
  },
  monthInput: {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 10,
    border: "1px solid #bfdbfe",
    background: "#ffffff",
    color: "#0f172a",
    minWidth: 0,
  },
  primaryButton: {
    border: "none",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    boxShadow: "0 12px 24px rgba(37,99,235,0.18)",
  },
  secondaryButton: {
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--heading)",
    padding: "12px 16px",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
    fontSize: 13,
  },
  banner: {
    background: "linear-gradient(135deg, #0f172a, #1d4ed8 72%, #38bdf8)",
    color: "#fff",
    borderRadius: 20,
    padding: 16,
    boxShadow: "0 16px 30px rgba(29,78,216,0.2)",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  bannerLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    opacity: 0.82,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: 800,
    marginTop: 6,
  },
  bannerMeta: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  bannerChip: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "9px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.16)",
    fontSize: 12,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 12,
    marginBottom: 14,
  },
  metricCard: {
    background: "rgba(255,255,255,0.92)",
    border: "1px solid var(--border)",
    borderRadius: 18,
    padding: 12,
    boxShadow: "0 10px 22px rgba(15,23,42,0.05)",
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    fontSize: 16,
  },
  metricTitle: {
    color: "var(--text)",
    fontSize: 11,
    fontWeight: 700,
  },
  metricValue: {
    marginTop: 6,
    color: "var(--heading)",
    fontSize: 22,
    fontWeight: 800,
  },
  metricNote: {
    marginTop: 5,
    color: "var(--text)",
    fontSize: 11,
    lineHeight: 1.45,
  },
  chartGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 12,
    marginBottom: 14,
  },
  chartCard: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 18,
    padding: 12,
    boxShadow: "0 10px 22px rgba(15,23,42,0.05)",
  },
  chartCanvas: {
    position: "relative",
    height: 280,
  },
  gridTwo: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 12,
    marginBottom: 14,
  },
  sectionCard: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 18,
    padding: 12,
    boxShadow: "0 10px 22px rgba(15,23,42,0.05)",
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    margin: 0,
    color: "var(--heading)",
    fontSize: 16,
  },
  sectionSubtitle: {
    margin: "6px 0 0",
    color: "var(--text)",
    fontSize: 11,
    lineHeight: 1.5,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "12px 0",
    borderBottom: "1px solid var(--border)",
    flexWrap: "wrap",
  },
  name: {
    fontWeight: 700,
    color: "var(--heading)",
    fontSize: 13,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  meta: {
    color: "var(--text)",
    fontSize: 11,
    marginTop: 4,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  rowStats: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
    fontSize: 11,
    color: "var(--text)",
  },
  rowStack: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 5,
    fontSize: 11,
    color: "var(--text)",
  },
  statusTag: {
    padding: "5px 9px",
    borderRadius: 999,
    background: "#eff6ff",
    color: "#1d4ed8",
    fontWeight: 700,
    textTransform: "capitalize",
  },
  breakdownGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 10,
  },
  breakdownCard: {
    padding: 10,
    borderRadius: 16,
    background: "rgba(248,250,252,0.95)",
    border: "1px solid rgba(226,232,240,0.9)",
  },
  breakdownCount: {
    fontSize: 18,
    fontWeight: 800,
    color: "var(--heading)",
  },
  breakdownLabel: {
    marginTop: 4,
    fontSize: 11,
    color: "var(--text)",
    lineHeight: 1.45,
  },
  empty: {
    padding: 10,
    borderRadius: 14,
    background: "rgba(248,250,252,0.95)",
    border: "1px solid rgba(226,232,240,0.9)",
    color: "var(--text)",
    fontSize: 12,
  },
};
