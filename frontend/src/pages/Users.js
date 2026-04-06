import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("sales_agent");
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const token = localStorage.getItem("token");
  const currentRole = localStorage.getItem("role");
  const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const API = `${BASE_URL}/api/users`;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load users");
    }
  }, [API, token]);

  useEffect(() => {
    if (currentRole === "admin") {
      fetchUsers();
    }
  }, [currentRole, fetchUsers]);

  const addUser = async () => {
    if (users.length >= 10) return toast.error("Maximum 10 users allowed");
    if (!email || !password) return toast.error("Email & Password required");
    if (password.length < 6) return toast.error("Password min 6 characters");

    try {
      setLoading(true);
      await axios.post(API, { email, password, role }, {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  const changeRole = async (id, newRole) => {
    try {
      await axios.put(`${API}/${id}`, { role: newRole }, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
        <p>Only admin can manage users</p>
      </div>
    );
  }

  const userLimitReached = users.length >= 10;

  return (
    <div style={{ ...styles.page, padding: isMobile ? "10px" : "14px" }}>
      <div style={{ ...styles.card, padding: isMobile ? "14px" : "18px" }}>
        <h2 style={styles.title}>User Management</h2>
        <p style={styles.subtitle}>Users: {users.length} / 10</p>

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

          <button onClick={addUser} disabled={loading || userLimitReached} style={styles.button}>
            {userLimitReached ? "User Limit Reached" : loading ? "Adding..." : "Add User"}
          </button>
        </div>

        <div style={styles.list}>
          {users.map((user) => (
            <div key={user._id} style={styles.userRow}>
              <div style={styles.userEmail}>{user.email}</div>

              <select
                value={user.role}
                onChange={(e) => changeRole(user._id, e.target.value)}
                style={styles.roleSelect}
              >
                <option value="sales_agent">Agent</option>
                <option value="sales_manager">Manager</option>
                <option value="admin">Admin</option>
              </select>

              <button onClick={() => deleteUser(user._id)} style={styles.deleteBtn}>
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    justifyContent: "center",
    padding: "14px",
    background: "var(--bg)",
    minHeight: "100vh",
  },
  card: {
    width: "100%",
    maxWidth: "720px",
    background: "var(--card)",
    padding: "18px",
    borderRadius: "18px",
    border: "1px solid var(--border)",
    boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
  },
  title: {
    margin: 0,
    color: "var(--heading)",
    fontSize: 20,
  },
  subtitle: {
    fontSize: 12,
    color: "var(--text)",
    marginBottom: 18,
  },
  form: {
    display: "grid",
    gap: "12px",
  },
  input: {
    padding: "11px 12px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text)",
    fontSize: 14,
  },
  button: {
    padding: "11px 12px",
    borderRadius: "10px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(37,99,235,0.18)",
    fontSize: 13,
  },
  list: {
    marginTop: 20,
  },
  userRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "10px",
    border: "1px solid var(--border)",
    padding: "10px 12px",
    borderRadius: "12px",
    marginBottom: "10px",
    background: "#fff",
  },
  userEmail: {
    flex: "1 1 200px",
    wordBreak: "break-word",
    fontWeight: 600,
    color: "var(--heading)",
    fontSize: 13,
  },
  roleSelect: {
    padding: "7px 10px",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text)",
    fontSize: 12,
  },
  deleteBtn: {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "7px 11px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
  },
  noAccess: {
    textAlign: "center",
    marginTop: "100px",
    color: "var(--text)",
  },
};
