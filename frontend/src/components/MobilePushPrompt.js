import React from "react";
import { FiBell, FiCheckCircle, FiShield, FiX } from "react-icons/fi";
import PwaInstallCard from "./PwaInstallCard";

export default function MobilePushPrompt({
  open,
  loading = false,
  pushState,
  onClose,
  onEnable,
}) {
  if (!open) {
    return null;
  }

  const needsInstall = Boolean(pushState?.needsInstall);
  const permissionDenied = pushState?.permission === "denied";
  const deviceCount = pushState?.deviceCount || 0;
  const otherDeviceNote =
    deviceCount > 0 && !pushState?.subscribed
      ? `This account already has notifications on ${deviceCount} device${deviceCount > 1 ? "s" : ""}. This phone still needs its own setup.`
      : "";

  const title = needsInstall
    ? "Install the app for iPhone alerts"
    : "Enable phone notifications";
  const description = needsInstall
    ? "Install AtiSunya CRM on the home screen first. After that, iPhone can show reminder alerts on the notification screen like a real app."
    : "Turn on reminder alerts for this phone so follow-ups can reach the mobile notification tray even when the CRM is in the background.";

  return (
    <div style={styles.overlay} role="presentation" onClick={onClose}>
      <div
        style={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label="Enable mobile notifications"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" onClick={onClose} style={styles.closeButton} aria-label="Close">
          <FiX />
        </button>

        <div style={styles.header}>
          <div style={styles.iconWrap}>
            {needsInstall ? <FiShield /> : <FiBell />}
          </div>
          <div>
            <div style={styles.title}>{title}</div>
            <div style={styles.text}>{description}</div>
          </div>
        </div>

        <div style={styles.badgeRow}>
          <span style={styles.badge}>Free setup</span>
          <span style={styles.badge}>Real phone alerts</span>
          <span style={styles.badge}>Reminder ready</span>
        </div>

        {otherDeviceNote ? <div style={styles.note}>{otherDeviceNote}</div> : null}

        {needsInstall ? (
          <div style={styles.installWrap}>
            <PwaInstallCard compact />
          </div>
        ) : permissionDenied ? (
          <div style={styles.settingsCard}>
            <FiShield />
            <span>
              Notifications are blocked in browser settings on this phone. Allow them there first,
              then open the reminder bell again.
            </span>
          </div>
        ) : (
          <div style={styles.ctaCard}>
            <div style={styles.ctaRow}>
              <FiCheckCircle />
              <span>One tap will ask for browser notification permission on this phone.</span>
            </div>
            <button
              type="button"
              onClick={onEnable}
              style={styles.primaryButton}
              disabled={loading}
            >
              {loading ? "Enabling..." : "Enable notifications now"}
            </button>
          </div>
        )}

        <button type="button" onClick={onClose} style={styles.secondaryButton}>
          Not now
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.48)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 1600,
    padding: "18px 14px calc(env(safe-area-inset-bottom, 0px) + 14px)",
  },
  sheet: {
    width: "100%",
    maxWidth: 440,
    background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))",
    borderRadius: 24,
    border: "1px solid rgba(226,232,240,0.92)",
    boxShadow: "0 28px 60px rgba(15,23,42,0.22)",
    padding: 18,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    border: "1px solid rgba(226,232,240,0.92)",
    background: "#fff",
    color: "#0f172a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  header: {
    display: "flex",
    gap: 14,
    alignItems: "flex-start",
    paddingRight: 36,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    flexShrink: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: 800,
    color: "#0f172a",
  },
  text: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 1.55,
    color: "#475569",
  },
  badgeRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 16,
  },
  badge: {
    borderRadius: 999,
    padding: "6px 10px",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: 800,
  },
  note: {
    marginTop: 14,
    padding: "12px 14px",
    borderRadius: 16,
    background: "#fff7ed",
    color: "#9a3412",
    fontSize: 12,
    lineHeight: 1.55,
    border: "1px solid #fed7aa",
  },
  installWrap: {
    marginTop: 16,
  },
  settingsCard: {
    marginTop: 16,
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    padding: "14px 15px",
    borderRadius: 18,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#334155",
    fontSize: 12,
    lineHeight: 1.55,
  },
  ctaCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    background: "linear-gradient(180deg, rgba(239,246,255,0.94), rgba(255,255,255,0.98))",
    border: "1px solid #bfdbfe",
  },
  ctaRow: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    color: "#1e3a8a",
    fontSize: 12,
    lineHeight: 1.55,
  },
  primaryButton: {
    width: "100%",
    marginTop: 14,
    border: "none",
    borderRadius: 15,
    background: "linear-gradient(135deg, #0f172a, #1d4ed8)",
    color: "#fff",
    padding: "14px 16px",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 18px 30px rgba(29,78,216,0.24)",
  },
  secondaryButton: {
    width: "100%",
    marginTop: 14,
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    background: "#fff",
    color: "#0f172a",
    padding: "11px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
};
