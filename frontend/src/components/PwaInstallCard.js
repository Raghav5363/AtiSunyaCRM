import React, { useEffect, useMemo, useState } from "react";
import {
  FiCheckCircle,
  FiDownload,
  FiExternalLink,
  FiShare2,
  FiSmartphone,
} from "react-icons/fi";

function getIsStandalone() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function getPlatform() {
  const ua = window.navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isSafari =
    isIOS &&
    /Safari/i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|mercury/i.test(ua);

  return {
    isIOS,
    isAndroid,
    isSafari,
    isMobile: isIOS || isAndroid,
  };
}

export default function PwaInstallCard({ compact = false }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(getIsStandalone);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const handleDisplayModeChange = () => {
      setIsInstalled(getIsStandalone());
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    const displayMedia = window.matchMedia("(display-mode: standalone)");
    if (typeof displayMedia.addEventListener === "function") {
      displayMedia.addEventListener("change", handleDisplayModeChange);
    } else if (typeof displayMedia.addListener === "function") {
      displayMedia.addListener(handleDisplayModeChange);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      if (typeof displayMedia.removeEventListener === "function") {
        displayMedia.removeEventListener("change", handleDisplayModeChange);
      } else if (typeof displayMedia.removeListener === "function") {
        displayMedia.removeListener(handleDisplayModeChange);
      }
    };
  }, []);

  const platform = useMemo(getPlatform, []);

  const canPromptInstall = Boolean(deferredPrompt);
  const shouldShow = !isInstalled && (canPromptInstall || platform.isIOS || platform.isMobile);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) {
    return (
      <div style={{ ...styles.card, ...(compact ? styles.compactCard : null), ...styles.successCard }}>
        <div style={styles.row}>
          <FiCheckCircle style={styles.successIcon} />
          <div>
            <div style={styles.title}>App Installed</div>
            <div style={styles.subtext}>
              Open AtiSunya CRM from your home screen for the full mobile app experience.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!shouldShow) {
    return null;
  }

  const isIOSSafariInstall = platform.isIOS && platform.isSafari;
  const isIOSOtherBrowser = platform.isIOS && !platform.isSafari;

  return (
    <div style={{ ...styles.card, ...(compact ? styles.compactCard : null) }}>
      <div style={styles.row}>
        <div style={styles.iconWrap}>
          <FiSmartphone />
        </div>
        <div style={styles.copy}>
          <div style={styles.title}>Install Directly From Link</div>
          <div style={styles.subtext}>
            Save this CRM on your phone like a real app without Play Store or App Store.
          </div>
        </div>
      </div>

      {canPromptInstall && (
        <div style={styles.actionRow}>
          <button type="button" onClick={handleInstall} style={styles.primaryButton}>
            <FiDownload />
            <span>Install App</span>
          </button>
          <div style={styles.caption}>Best on Android Chrome and other installable browsers.</div>
        </div>
      )}

      {isIOSSafariInstall && (
        <div style={styles.instructions}>
          <div style={styles.instructionTitle}>iPhone install steps</div>
          <div style={styles.stepRow}>
            <span style={styles.stepBadge}>1</span>
            <span>Tap <strong>Share</strong> in Safari.</span>
            <FiShare2 style={styles.stepIcon} />
          </div>
          <div style={styles.stepRow}>
            <span style={styles.stepBadge}>2</span>
            <span>Choose <strong>Add to Home Screen</strong>.</span>
          </div>
          <div style={styles.stepRow}>
            <span style={styles.stepBadge}>3</span>
            <span>Turn on <strong>Open as Web App</strong> if shown, then tap <strong>Add</strong>.</span>
          </div>
        </div>
      )}

      {isIOSOtherBrowser && (
        <div style={styles.instructions}>
          <div style={styles.instructionTitle}>iPhone note</div>
          <div style={styles.stepRow}>
            <FiExternalLink style={styles.stepIcon} />
            <span>Open this link in <strong>Safari</strong> to install it on the home screen.</span>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    width: "100%",
    background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))",
    border: "1px solid rgba(148,163,184,0.22)",
    borderRadius: 20,
    padding: 18,
    boxShadow: "0 18px 42px rgba(15,23,42,0.08)",
    textAlign: "left",
  },
  compactCard: {
    padding: 16,
    borderRadius: 18,
  },
  successCard: {
    background: "linear-gradient(180deg, rgba(236,253,245,0.98), rgba(255,255,255,0.98))",
  },
  row: {
    display: "flex",
    gap: 14,
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    background: "linear-gradient(180deg, #eff6ff, #dbeafe)",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: 800,
    color: "#0f172a",
  },
  subtext: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 1.55,
    color: "#475569",
  },
  actionRow: {
    marginTop: 16,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  primaryButton: {
    width: "100%",
    border: "none",
    borderRadius: 14,
    background: "linear-gradient(135deg, #0f172a, #1d4ed8)",
    color: "#fff",
    padding: "14px 16px",
    fontSize: 14,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    boxShadow: "0 14px 28px rgba(29,78,216,0.22)",
  },
  caption: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 1.45,
  },
  instructions: {
    marginTop: 16,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  instructionTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: "#0f172a",
  },
  stepRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
    color: "#334155",
    lineHeight: 1.45,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    background: "#dbeafe",
    color: "#1d4ed8",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 800,
    flexShrink: 0,
  },
  stepIcon: {
    color: "#0f766e",
    flexShrink: 0,
  },
  successIcon: {
    color: "#047857",
    fontSize: 24,
    flexShrink: 0,
    marginTop: 2,
  },
};
