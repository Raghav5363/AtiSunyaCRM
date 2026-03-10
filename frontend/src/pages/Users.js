import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function Users() {

  const [users,setUsers] = useState([]);
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [role,setRole] = useState("sales_agent");
  const [loading,setLoading] = useState(false);

  const token = localStorage.getItem("token");
  const currentRole = localStorage.getItem("role");

  const BASE_URL =
    process.env.REACT_APP_API_URL || "http://localhost:5000";

  const API = `${BASE_URL}/api/users`;

  /* ================= FETCH USERS ================= */

  const fetchUsers = useCallback(async ()=>{

    try{

      const res = await axios.get(API,{
        headers:{ Authorization:`Bearer ${token}` }
      });

      setUsers(res.data);

    }catch{
      toast.error("Failed to load users");
    }

  },[API,token]);

  useEffect(()=>{

    if(currentRole==="admin"){
      fetchUsers();
    }

  },[currentRole,fetchUsers]);


  /* ================= ADD USER ================= */

  const addUser = async()=>{

    if(users.length>=10)
      return toast.error("Maximum 10 users allowed");

    if(!email || !password)
      return toast.error("Email & Password required");

    if(password.length<6)
      return toast.error("Password min 6 characters");

    try{

      setLoading(true);

      await axios.post(
        API,
        {email,password,role},
        {headers:{ Authorization:`Bearer ${token}` }}
      );

      toast.success("User added");

      setEmail("");
      setPassword("");
      setRole("sales_agent");

      fetchUsers();

    }catch(err){

      toast.error(err?.response?.data?.message || "Failed");

    }finally{
      setLoading(false);
    }

  };


  /* ================= DELETE USER ================= */

  const deleteUser = async(id)=>{

    if(!window.confirm("Delete user?")) return;

    try{

      await axios.delete(`${API}/${id}`,{
        headers:{ Authorization:`Bearer ${token}` }
      });

      toast.success("Deleted");

      fetchUsers();

    }catch{

      toast.error("Delete failed");

    }

  };


  /* ================= CHANGE ROLE ================= */

  const changeRole = async(id,newRole)=>{

    try{

      await axios.put(
        `${API}/${id}`,
        {role:newRole},
        {headers:{ Authorization:`Bearer ${token}` }}
      );

      toast.success("Role updated");

      fetchUsers();

    }catch{

      toast.error("Update failed");

    }

  };


  if(currentRole!=="admin"){

    return(

      <div style={styles.noAccess}>
        <h2>Access Denied</h2>
        <p>Only Admin can manage users</p>
      </div>

    );

  }


  const userLimitReached = users.length >= 10;


  return(

    <div style={styles.wrapper}>

      <div style={styles.card}>

        <h2>User Management</h2>

        <p style={{fontSize:14,marginBottom:20}}>
          Users: {users.length} / 10
        </p>


        {/* ADD USER FORM */}

        <div style={styles.form}>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            style={styles.input}
            disabled={userLimitReached}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            style={styles.input}
            disabled={userLimitReached}
          />

          <select
            value={role}
            onChange={(e)=>setRole(e.target.value)}
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
            style={styles.button}
          >

            {userLimitReached
              ? "User Limit Reached"
              : loading
              ? "Adding..."
              : "Add User"}

          </button>

        </div>


        {/* USER LIST */}

        <div style={{marginTop:30}}>

          {users.map((u)=>{

            return(

              <div key={u._id} style={styles.userRow}>

                <div style={styles.userEmail}>
                  {u.email}
                </div>

                <select
                  value={u.role}
                  onChange={(e)=>changeRole(u._id,e.target.value)}
                  style={styles.roleSelect}
                >

                  <option value="sales_agent">Agent</option>
                  <option value="sales_manager">Manager</option>
                  <option value="admin">Admin</option>

                </select>

                <button
                  onClick={()=>deleteUser(u._id)}
                  style={styles.deleteBtn}
                >
                  Delete
                </button>

              </div>

            )

          })}

        </div>

      </div>

    </div>

  );

}


/* ================= STYLES ================= */

const styles = {

wrapper:{
display:"flex",
justifyContent:"center",
padding:"20px",
background:"var(--bg)",
minHeight:"100vh"
},

card:{
width:"100%",
maxWidth:"600px",
background:"var(--card)",
padding:"25px",
borderRadius:"12px",
border:"1px solid var(--border)"
},

form:{
display:"flex",
flexDirection:"column",
gap:"12px"
},

input:{
padding:"12px",
borderRadius:"8px",
border:"1px solid var(--border)"
},

button:{
padding:"12px",
borderRadius:"8px",
border:"none",
background:"#2563eb",
color:"white",
fontWeight:600,
cursor:"pointer"
},

userRow:{
display:"flex",
flexWrap:"wrap",
alignItems:"center",
gap:"10px",
border:"1px solid var(--border)",
padding:"10px",
borderRadius:"8px",
marginBottom:"10px"
},

userEmail:{
flex:"1 1 200px",
wordBreak:"break-word"
},

roleSelect:{
padding:"6px 10px",
borderRadius:"6px",
border:"1px solid var(--border)"
},

deleteBtn:{
background:"red",
color:"white",
border:"none",
padding:"6px 12px",
borderRadius:"6px",
cursor:"pointer"
},

noAccess:{
textAlign:"center",
marginTop:"100px"
}

};