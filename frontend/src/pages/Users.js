import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("sales_agent");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");
  const currentRole = localStorage.getItem("role");

  const BASE_URL =
    process.env.REACT_APP_API_URL || "http://localhost:5000";

  const API = `${BASE_URL}/api/users`;

  /* =========================
     FETCH USERS
  ========================= */
  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch {
      toast.error("Failed to load users");
    }
  }, [API, token]);

  useEffect(() => {
    if (currentRole === "admin") {
      fetchUsers();
    }
  }, [currentRole, fetchUsers]);

  /* =========================
     ADD USER
  ========================= */
  const addUser = async () => {
    if (users.length >= 10)
      return toast.error("Maximum 10 users allowed");

    if (!email || !password)
      return toast.error("Email & Password required");

    if (password.length < 6)
      return toast.error("Password min 6 characters");

    try {
      setLoading(true);

      await axios.post(
        API,
        { email, password, role },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("User added");

      setEmail("");
      setPassword("");
      setRole("sales_agent");

      fetchUsers();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     DELETE USER
  ========================= */
  const deleteUser = async (id) => {
    if (!window.confirm("Delete user?")) return;

    try {
      await axios.delete(`${API}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Deleted");
      fetchUsers();
    } catch {
      toast.error("Delete failed");
    }
  };

  /* =========================
     UPDATE ROLE
  ========================= */
  const changeRole = async (id, newRole) => {
    try {
      await axios.put(
        `${API}/${id}`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Role updated");
      fetchUsers();
    } catch {
      toast.error("Update failed");
    }
  };

  if (currentRole !== "admin") {
    return (
      <div style={styles.noAccess}>
        <h2>Access Denied</h2>
        <p>Only Admin can manage users</p>
      </div>
    );
  }

  const userLimitReached = users.length >= 10;

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2>User Management</h2>

        {/* USER COUNT DISPLAY */}
        <p style={{ fontSize: 14, color: "#666", marginBottom: 15 }}>
          Users: {users.length} / 10
        </p>

        {/* ADD FORM */}
        <div style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            disabled={userLimitReached}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            disabled={userLimitReached}
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={styles.input}
            disabled={userLimitReached}
          >
            <option value="sales_agent">Sales Agent</option>
            <option value="sales_manager">Sales Manager</option>
            <option value="admin">Admin</option>
          </select>

          <button
            onClick={addUser}
            disabled={loading || userLimitReached}
            style={{
              ...styles.button,
              opacity: userLimitReached ? 0.6 : 1,
              cursor: userLimitReached ? "not-allowed" : "pointer"
            }}
          >
            {userLimitReached
              ? "User Limit Reached"
              : loading
              ? "Adding..."
              : "Add User"}
          </button>

          {userLimitReached && (
            <p style={{ color: "red", marginTop: 10 }}>
              Maximum 10 users allowed.
            </p>
          )}
        </div>

        {/* USER LIST */}
        <div style={{ marginTop: 30 }}>
          {users.map((u) => (
            <div key={u._id} style={styles.userRow}>
              <span style={{ flex: 1 }}>{u.email}</span>

              <select
                value={u.role}
                onChange={(e) =>
                  changeRole(u._id, e.target.value)
                }
              >
                <option value="sales_agent">Agent</option>
                <option value="sales_manager">Manager</option>
                <option value="admin">Admin</option>
              </select>

              <button
                onClick={() => deleteUser(u._id)}
                style={styles.deleteBtn}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================
   STYLES
========================= */
const styles = {
  wrapper: {
    display: "flex",
    justifyContent: "center",
    padding: 20,
    background: "#f4f6f9",
    minHeight: "100vh",
  },

  card: {
    width: "100%",
    maxWidth: 500,
    background: "white",
    padding: 25,
    borderRadius: 12,
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  input: {
    padding: 12,
    borderRadius: 8,
    border: "1px solid #ddd",
  },

  button: {
    padding: 14,
    borderRadius: 8,
    border: "none",
    background: "#0b2545",
    color: "white",
    fontWeight: 600,
  },

  userRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "1px solid #eee",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },

  deleteBtn: {
    background: "red",
    color: "white",
    border: "none",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },

  noAccess: {
    textAlign: "center",
    marginTop: 100,
  },
};
