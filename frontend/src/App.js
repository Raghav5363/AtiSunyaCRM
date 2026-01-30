import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import LeadDashboard from "./components/LeadDashboard";
import LeadForm from "./components/LeadForm";
import LeadView from "./pages/LeadView";
import FollowUps from "./pages/FollowUps"; // ✅ ONLY NEW IMPORT
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function App() {
  return (
    <Router>
      <Routes>

        {/* Login Page */}
        <Route path="/login" element={<Login />} />

        {/* Dashboard */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <LeadDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Add Lead */}
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

        {/* Edit Lead */}
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

        {/* View Lead + Activities */}
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

        {/* ✅ FOLLOW-UPS PAGE (ONLY ADDITION) */}
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

      </Routes>

      <ToastContainer position="top-center" autoClose={2000} />
    </Router>
  );
}