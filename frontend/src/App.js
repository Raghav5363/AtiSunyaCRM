import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import LeadDashboard from "./components/Leads";
import LeadForm from "./components/LeadForm";
import LeadView from "./pages/LeadView";
import FollowUps from "./pages/FollowUps";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Reports from "./pages/Reports"; // ✅ ADDED

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function App() {
  return (
    <Router>
      <Routes>

        {/* LOGIN */}
        <Route path="/login" element={<Login />} />

        {/* DASHBOARD (HOME) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* LEADS */}
        <Route
          path="/leads"
          element={
            <ProtectedRoute>
              <Layout>
                <LeadDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ADD LEAD */}
        <Route
          path="/add"
          element={
            <ProtectedRoute>
              <Layout>
                <LeadForm />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* EDIT LEAD */}
        <Route
          path="/edit/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <LeadForm />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* VIEW LEAD */}
        <Route
          path="/lead/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <LeadView />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* FOLLOWUPS */}
        <Route
          path="/followups"
          element={
            <ProtectedRoute>
              <Layout>
                <FollowUps />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* USERS */}
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <Layout>
                <Users />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ✅ REPORTS PAGE */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Layout>
                <Reports />
              </Layout>
            </ProtectedRoute>
          }
        />

      </Routes>

      <ToastContainer position="top-center" autoClose={2000} />
    </Router>
  );
}
