import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { FaEnvelope, FaPhoneAlt, FaSms, FaWhatsapp } from "react-icons/fa";
import {
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiTarget,
  FiUser,
} from "react-icons/fi";

function formatDateTime(value) {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value) {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatEmailDisplay(value, fallback = "Not set") {
  if (!value) return fallback;
  return String(value).trim();
}

function toLocalDateTimeInput(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

function toUtcISOString(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeText(value, fallback = "Not set") {
  if (!value) return fallback;
  return String(value).replace(/_/g, " ");
}

function formatTimelineTime(value) {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getStatusTone(status) {
  const tones = {
    new: { color: "#1d4ed8", background: "#dbeafe" },
    followup: { color: "#b45309", background: "#fef3c7" },
    not_interested: { color: "#b91c1c", background: "#fee2e2" },
    junk: { color: "#475569", background: "#e2e8f0" },
    closed: { color: "#047857", background: "#d1fae5" },
    site_visit_planned: { color: "#6d28d9", background: "#ede9fe" },
    site_visit_done: { color: "#0f766e", background: "#ccfbf1" },
  };

  return tones[status] || { color: "#475569", background: "#e2e8f0" };
}

function getReminderTone(value) {
  if (!value) {
    return { label: "No reminder", color: "#475569", background: "#e2e8f0" };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { label: "No reminder", color: "#475569", background: "#e2e8f0" };
  }

  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  if (date < now) {
    return { label: "Overdue", color: "#b91c1c", background: "#fee2e2" };
  }

  if (date <= endOfToday) {
    return { label: "Today", color: "#b45309", background: "#fef3c7" };
  }

  return { label: "Upcoming", color: "#1d4ed8", background: "#dbeafe" };
}

export default function LeadView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [activityType, setActivityType] = useState("call");
  const [activityDateTime, setActivityDateTime] = useState(toLocalDateTimeInput());
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [repairingTimes, setRepairingTimes] = useState(false);

  const token = localStorage.getItem("token");
  const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const authConfig = useMemo(
    () => ({
      headers: { Authorization: `Bearer ${token}` },
    }),
    [token]
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadLead = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/leads/${id}`, authConfig);
      setLead(res.data);
    } catch {
      toast.error("Failed to load lead");
    }
  }, [BASE_URL, authConfig, id]);

  const loadActivities = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/activities/${id}`, authConfig);
      setActivities(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load activities");
    }
  }, [BASE_URL, authConfig, id]);

  useEffect(() => {
    loadLead();
    loadActivities();
  }, [loadActivities, loadLead]);

  const handleAddActivity = async () => {
    if (!activityDateTime || !outcome || !notes.trim()) {
      toast.error("Fill activity date, outcome, and notes");
      return;
    }

    try {
      setSubmitting(true);

      await axios.post(
        `${BASE_URL}/api/activities/${id}`,
        {
          activityType,
          activityDateTime: toUtcISOString(activityDateTime),
          outcome,
          notes: notes.trim(),
          nextFollowUpDate: toUtcISOString(nextFollowUpDate),
        },
        authConfig
      );

      setActivityType("call");
      setOutcome("");
      setNotes("");
      setNextFollowUpDate("");
      setActivityDateTime(toLocalDateTimeInput());

      await Promise.all([loadLead(), loadActivities()]);

      toast.success("Activity added");
    } catch {
      toast.error("Error adding activity");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRepairTimes = async () => {
    try {
      setRepairingTimes(true);
      const res = await axios.post(
        `${BASE_URL}/api/leads/${id}/repair-times`,
        {},
        authConfig
      );

      if (res.data?.lead) {
        setLead(res.data.lead);
      }

      await loadActivities();
      toast.success("Lead times repaired");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to repair old reminder times"
      );
    } finally {
      setRepairingTimes(false);
    }
  };

  if (!lead) {
    return (
      <div style={styles.loadingShell}>
        <div style={styles.loadingCard}>Loading lead details...</div>
      </div>
    );
  }

  const cleanNumber = lead.phone ? lead.phone.replace(/\D/g, "") : "";
  const statusTone = getStatusTone(lead.status);
  const reminderTone = getReminderTone(lead.reminderDate || lead.nextFollowUpDate);
  const shellStyle = {
    ...styles.shell,
    padding: isMobile ? 12 : 18,
  };
  const canRepairTimes = ["admin", "sales_manager"].includes(
    localStorage.getItem("role") || ""
  );
  const heroTitleStyle = {
    ...styles.heroTitle,
    fontSize: isMobile ? 24 : 28,
  };
  const actionRowStyle = {
    ...styles.actionRow,
    gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
  };
  const statsGridStyle = {
    ...styles.statsGrid,
    gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
  };
  const contentGridStyle = {
    ...styles.contentGrid,
    gridTemplateColumns: isMobile ? "1fr" : "1.1fr 0.9fr",
  };
  const formGridStyle = {
    ...styles.formGrid,
    gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
  };
  const detailGridStyle = {
    ...styles.detailGrid,
    gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
  };

  return (
    <div style={styles.page}>
      <div style={shellStyle}>
        <button onClick={() => navigate(-1)} style={styles.backButton} type="button">
          <FiArrowLeft />
          Back
        </button>

        <div style={styles.heroCard}>
          <div style={styles.heroContent}>
            <div style={styles.heroHeader}>
              <div>
                <p style={styles.eyebrow}>Lead workspace</p>
                <h1 style={heroTitleStyle}>{lead.name}</h1>
              </div>

              <div style={styles.heroTags}>
                <span
                  style={{
                    ...styles.tag,
                    color: statusTone.color,
                    background: statusTone.background,
                  }}
                >
                  {normalizeText(lead.status)}
                </span>
                <span
                  style={{
                    ...styles.tag,
                    color: reminderTone.color,
                    background: reminderTone.background,
                  }}
                >
                  {reminderTone.label}
                </span>
              </div>
            </div>

            <p style={styles.heroSub}>
              Purpose: {normalizeText(lead.purpose, "followup")} | Source: {lead.source || "Direct"}
            </p>

            <div style={actionRowStyle}>
              <ActionButton href={`tel:${lead.phone}`} icon={<FaPhoneAlt />} label="Call" />
              <ActionButton href={`sms:${lead.phone}`} icon={<FaSms />} label="SMS" />
              <ActionButton href={`mailto:${lead.email}`} icon={<FaEnvelope />} label="Email" />
              <ActionButton
                href={`https://wa.me/${cleanNumber}`}
                icon={<FaWhatsapp />}
                label="WhatsApp"
                external
                accent="#25d366"
              />
            </div>
          </div>
        </div>

        <div style={statsGridStyle}>
          <StatCard
            icon={<FiTarget />}
            label="Lead Status"
            value={normalizeText(lead.status)}
          />
          <StatCard
            icon={<FiCalendar />}
            label="Reminder"
            value={formatDateTime(lead.reminderDate || lead.nextFollowUpDate)}
          />
          <StatCard
            icon={<FiUser />}
            label="Assigned To"
            value={formatEmailDisplay(lead.assignedTo?.email, "Unassigned")}
          />
          <StatCard
            icon={<FiClock />}
            label="Last Contact"
            value={formatDateTime(lead.lastContactedAt)}
          />
        </div>

        <div style={contentGridStyle}>
          <div style={styles.column}>
            <SectionCard
              title="Lead Profile"
              subtitle="Core lead details and ownership information."
            >
              <div style={detailGridStyle}>
                <InfoItem label="Email" value={lead.email || "Not set"} />
                <InfoItem label="Phone" value={lead.phone || "Not set"} />
                <InfoItem label="Created On" value={formatDate(lead.createdAt)} />
                <InfoItem
                  label="Created By"
                  value={formatEmailDisplay(lead.createdBy?.email, "Not available")}
                />
                <InfoItem label="Purpose" value={normalizeText(lead.purpose, "followup")} />
                <InfoItem label="Next Follow Up" value={formatDateTime(lead.nextFollowUpDate)} />
              </div>
            </SectionCard>

            <SectionCard
              title="Lead Notes"
              subtitle="Latest notes saved on the lead record."
            >
              <div style={styles.noteBlock}>
                <FiFileText />
                <span>{lead.notes || "No notes added yet."}</span>
              </div>
            </SectionCard>

            <SectionCard
              title="Add Activity"
              subtitle="Log every interaction and set the next follow-up reminder."
            >
              <div style={formGridStyle}>
                <Field label="Activity Type">
                  <select
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value)}
                    style={styles.input}
                  >
                    <option value="call">Call</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                  </select>
                </Field>

                <Field label="Activity Date and Time">
                  <input
                    type="datetime-local"
                    value={activityDateTime}
                    onChange={(e) => setActivityDateTime(e.target.value)}
                    style={styles.input}
                  />
                </Field>

                <Field label="Outcome">
                  <select
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    style={styles.input}
                  >
                    <option value="">Select outcome</option>
                    <option value="Connected">Connected</option>
                    <option value="Not Picked">Not Picked</option>
                    <option value="Busy">Busy</option>
                    <option value="Switch Off">Switch Off</option>
                    <option value="Interested">Interested</option>
                    <option value="Visited">Visited</option>
                  </select>
                </Field>

                <Field label="Next Follow Up Date">
                  <input
                    type="datetime-local"
                    value={nextFollowUpDate}
                    onChange={(e) => setNextFollowUpDate(e.target.value)}
                    style={styles.input}
                  />
                </Field>
              </div>

              <Field label="Notes">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ ...styles.input, minHeight: 104, resize: "vertical" }}
                />
              </Field>

              <div style={styles.formFooter}>
                <button
                  onClick={handleAddActivity}
                  style={{
                    ...styles.primaryButton,
                    opacity: submitting ? 0.7 : 1,
                  }}
                  type="button"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Add Activity"}
                </button>
              </div>
            </SectionCard>
          </div>

          <div style={styles.column}>
            <SectionCard
              title="Reminder and Ownership"
              subtitle="Keep reminder dates and role ownership visible at a glance."
            >
              {canRepairTimes && (
                <div style={styles.repairBar}>
                  <div style={styles.repairCopy}>
                    Fix older entries if reminder or timeline times were saved 5 hours 30 minutes ahead.
                  </div>
                  <button
                    type="button"
                    onClick={handleRepairTimes}
                    disabled={repairingTimes}
                    style={{
                      ...styles.secondaryButton,
                      opacity: repairingTimes ? 0.7 : 1,
                    }}
                  >
                    {repairingTimes ? "Repairing..." : "Repair old times"}
                  </button>
                </div>
              )}

              <div style={detailGridStyle}>
                <InfoItem label="Reminder Date" value={formatDateTime(lead.reminderDate)} />
                <InfoItem label="Reminder State" value={lead.reminderSent ? "Sent" : "Pending"} />
                <InfoItem label="Read Status" value={lead.reminderRead ? "Read" : "Unread"} />
                <InfoItem label="Assigned Role" value={lead.assignedTo?.role || "Not assigned"} />
              </div>
            </SectionCard>

            <SectionCard
              title="Activity Timeline"
              subtitle="Most recent conversations and follow-up outcomes."
            >
              {activities.length === 0 ? (
                <div style={styles.emptyTimeline}>No activities added yet.</div>
              ) : (
                <div style={styles.timelineList}>
                  {activities.map((activity) => {
                    const followUpTone = getReminderTone(activity.nextFollowUpDate);

                    return (
                      <div key={activity._id} style={styles.timelineItem}>
                        <div style={styles.timelineTop}>
                          <div>
                            <div style={styles.timelineType}>
                              {normalizeText(activity.activityType, "activity")}
                            </div>
                            <div style={styles.timelineOutcome}>
                              {activity.outcome || "No outcome selected"}
                            </div>
                          </div>

                          {activity.nextFollowUpDate && (
                            <span
                              style={{
                                ...styles.timelineTag,
                                color: followUpTone.color,
                                background: followUpTone.background,
                              }}
                            >
                              {followUpTone.label}
                            </span>
                          )}
                        </div>

                        <div style={styles.timelineNotes}>
                          {activity.notes || "No notes added"}
                        </div>

                        <div style={styles.timelineMeta}>
                          <div style={styles.timelineMetaRow}>
                            <span style={styles.timelineMetaLabel}>
                              <FiClock />
                              Activity time
                            </span>
                            <span style={styles.timelineMetaValue}>
                              {formatTimelineTime(activity.activityDateTime)}
                            </span>
                          </div>
                          <div style={styles.timelineMetaRow}>
                            <span style={styles.timelineMetaLabel}>
                              <FiCheckCircle />
                              Next follow-up
                            </span>
                            <span style={styles.timelineMetaValue}>
                              {activity.nextFollowUpDate
                                ? formatTimelineTime(activity.nextFollowUpDate)
                                : "No follow-up set"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ href, icon, label, external = false, accent }) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      style={{
        ...styles.actionButton,
        color: accent || "#ffffff",
      }}
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

function Field({ label, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
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

function StatCard({ icon, label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue} title={value}>
        {value}
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div style={styles.infoItem}>
      <div style={styles.infoLabel}>{label}</div>
      <div style={styles.infoValue} title={value}>
        {normalizeText(value, "Not set")}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(37,99,235,0.08), transparent 22%), var(--bg)",
    padding: "4px 0 18px",
  },
  shell: {
    maxWidth: 1180,
    margin: "0 auto",
  },
  loadingShell: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg)",
    padding: 18,
  },
  loadingCard: {
    width: "100%",
    maxWidth: 420,
    background: "var(--card)",
    borderRadius: 18,
    border: "1px solid var(--border)",
    padding: 24,
    textAlign: "center",
    color: "var(--heading)",
    boxShadow: "0 14px 28px rgba(15,23,42,0.06)",
  },
  backButton: {
    border: "none",
    background: "transparent",
    color: "#2563eb",
    cursor: "pointer",
    marginBottom: 12,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 800,
    padding: "4px 0",
  },
  heroCard: {
    background: "linear-gradient(135deg, #0f172a, #1d4ed8 72%, #38bdf8)",
    borderRadius: 22,
    padding: 18,
    color: "#fff",
    boxShadow: "0 18px 36px rgba(29,78,216,0.24)",
    marginBottom: 14,
  },
  heroContent: {
    display: "grid",
    gap: 14,
  },
  heroHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  eyebrow: {
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontSize: 11,
    opacity: 0.82,
  },
  heroTitle: {
    margin: "8px 0 0",
    fontSize: 28,
    lineHeight: 1.1,
  },
  heroTags: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  tag: {
    padding: "8px 11px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
  },
  heroSub: {
    margin: 0,
    color: "rgba(255,255,255,0.86)",
    fontSize: 13,
    lineHeight: 1.5,
  },
  actionRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 10,
  },
  actionButton: {
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 16,
    padding: "12px 10px",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    color: "#fff",
    fontWeight: 700,
    fontSize: 13,
    minWidth: 0,
    textAlign: "center",
  },
  statsGrid: {
    display: "grid",
    gap: 12,
    marginBottom: 14,
  },
  statCard: {
    background: "rgba(255,255,255,0.88)",
    border: "1px solid var(--border)",
    borderRadius: 18,
    padding: 14,
    boxShadow: "0 12px 22px rgba(15,23,42,0.05)",
    minWidth: 0,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    fontSize: 18,
  },
  statLabel: {
    fontSize: 12,
    color: "var(--text)",
    marginBottom: 6,
  },
  statValue: {
    fontSize: 14,
    color: "var(--heading)",
    fontWeight: 800,
    lineHeight: 1.45,
    minWidth: 0,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  contentGrid: {
    display: "grid",
    gap: 14,
    alignItems: "start",
  },
  column: {
    display: "grid",
    gap: 14,
  },
  sectionCard: {
    background: "rgba(255,255,255,0.9)",
    border: "1px solid var(--border)",
    borderRadius: 20,
    padding: 16,
    boxShadow: "0 12px 24px rgba(15,23,42,0.05)",
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    margin: 0,
    color: "var(--heading)",
    fontSize: 18,
  },
  sectionSubtitle: {
    margin: "6px 0 0",
    color: "var(--text)",
    fontSize: 13,
    lineHeight: 1.5,
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },
  infoItem: {
    background: "rgba(248,250,252,0.92)",
    borderRadius: 16,
    padding: 12,
    border: "1px solid rgba(226,232,240,0.9)",
    minWidth: 0,
  },
  infoLabel: {
    fontSize: 11,
    color: "var(--text)",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  infoValue: {
    fontSize: 13,
    color: "var(--heading)",
    fontWeight: 700,
    lineHeight: 1.45,
    minWidth: 0,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  noteBlock: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    background: "rgba(248,250,252,0.92)",
    border: "1px solid rgba(226,232,240,0.9)",
    color: "var(--text)",
    lineHeight: 1.6,
  },
  formGrid: {
    display: "grid",
    gap: 12,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: "var(--heading)",
    fontWeight: 700,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "12px 13px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text)",
    fontSize: 14,
  },
  formFooter: {
    display: "flex",
    justifyContent: "flex-end",
  },
  primaryButton: {
    border: "none",
    borderRadius: 12,
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    padding: "12px 18px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 12px 22px rgba(37,99,235,0.2)",
  },
  secondaryButton: {
    border: "1px solid rgba(37,99,235,0.18)",
    borderRadius: 12,
    background: "rgba(239,246,255,0.92)",
    color: "#1d4ed8",
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  emptyTimeline: {
    padding: 18,
    borderRadius: 16,
    background: "rgba(248,250,252,0.92)",
    border: "1px solid rgba(226,232,240,0.9)",
    color: "var(--text)",
    textAlign: "center",
  },
  timelineList: {
    display: "grid",
    gap: 12,
  },
  timelineItem: {
    border: "1px solid rgba(226,232,240,0.92)",
    background: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    padding: 14,
  },
  timelineTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  timelineType: {
    fontSize: 14,
    fontWeight: 800,
    color: "var(--heading)",
    textTransform: "capitalize",
  },
  timelineOutcome: {
    fontSize: 12,
    color: "#2563eb",
    marginTop: 4,
    fontWeight: 700,
  },
  timelineTag: {
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 800,
  },
  timelineNotes: {
    marginTop: 10,
    color: "var(--text)",
    fontSize: 13,
    lineHeight: 1.6,
  },
  timelineMeta: {
    marginTop: 12,
    display: "grid",
    gap: 10,
  },
  timelineMetaRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  timelineMetaLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    color: "var(--text)",
    fontSize: 12,
    fontWeight: 700,
  },
  timelineMetaValue: {
    color: "var(--heading)",
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.5,
  },
  repairBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 14px",
    marginBottom: 12,
    borderRadius: 16,
    background: "rgba(239,246,255,0.72)",
    border: "1px solid rgba(191,219,254,0.9)",
    flexWrap: "wrap",
  },
  repairCopy: {
    color: "#1e3a8a",
    fontSize: 12,
    lineHeight: 1.5,
  },
};
