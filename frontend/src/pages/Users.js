import React, { useEffect, useState } from "react";
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

  const API = "http://localhost:5000/api/users";

  // 🔒 ADMIN CHECK
  if (currentRole !== "admin") {
    return (
      <div style={styles.noAccess}>
        <h2>Access Denied</h2>
        <p>Only Admin can manage users</p>
      </div>
    );
  }

  // FETCH USERS
  const fetchUsers = async () => {
    try {
      const res = await axios.get(API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch {
      toast.error("Failed to load users");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ADD USER
  const addUser = async () => {
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

  // DELETE USER
  const deleteUser = async (id) => {
    if (!window.confirm("Delete user?")) return;

    await axios.delete(`${API}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    toast.success("Deleted");
    fetchUsers();
  };

  // UPDATE ROLE
  const changeRole = async (id, role) => {
    await axios.put(
      `${API}/${id}`,
      { role },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    toast.success("Role updated");
    fetchUsers();
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2>User Management</h2>

        {/* ADD FORM */}
        <div style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={styles.input}
          >
            <option value="sales_agent">Sales Agent</option>
            <option value="sales_manager">Sales Manager</option>
            <option value="admin">Admin</option>
          </select>

          <button
            onClick={addUser}
            disabled={loading}
            style={styles.button}
          >
            {loading ? "Adding..." : "Add User"}
          </button>
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
    cursor: "pointer",
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
