import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { FaEnvelope, FaPhoneAlt, FaSms, FaWhatsapp } from "react-icons/fa";
import {
  FiArrowLeft,
  FiCalendar,
  FiChevronDown,
  FiChevronUp,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiTarget,
} from "react-icons/fi";

function formatDateTime(value) {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
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
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [showAllTimeline, setShowAllTimeline] = useState(false);

  const [activityType, setActivityType] = useState("call");
  const [activityDateTime, setActivityDateTime] = useState(toLocalDateTimeInput());
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isCompactMobile = window.innerWidth < 390;

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

  useEffect(() => {
    if (isMobile) {
      setShowMoreDetails(false);
      setShowAllTimeline(false);
      return;
    }

    setShowMoreDetails(true);
    setShowAllTimeline(true);
  }, [isMobile]);

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
  const quickStats = [
    {
      icon: <FiTarget />,
      label: "Lead Status",
      value: normalizeText(lead.status),
    },
    {
      icon: <FiCalendar />,
      label: "Next Follow Up",
      value: formatDateTime(lead.reminderDate || lead.nextFollowUpDate),
      wideOnMobile: true,
    },
    {
      icon: <FiClock />,
      label: "Last Contact",
      value: formatDateTime(lead.lastContactedAt),
      wideOnMobile: true,
    },
  ];
  const visibleActivities = isMobile && !showAllTimeline ? activities.slice(0, 2) : activities;
  const hasHiddenActivities = visibleActivities.length < activities.length;
  const shellStyle = {
    ...styles.shell,
    padding: isMobile ? 12 : 18,
  };
  const heroContentStyle = {
    ...styles.heroContent,
    gap: isMobile ? 10 : 14,
  };
  const heroTitleStyle = {
    ...styles.heroTitle,
    fontSize: isMobile ? 20 : 28,
  };
  const heroEyebrowStyle = isMobile ? styles.heroEyebrowCompact : styles.eyebrow;
  const heroTagStyle = isMobile ? styles.tagCompact : styles.tag;
  const heroSubStyle = isMobile ? styles.heroSubCompact : styles.heroSub;
  const heroCardStyle = {
    ...styles.heroCard,
    borderRadius: isMobile ? 18 : 22,
    padding: isMobile ? 12 : 18,
  };
  const actionRowStyle = isMobile ? styles.actionRowMobile : styles.actionRow;
  const statsGridStyle = {
    ...styles.statsGrid,
    gridTemplateColumns: isMobile
      ? "repeat(2, minmax(0, 1fr))"
      : `repeat(${quickStats.length}, minmax(0, 1fr))`,
  };
  const contentGridStyle = {
    ...styles.contentGrid,
    gridTemplateColumns: isMobile ? "1fr" : "1.1fr 0.9fr",
  };
  const formGridStyle = {
    ...styles.formGrid,
    gridTemplateColumns: isMobile
      ? isCompactMobile
        ? "1fr"
        : "repeat(2, minmax(0, 1fr))"
      : "repeat(2, minmax(0, 1fr))",
  };
  const detailGridStyle = {
    ...styles.detailGrid,
    gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
  };
  const noteInputStyle = {
    ...styles.input,
    ...(isMobile ? styles.inputCompact : null),
    minHeight: isMobile ? 74 : 104,
    resize: "vertical",
  };
  const formInputStyle = isMobile ? { ...styles.input, ...styles.inputCompact } : styles.input;

  return (
    <div style={styles.page}>
      <div style={shellStyle}>
        <button onClick={() => navigate(-1)} style={styles.backButton} type="button">
          <FiArrowLeft />
          Back
        </button>

        <div style={heroCardStyle}>
          <div style={heroContentStyle}>
            <div style={styles.heroHeader}>
              <div>
                <p style={heroEyebrowStyle}>Lead workspace</p>
                <h1 style={heroTitleStyle}>{lead.name}</h1>
              </div>

              <div style={styles.heroTags}>
                <span
                  style={{
                    ...heroTagStyle,
                    color: statusTone.color,
                    background: statusTone.background,
                  }}
                >
                  {normalizeText(lead.status)}
                </span>
                <span
                  style={{
                    ...heroTagStyle,
                    color: reminderTone.color,
                    background: reminderTone.background,
                  }}
                >
                  {reminderTone.label}
                </span>
              </div>
            </div>

            <p style={heroSubStyle}>
              Purpose: {normalizeText(lead.purpose, "followup")} | Source: {lead.source || "Direct"}
            </p>

            <div style={actionRowStyle}>
              <ActionButton
                href={lead.phone ? `tel:${lead.phone}` : undefined}
                icon={<FaPhoneAlt />}
                label="Call"
                compact={isMobile}
              />
              <ActionButton
                href={lead.phone ? `sms:${lead.phone}` : undefined}
                icon={<FaSms />}
                label="SMS"
                compact={isMobile}
              />
              <ActionButton
                href={lead.email ? `mailto:${lead.email}` : undefined}
                icon={<FaEnvelope />}
                label={isMobile ? "Mail" : "Email"}
                compact={isMobile}
              />
              <ActionButton
                href={cleanNumber ? `https://wa.me/${cleanNumber}` : undefined}
                icon={<FaWhatsapp />}
                label={isMobile ? "WA" : "WhatsApp"}
                external
                accent="#25d366"
                compact={isMobile}
              />
            </div>
          </div>
        </div>

        {!isMobile ? (
          <div style={statsGridStyle}>
            {quickStats.map((item) => (
              <StatCard
                key={item.label}
                icon={item.icon}
                label={item.label}
                value={item.value}
                compact={isMobile}
              />
            ))}
          </div>
        ) : null}

        <div style={contentGridStyle}>
          <div style={styles.column}>
            <SectionCard
              title="Add Activity"
              subtitle={
                isMobile
                  ? "Quick update with next follow-up."
                  : "Log every interaction and set the next follow-up reminder."
              }
              style={isMobile ? styles.sectionCardCompact : undefined}
              compact={isMobile}
            >
              <div style={formGridStyle}>
                <Field label={isMobile ? "Type" : "Activity Type"} compact={isMobile}>
                  <select
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value)}
                    style={formInputStyle}
                  >
                    <option value="call">Call</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                  </select>
                </Field>

                <Field label={isMobile ? "Date & Time" : "Activity Date and Time"} compact={isMobile}>
                  <input
                    type="datetime-local"
                    value={activityDateTime}
                    onChange={(e) => setActivityDateTime(e.target.value)}
                    style={formInputStyle}
                  />
                </Field>

                <Field label="Outcome" compact={isMobile}>
                  <select
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    style={formInputStyle}
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

                <Field label={isMobile ? "Follow Up" : "Next Follow Up Date"} compact={isMobile}>
                  <input
                    type="datetime-local"
                    value={nextFollowUpDate}
                    onChange={(e) => setNextFollowUpDate(e.target.value)}
                    style={formInputStyle}
                  />
                </Field>
              </div>

              <Field label="Notes" compact={isMobile}>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={noteInputStyle}
                />
              </Field>

              <div
                style={{
                  ...styles.formFooter,
                  justifyContent: isMobile ? "stretch" : "flex-end",
                }}
              >
                <button
                  onClick={handleAddActivity}
                  style={{
                    ...styles.primaryButton,
                    width: isMobile ? "100%" : "auto",
                    opacity: submitting ? 0.7 : 1,
                  }}
                  type="button"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Add Activity"}
                </button>
              </div>
            </SectionCard>

            {isMobile ? (
              <div style={statsGridStyle}>
                {quickStats.map((item) => (
                   <StatCard
                     key={item.label}
                     icon={item.icon}
                     label={item.label}
                     value={item.value}
                     compact
                     wide={item.wideOnMobile}
                   />
                 ))}
               </div>
            ) : null}

            <SectionCard
              title={isMobile ? "Lead Info" : "Lead Details"}
              subtitle={
                isMobile
                  ? showMoreDetails
                    ? "Useful contact and lead note details."
                    : "Tap view to open extra details."
                  : "Useful lead context without extra clutter."
              }
              action={
                isMobile ? (
                  <button
                    type="button"
                    onClick={() => setShowMoreDetails((current) => !current)}
                    style={styles.secondaryButton}
                  >
                    {showMoreDetails ? "Hide" : "View"}
                    {showMoreDetails ? <FiChevronUp /> : <FiChevronDown />}
                  </button>
                ) : null
              }
              style={isMobile ? styles.sectionCardCompact : undefined}
            >
              {!isMobile || showMoreDetails ? (
                <>
                  <div style={detailGridStyle}>
                    <InfoItem label="Phone" value={lead.phone || "Not set"} compact={isMobile} />
                    <InfoItem label="Email" value={lead.email || "Not set"} compact={isMobile} />
                    <InfoItem
                      label="Source"
                      value={lead.source || "Direct"}
                      compact={isMobile}
                    />
                    <InfoItem
                      label="Next Follow Up"
                      value={formatDateTime(lead.nextFollowUpDate || lead.reminderDate)}
                      compact={isMobile}
                    />
                  </div>

                  <div style={styles.noteSection}>
                    <div style={styles.noteHeading}>Lead Note</div>
                    <div style={styles.noteBlock}>
                      <FiFileText />
                      <span>{lead.notes || "No notes added yet."}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div style={styles.collapsedHint}>
                  Contact details and saved note stay available here when you need them.
                </div>
              )}
            </SectionCard>
          </div>

          <div style={styles.column}>
            <SectionCard
              title="Recent Activity"
              subtitle={
                isMobile
                  ? "Latest updates first."
                  : "Most recent conversations and follow-up outcomes."
              }
              action={
                activities.length > 2 && isMobile ? (
                  <button
                    type="button"
                    onClick={() => setShowAllTimeline((current) => !current)}
                    style={styles.secondaryButton}
                  >
                    {showAllTimeline ? "Show less" : `Show all (${activities.length})`}
                    {showAllTimeline ? <FiChevronUp /> : <FiChevronDown />}
                  </button>
                ) : null
              }
              style={isMobile ? styles.sectionCardCompact : undefined}
            >
              {activities.length === 0 ? (
                <div style={styles.emptyTimeline}>No activities added yet.</div>
              ) : (
                <div style={styles.timelineList}>
                  {visibleActivities.map((activity) => {
                    const followUpTone = getReminderTone(activity.nextFollowUpDate);

                    return (
                      <div
                        key={activity._id}
                        style={{
                          ...styles.timelineItem,
                          padding: isMobile ? 12 : 14,
                        }}
                      >
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

                        <div
                          style={{
                            ...styles.timelineNotes,
                            ...(isMobile ? styles.timelineNotesClamp : null),
                          }}
                        >
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

              {hasHiddenActivities ? (
                <div style={styles.collapsedHint}>
                  Showing latest {visibleActivities.length} activities.
                </div>
              ) : null}
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ href, icon, label, external = false, accent, compact = false }) {
  const disabled = !href;

  return (
    <a
      href={href}
      target={!disabled && external ? "_blank" : undefined}
      rel={!disabled && external ? "noreferrer" : undefined}
      style={{
        ...styles.actionButton,
        ...(compact ? styles.actionButtonCompact : null),
        color: accent || "#ffffff",
        ...(disabled ? styles.actionButtonDisabled : null),
      }}
      aria-disabled={disabled}
      onClick={disabled ? (event) => event.preventDefault() : undefined}
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

function Field({ label, children, compact = false }) {
  return (
    <div style={styles.field}>
      <label style={{ ...styles.label, ...(compact ? styles.labelCompact : null) }}>{label}</label>
      {children}
    </div>
  );
}

function SectionCard({ title, subtitle, children, action = null, style, compact = false }) {
  return (
    <div style={{ ...styles.sectionCard, ...style }}>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionHeaderRow}>
          <div>
            <h3 style={{ ...styles.sectionTitle, ...(compact ? styles.sectionTitleCompact : null) }}>
              {title}
            </h3>
            {subtitle ? (
              <p
                style={{
                  ...styles.sectionSubtitle,
                  ...(compact ? styles.sectionSubtitleCompact : null),
                }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
          {action}
        </div>
      </div>
      {children}
    </div>
  );
}

function StatCard({ icon, label, value, compact = false, wide = false }) {
  return (
    <div
      style={{
        ...styles.statCard,
        ...(compact ? styles.statCardCompact : null),
        ...(wide ? styles.statCardWide : null),
      }}
    >
      <div style={{ ...styles.statIcon, ...(compact ? styles.statIconCompact : null) }}>{icon}</div>
      <div style={styles.statLabel}>{label}</div>
      <div
        style={{ ...styles.statValue, ...(compact ? styles.statValueCompact : null) }}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function InfoItem({ label, value, compact = false }) {
  return (
    <div style={{ ...styles.infoItem, ...(compact ? styles.infoItemCompact : null) }}>
      <div style={styles.infoLabel}>{label}</div>
      <div
        style={{ ...styles.infoValue, ...(compact ? styles.infoValueCompact : null) }}
        title={value}
      >
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
    padding: "0 0 16px",
    boxSizing: "border-box",
  },
  shell: {
    maxWidth: 1180,
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
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
    marginBottom: 10,
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
    boxSizing: "border-box",
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
  heroEyebrowCompact: {
    display: "none",
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
  tagCompact: {
    padding: "7px 10px",
    fontSize: 11,
  },
  heroSub: {
    margin: 0,
    color: "rgba(255,255,255,0.86)",
    fontSize: 13,
    lineHeight: 1.5,
  },
  heroSubCompact: {
    margin: 0,
    color: "rgba(255,255,255,0.86)",
    fontSize: 11,
    lineHeight: 1.45,
    overflowWrap: "anywhere",
  },
  actionRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 10,
  },
  actionRowMobile: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
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
    minHeight: 48,
    boxSizing: "border-box",
    textAlign: "center",
  },
  actionButtonCompact: {
    minWidth: 0,
    minHeight: 44,
    padding: "10px 8px",
    fontSize: 11,
    gap: 6,
    borderRadius: 14,
  },
  actionButtonDisabled: {
    opacity: 0.48,
    pointerEvents: "none",
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
  statCardCompact: {
    padding: 12,
    borderRadius: 16,
  },
  statCardWide: {
    gridColumn: "1 / -1",
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
  statIconCompact: {
    width: 32,
    height: 32,
    borderRadius: 10,
    marginBottom: 10,
    fontSize: 16,
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
  statValueCompact: {
    fontSize: 12,
    lineHeight: 1.4,
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
    boxSizing: "border-box",
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionHeaderRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  sectionTitle: {
    margin: 0,
    color: "var(--heading)",
    fontSize: 18,
  },
  sectionTitleCompact: {
    fontSize: 16,
  },
  sectionSubtitle: {
    margin: "6px 0 0",
    color: "var(--text)",
    fontSize: 13,
    lineHeight: 1.5,
  },
  sectionSubtitleCompact: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 1.35,
  },
  sectionCardCompact: {
    borderRadius: 18,
    padding: 12,
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
  infoItemCompact: {
    padding: 11,
    borderRadius: 14,
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
  infoValueCompact: {
    fontSize: 12,
  },
  noteSection: {
    marginTop: 12,
  },
  noteHeading: {
    marginBottom: 8,
    fontSize: 12,
    color: "var(--heading)",
    fontWeight: 800,
    letterSpacing: "0.02em",
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
    gap: 10,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    marginBottom: 0,
    minWidth: 0,
  },
  label: {
    fontSize: 12,
    color: "var(--heading)",
    fontWeight: 700,
    marginBottom: 6,
  },
  labelCompact: {
    fontSize: 11,
    marginBottom: 4,
  },
  input: {
    width: "100%",
    padding: "12px 13px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--heading)",
    fontSize: 14,
    lineHeight: 1.4,
    minWidth: 0,
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  inputCompact: {
    padding: "9px 11px",
    borderRadius: 10,
    fontSize: 12,
    minHeight: 40,
  },
  formFooter: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 14,
  },
  primaryButton: {
    border: "none",
    borderRadius: 12,
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    padding: "12px 18px",
    minHeight: 48,
    boxSizing: "border-box",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 12px 22px rgba(37,99,235,0.2)",
  },
  secondaryButton: {
    border: "1px solid rgba(37,99,235,0.18)",
    borderRadius: 999,
    background: "#eff6ff",
    color: "#1d4ed8",
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
  },
  collapsedHint: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 1.5,
    color: "var(--muted)",
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
  timelineNotesClamp: {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 3,
    overflow: "hidden",
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
    overflowWrap: "anywhere",
  },
};
