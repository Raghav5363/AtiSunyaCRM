import React from "react";

export default function DeletePopup({ open, onClose, onConfirm }) {
  if (!open) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.popup}>
        <h3>Are you sure you want to delete this lead?</h3>

        <div style={styles.btnRow}>
          <button style={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>

          <button style={styles.deleteBtn} onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  popup: {
    background: "white",
    padding: "25px",
    borderRadius: 10,
    width: "90%",
    maxWidth: 350,
    textAlign: "center",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
  },
  btnRow: {
    marginTop: 20,
    display: "flex",
    justifyContent: "space-between",
  },
  cancelBtn: {
    padding: "8px 18px",
    borderRadius: 6,
    border: "1px solid #777",
    cursor: "pointer",
    background: "white",
  },
  deleteBtn: {
    padding: "8px 18px",
    borderRadius: 6,
    border: "1px solid red",
    cursor: "pointer",
    background: "red",
    color: "white",
  },
};