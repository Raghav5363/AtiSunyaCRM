import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, roles }) => {

  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {

    const payload = JSON.parse(atob(token.split(".")[1]));

    /* TOKEN EXPIRED */

    if (payload.exp * 1000 < Date.now()) {

      localStorage.removeItem("token");

      return <Navigate to="/login" replace />;

    }

    /* ROLE CHECK */

    if (roles && !roles.includes(payload.role)) {

      return <Navigate to="/dashboard" replace />;

    }

    return children;

  } catch {

    localStorage.removeItem("token");

    return <Navigate to="/login" replace />;

  }

};

export default ProtectedRoute;