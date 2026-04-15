console.log("leadRoutes loaded");

const express = require("express");
const mongoose = require("mongoose");
const Lead = require("../models/lead");
const Activity = require("../models/activity");
const User = require("../models/user");
const { protect, allowRoles } = require("../middleware/authMiddleware");
const { sendPushToCurrentDevice } = require("../utils/pushNotifications");

const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const STATUS_META = [
  { key: "new", label: "New" },
  { key: "followup", label: "Follow Up" },
  { key: "not_interested", label: "Not Interested" },
  { key: "junk", label: "Junk" },
  { key: "closed", label: "Closed" },
  { key: "site_visit_planned", label: "Site Visit Planned" },
  { key: "site_visit_done", label: "Site Visit Done" },
];

const PURPOSE_META = [
  { key: "call", label: "Call" },
  { key: "meeting", label: "Meeting" },
  { key: "site_visit", label: "Site Visit" },
  { key: "followup", label: "Follow Up" },
  { key: "negotiation", label: "Negotiation" },
  { key: "closure", label: "Closure" },
];

function formatHumanLabel(value, fallback = "Unknown") {
  if (!value) return fallback;
  return String(value).replace(/_/g, " ");
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

    if (lead.status === "closed") {
      bucket.closed += 1;
    }

    if (lead.status === "followup") {
      bucket.followup += 1;
    }
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
    if (bucket) {
      bucket.leads += 1;
    }
  });

  activities.forEach((activity) => {
    const activityDate = new Date(activity.activityDateTime);
    if (Number.isNaN(activityDate.getTime())) return;

    const bucket = daily[activityDate.getDate() - 1];
    if (bucket) {
      bucket.activities += 1;
    }
  });

  return daily;
}

function normalizeStatus(status) {
  if (!status) return "new";

  const map = {
    new: "new",
    followup: "followup",
    "follow up": "followup",
    "not interested": "not_interested",
    not_interested: "not_interested",
    junk: "junk",
    closed: "closed",
    "site visit planned": "site_visit_planned",
    site_visit_planned: "site_visit_planned",
    "site visit done": "site_visit_done",
    site_visit_done: "site_visit_done",
  };

  return map[String(status).toLowerCase().trim()] || "new";
}

function normalizePurpose(purpose) {
  if (!purpose) return "followup";

  const allowed = new Set([
    "call",
    "meeting",
    "site_visit",
    "followup",
    "negotiation",
    "closure",
  ]);

  const value = String(purpose).toLowerCase().trim().replace(/\s+/g, "_");
  return allowed.has(value) ? value : "followup";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone);
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function parseDateOrNull(value) {
  if (!value) return null;

  const stringValue = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(stringValue)) {
    return new Date(stringValue);
  }

  const date = new Date(stringValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getEffectiveReminderDate(lead) {
  return lead?.reminderDate || lead?.nextFollowUpDate || null;
}

function shiftDateByMinutes(value, minutes) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Date(date.getTime() + minutes * 60 * 1000);
}

function getReminderState(reminderDateValue, now = new Date()) {
  const reminderDate =
    reminderDateValue instanceof Date ? reminderDateValue : new Date(reminderDateValue);

  if (Number.isNaN(reminderDate.getTime())) {
    return {
      key: "unscheduled",
      label: "Unscheduled",
      priority: 99,
    };
  }

  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  if (reminderDate < now) {
    return {
      key: "overdue",
      label: "Overdue",
      priority: 2,
    };
  }

  if (reminderDate <= endOfToday) {
    return {
      key: "today",
      label: "Today",
      priority: 0,
    };
  }

  return {
    key: "upcoming",
    label: "Upcoming",
    priority: 1,
  };
}

function getNotificationPriority(item) {
  if (item?.isAlertActive && item?.reminderState === "overdue") return 0;
  if (item?.isAlertActive && item?.reminderState === "today") return 1;
  if (item?.reminderState === "overdue") return 2;
  if (item?.isAlertActive) return 3;
  if (item?.reminderState === "today") return 4;
  if (item?.reminderState === "upcoming") return 5;
  return 6;
}

async function applyLeadScope(req, filter = {}) {
  const scopedFilter = { ...filter };

  if (req.user.role === "admin") {
    return scopedFilter;
  }

  if (req.user.role === "sales_agent") {
    scopedFilter.assignedTo = new mongoose.Types.ObjectId(req.user.id);
    return scopedFilter;
  }

  if (req.user.role === "sales_manager") {
    const managerId = new mongoose.Types.ObjectId(req.user.id);
    const agents = await User.find({ role: "sales_agent" }).select("_id");
    const agentIds = agents.map((agent) => agent._id);

    scopedFilter.$or = [
      { assignedTo: managerId },
      { createdBy: managerId },
      { assignedTo: { $in: agentIds } },
      { assignedTo: null, createdBy: managerId },
    ];
  }

  return scopedFilter;
}

function buildLeadPayload(body, currentUserId, { isNew = false } = {}) {
  const parsedReminderDate = parseDateOrNull(body.reminderDate);
  const parsedNextFollowUpDate = parseDateOrNull(body.nextFollowUpDate);
  const reminderDate = parsedReminderDate || parsedNextFollowUpDate;
  const nextFollowUpDate = parsedNextFollowUpDate || parsedReminderDate;
  const hasAssignedTo = Object.prototype.hasOwnProperty.call(body, "assignedTo");
  let assignedTo;

  if (hasAssignedTo) {
    assignedTo =
      body.assignedTo && isValidObjectId(body.assignedTo)
        ? new mongoose.Types.ObjectId(body.assignedTo)
        : null;
  } else if (isNew) {
    assignedTo = new mongoose.Types.ObjectId(currentUserId);
  }

  const payload = {
    name: String(body.name || "").trim(),
    email: String(body.email || "").trim().toLowerCase(),
    phone: String(body.phone || "").replace(/\D/g, ""),
    status: normalizeStatus(body.status),
    purpose: normalizePurpose(body.purpose),
    source: String(body.source || "").trim(),
    location: String(body.location || "").trim(),
    notes: String(body.notes || "").trim(),
    reminderDate,
    nextFollowUpDate,
  };

  if (hasAssignedTo || isNew) {
    payload.assignedTo = assignedTo;
  }

  if (body.budget !== undefined && body.budget !== "") {
    payload.budget = Number(body.budget) || 0;
  }

  const reminderTouched =
    Object.prototype.hasOwnProperty.call(body, "reminderDate") ||
    Object.prototype.hasOwnProperty.call(body, "nextFollowUpDate");
  if (reminderTouched) {
    payload.reminderSent = false;
    payload.reminderRead = false;
  }

  if (isNew) {
    payload.createdBy = new mongoose.Types.ObjectId(currentUserId);
  }

  return payload;
}

const upload = multer({
  dest: path.join(__dirname, "../uploads"),
});

router.get("/notifications", protect, async (req, res) => {
  try {
    const filter = await applyLeadScope(req, {
      isDeleted: false,
      $or: [
        { reminderDate: { $ne: null } },
        { nextFollowUpDate: { $ne: null } },
      ],
    });

    const now = new Date();

    const notifications = await Lead.find(filter)
      .select("name reminderDate nextFollowUpDate purpose status notes assignedTo reminderSent reminderRead")
      .lean();

    const summary = {
      overdue: 0,
      dueToday: 0,
      upcoming: 0,
      totalScheduled: 0,
      unread: 0,
      important: 0,
    };

    const items = notifications
      .map((lead) => {
        const effectiveReminderDate = getEffectiveReminderDate(lead);
        const reminderState = getReminderState(effectiveReminderDate, now);

        if (reminderState.key === "unscheduled") {
          return null;
        }

        const isAlertActive = Boolean(lead.reminderSent && !lead.reminderRead);

        summary.totalScheduled += 1;

        if (reminderState.key === "overdue") {
          summary.overdue += 1;
        } else if (reminderState.key === "today") {
          summary.dueToday += 1;
        } else if (reminderState.key === "upcoming") {
          summary.upcoming += 1;
        }

        if (isAlertActive) {
          summary.unread += 1;
        }

        if (isAlertActive || reminderState.key === "overdue" || reminderState.key === "today") {
          summary.important += 1;
        }

        return {
          ...lead,
          reminderDate: effectiveReminderDate,
          reminderState: reminderState.key,
          reminderStateLabel: reminderState.label,
          isAlertActive,
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        const leftPriority = getNotificationPriority(left);
        const rightPriority = getNotificationPriority(right);

        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }

        return new Date(left.reminderDate) - new Date(right.reminderDate);
      });

    res.json({
      count: summary.unread,
      unreadCount: summary.unread,
      scheduledCount: summary.totalScheduled,
      summary,
      data: items,
    });
  } catch (err) {
    console.log("Notification error:", err);
    res.status(500).json({ message: "Failed to load notifications" });
  }
});

router.post("/notifications/push-sync", protect, async (req, res) => {
  try {
    const requestedIds = Array.isArray(req.body?.notificationIds)
      ? req.body.notificationIds.filter((id) => mongoose.isValidObjectId(id))
      : [];

    if (!requestedIds.length) {
      return res.json({ message: "No notifications selected", sent: 0 });
    }

    const deviceTarget = {
      endpoint: typeof req.body?.endpoint === "string" ? req.body.endpoint.trim() : "",
      nativeToken: typeof req.body?.nativeToken === "string" ? req.body.nativeToken.trim() : "",
    };

    if (!deviceTarget.endpoint && !deviceTarget.nativeToken) {
      return res.status(400).json({ message: "Current device target is required" });
    }

    const filter = await applyLeadScope(req, {
      _id: { $in: requestedIds.map((id) => new mongoose.Types.ObjectId(id)) },
      isDeleted: false,
      $or: [{ reminderDate: { $ne: null } }, { nextFollowUpDate: { $ne: null } }],
    });

    const now = new Date();
    const leads = await Lead.find(filter)
      .select("name reminderDate nextFollowUpDate purpose status notes reminderSent reminderRead")
      .lean();

    const importantItems = leads
      .map((lead) => {
        const effectiveReminderDate = getEffectiveReminderDate(lead);
        const reminderState = getReminderState(effectiveReminderDate, now);
        const isAlertActive = Boolean(lead.reminderSent && !lead.reminderRead);

        if (
          reminderState.key === "unscheduled" ||
          !(isAlertActive || reminderState.key === "overdue" || reminderState.key === "today")
        ) {
          return null;
        }

        return {
          leadId: lead._id.toString(),
          title: `${lead.name || "Lead"} reminder`,
          body: lead.notes || "Follow-up reminder needs attention.",
          tag: `lead-reminder-${lead._id}`,
          url: `/lead/${lead._id}`,
          channelId: "crm-reminders",
          clickAction: "OPEN_CRM_REMINDER",
          data: {
            leadId: lead._id.toString(),
            reminderDate: effectiveReminderDate,
            purpose: lead.purpose || "followup",
            status: lead.status || "new",
            reminderState: reminderState.key,
          },
        };
      })
      .filter(Boolean)
      .sort((left, right) => requestedIds.indexOf(left.leadId) - requestedIds.indexOf(right.leadId))
      .slice(0, 12);

    let sent = 0;
    let skipped = 0;

    for (const item of importantItems) {
      const result = await sendPushToCurrentDevice(req.user.id, deviceTarget, item);
      if (result.sent > 0) {
        sent += result.sent;
      } else {
        skipped += 1;
      }
    }

    res.json({
      message: "Active reminders sent to current device",
      sent,
      skipped,
      count: importantItems.length,
    });
  } catch (err) {
    console.log("Notification push sync error:", err);
    res.status(500).json({ message: "Failed to send active reminders to current device" });
  }
});

router.get("/reports/overview", protect, async (req, res) => {
  try {
    const monthContext = getMonthContext(req.query.month);

    const periodLeadFilter = await applyLeadScope(req, {
      isDeleted: false,
      createdAt: { $gte: monthContext.start, $lt: monthContext.end },
    });

    const yearlyLeadFilter = await applyLeadScope(req, {
      isDeleted: false,
      createdAt: { $gte: monthContext.yearStart, $lt: monthContext.yearEnd },
    });

    const [periodLeads, yearlyLeads] = await Promise.all([
      Lead.find(periodLeadFilter)
        .populate("assignedTo", "email role")
        .populate("createdBy", "email role")
        .sort({ createdAt: -1 })
        .lean(),
      Lead.find(yearlyLeadFilter).lean(),
    ]);

    const leadIds = periodLeads.map((lead) => lead._id);

    const activities = leadIds.length
      ? await Activity.find({
          leadId: { $in: leadIds },
          activityDateTime: { $gte: monthContext.start, $lt: monthContext.end },
        })
          .populate("leadId", "name assignedTo")
          .populate("createdBy", "email role")
          .sort({ activityDateTime: -1 })
          .lean()
      : [];

    const statusCounts = STATUS_META.reduce(
      (acc, item) => ({ ...acc, [item.key]: 0 }),
      {}
    );

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
          if (reminderDate < todayStart) {
            overdueReminders += 1;
          } else if (reminderDate >= todayStart && reminderDate < tomorrowStart) {
            dueToday += 1;
          } else {
            upcomingReminders += 1;
          }
        }
      }
    });

    const activityTypeBreakdown = buildCountList(
      activities,
      (activity) => formatHumanLabel(activity.activityType, "Other")
    );

    const activityOutcomeBreakdown = buildCountList(
      activities.filter((activity) => activity.outcome),
      (activity) => activity.outcome
    );

    const sourceBreakdown = buildCountList(
      periodLeads,
      (lead) => normalizeSource(lead.source)
    );

    const purposeBreakdown = buildCountList(
      periodLeads,
      (lead) => formatHumanLabel(lead.purpose, "Follow Up")
    );

    const statusBreakdown = STATUS_META.map((item) => ({
      key: item.key,
      label: item.label,
      count: statusCounts[item.key] || 0,
    }));

    const assigneeMap = new Map();

    periodLeads.forEach((lead) => {
      const assigneeId = lead.assignedTo?._id?.toString() || "unassigned";
      const assigneeName = lead.assignedTo?.email || "Unassigned";
      const assigneeRole = lead.assignedTo?.role || "";

      if (!assigneeMap.has(assigneeId)) {
        assigneeMap.set(assigneeId, {
          id: assigneeId,
          name: assigneeName,
          role: assigneeRole,
          total: 0,
          closed: 0,
          followups: 0,
          siteVisitsDone: 0,
        });
      }

      const assignee = assigneeMap.get(assigneeId);
      assignee.total += 1;

      if (lead.status === "closed") {
        assignee.closed += 1;
      }

      if (lead.status === "followup") {
        assignee.followups += 1;
      }

      if (lead.status === "site_visit_done") {
        assignee.siteVisitsDone += 1;
      }
    });

    const assigneeBreakdown = Array.from(assigneeMap.values())
      .map((item) => ({
        ...item,
        conversionRate: item.total
          ? Number(((item.closed / item.total) * 100).toFixed(1))
          : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const leadRegister = periodLeads.map((lead) => ({
      id: lead._id.toString(),
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
    }));

    const activityRegister = activities.map((activity) => ({
      id: activity._id.toString(),
      leadId: activity.leadId?._id?.toString() || "",
      leadName: activity.leadId?.name || "Lead",
      type: formatHumanLabel(activity.activityType, "Activity"),
      rawType: activity.activityType || "",
      outcome: activity.outcome || "No outcome",
      notes: activity.notes || "",
      activityDateTime: activity.activityDateTime,
      nextFollowUpDate: activity.nextFollowUpDate,
      createdBy: activity.createdBy?.email || "",
    }));

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

    res.json({
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
    });
  } catch (err) {
    console.log("Report overview error:", err);
    res.status(500).json({ message: "Failed to load report overview" });
  }
});

router.put("/notifications/:id/read", protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }

    const filter = await applyLeadScope(req, {
      _id: new mongoose.Types.ObjectId(req.params.id),
      isDeleted: false,
    });

    const lead = await Lead.findOne(filter);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    lead.reminderRead = true;
    await lead.save();

    res.json({ message: "Notification marked as read" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to update notification" });
  }
});

router.post(
  "/:id/repair-times",
  protect,
  allowRoles("admin", "sales_manager"),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid Lead ID" });
      }

      const filter = await applyLeadScope(req, {
        _id: new mongoose.Types.ObjectId(req.params.id),
        isDeleted: false,
      });

      const lead = await Lead.findOne(filter);

      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      const activities = await Activity.find({ leadId: lead._id });

      lead.reminderDate = shiftDateByMinutes(lead.reminderDate, -330);
      lead.nextFollowUpDate = shiftDateByMinutes(lead.nextFollowUpDate, -330);
      lead.lastContactedAt = shiftDateByMinutes(lead.lastContactedAt, -330);
      lead.reminderSent = false;
      lead.reminderRead = false;

      await Promise.all([
        lead.save(),
        ...activities.map((activity) => {
          activity.activityDateTime = shiftDateByMinutes(activity.activityDateTime, -330);
          activity.nextFollowUpDate = shiftDateByMinutes(activity.nextFollowUpDate, -330);
          return activity.save();
        }),
      ]);

      const repairedLead = await Lead.findById(lead._id)
        .populate("assignedTo", "email role")
        .populate("createdBy", "email role");

      res.json({
        message: "Lead reminder and activity times repaired",
        lead: repairedLead,
      });
    } catch (err) {
      console.log("Repair times error:", err);
      res.status(500).json({ message: "Failed to repair lead times" });
    }
  }
);

router.post(
  "/bulk-upload",
  protect,
  allowRoles("admin", "sales_manager"),
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const rows = [];

      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csv())
          .on("data", (data) => rows.push(data))
          .on("end", resolve)
          .on("error", reject);
      });

      let inserted = 0;
      let skipped = 0;

      for (const row of rows) {
        const email = String(row.email || "").trim().toLowerCase();
        const phone = String(row.phone || "").replace(/\D/g, "");

        if (!email || !phone || !isValidEmail(email) || !isValidPhone(phone)) {
          skipped++;
          continue;
        }

        const existing = await Lead.findOne({
          $or: [{ email }, { phone }],
        });

        if (existing) {
          skipped++;
          continue;
        }

        await Lead.create({
          name: row.name,
          email,
          phone,
          status: normalizeStatus(row.status),
          purpose: normalizePurpose(row.purpose),
          source: row.source || "",
          notes: row.notes || "",
          reminderDate: parseDateOrNull(row.reminderDate),
          nextFollowUpDate: parseDateOrNull(row.nextFollowUpDate),
          createdBy: req.user.id,
          assignedTo: req.user.id,
        });

        inserted++;
      }

      fs.unlinkSync(req.file.path);

      res.json({
        message: "CSV upload completed",
        inserted,
        skipped,
      });
    } catch (err) {
      console.error("CSV Upload Error:", err);

      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({ message: "CSV upload failed" });
    }
  }
);

router.post(
  "/",
  protect,
  allowRoles("admin", "sales_manager"),
  async (req, res) => {
    try {
      const payload = buildLeadPayload(req.body, req.user.id, { isNew: true });

      if (!payload.name) {
        return res.status(400).json({ message: "Name is required" });
      }

      if (!isValidEmail(payload.email)) {
        return res.status(400).json({ message: "Invalid email" });
      }

      if (!isValidPhone(payload.phone)) {
        return res.status(400).json({ message: "Invalid phone" });
      }

      const lead = await Lead.create(payload);

      const populated = await Lead.findById(lead._id)
        .populate("assignedTo", "email role")
        .populate("createdBy", "email role");

      res.status(201).json(populated);
    } catch (err) {
      console.log("CREATE LEAD ERROR:", err);
      res.status(500).json({ message: "Create lead failed" });
    }
  }
);

router.get("/", protect, async (req, res) => {
  try {
    const filter = await applyLeadScope(req, { isDeleted: false });

    if (req.query.status && req.query.status !== "all") {
      filter.status = normalizeStatus(req.query.status);
    }

    const leads = await Lead.find(filter)
      .populate("assignedTo", "email role")
      .populate("createdBy", "email role")
      .sort({ createdAt: -1 });

    res.json(leads);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Fetch leads failed" });
  }
});

router.get("/stats/summary", protect, async (req, res) => {
  try {
    const filter = await applyLeadScope(req, { isDeleted: false });

    const leads = await Lead.find(filter);

    const result = {
      total: leads.length,
      new: 0,
      followup: 0,
      not_interested: 0,
      junk: 0,
      closed: 0,
      site_visit_planned: 0,
      site_visit_done: 0,
    };

    leads.forEach((lead) => {
      if (Object.prototype.hasOwnProperty.call(result, lead.status)) {
        result[lead.status]++;
      }
    });

    res.json(result);
  } catch (err) {
    console.log("Stats error:", err);
    res.status(500).json({ message: "Stats error" });
  }
});

router.get("/stats/monthly", protect, async (req, res) => {
  try {
    const match = await applyLeadScope(req, { isDeleted: false });

    const data = await Lead.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(data);
  } catch (err) {
    console.log("Monthly error:", err);
    res.status(500).json({ message: "Monthly stats error" });
  }
});

router.get("/stats/team", protect, allowRoles("admin", "sales_manager"), async (req, res) => {
  try {
    const match = await applyLeadScope(req, { isDeleted: false });

    const data = await Lead.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$assignedTo",
          total: { $sum: 1 },
          converted: {
            $sum: {
              $cond: [{ $eq: ["$status", "closed"] }, 1, 0],
            },
          },
          followups: {
            $sum: {
              $cond: [{ $eq: ["$status", "followup"] }, 1, 0],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
          converted: 1,
          followups: 1,
          user: { $arrayElemAt: ["$user", 0] },
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.json(data);
  } catch (err) {
    console.log("Team stats error:", err);
    res.status(500).json({ message: "Team stats error" });
  }
});

router.put(
  "/:id",
  protect,
  allowRoles("admin", "sales_manager"),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid Lead ID" });
      }

      const payload = buildLeadPayload(req.body, req.user.id);

      if (payload.email && !isValidEmail(payload.email)) {
        return res.status(400).json({ message: "Invalid email" });
      }

      if (payload.phone && !isValidPhone(payload.phone)) {
        return res.status(400).json({ message: "Invalid phone" });
      }

      const updated = await Lead.findByIdAndUpdate(req.params.id, payload, {
        new: true,
        runValidators: true,
      })
        .populate("assignedTo", "email role")
        .populate("createdBy", "email role");

      if (!updated) {
        return res.status(404).json({ message: "Lead not found" });
      }

      res.json(updated);
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Update failed" });
    }
  }
);

router.delete(
  "/:id",
  protect,
  allowRoles("admin"),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid Lead ID" });
      }

      await Lead.findByIdAndDelete(req.params.id);
      res.json({ message: "Lead deleted" });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Delete failed" });
    }
  }
);

router.get("/:id", protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid Lead ID" });
    }

    const filter = await applyLeadScope(req, {
      _id: new mongoose.Types.ObjectId(req.params.id),
      isDeleted: false,
    });

    const lead = await Lead.findOne(filter)
      .populate("assignedTo", "email role")
      .populate("createdBy", "email role");

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.json(lead);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Load lead failed" });
  }
});

module.exports = router;
