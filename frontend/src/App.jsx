import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

// Context
import { AuthProvider } from "@/contexts/AuthContext";
import { SystemSettingsProvider } from "@/contexts/SystemSettingsContext";

// Layouts
import MainLayout from "@/layouts/MainLayout";

// Auth Pages
import Login from "@/pages/auth/Login";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import DashboardSelector from "@/pages/auth/DashboardSelector";

// Common Pages
import PersonalInfo from "@/components/PersonalInfo";

// Admin Pages
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminManagement from "@/pages/admin/Management";
import ClassManagement from "@/pages/admin/ClassManagement";
import ContinuousRecognition from "@/pages/admin/ContinuousRecognition";
import UIDemo from "@/pages/admin/UIDemo";

// Homeroom Pages
import HomeroomDashboard from "@/pages/homeroom/Dashboard";
import StudentList from "@/pages/homeroom/StudentList";
import AttendanceView from "@/pages/homeroom/AttendanceView";
import FaceManagement from "@/pages/homeroom/FaceManagement";
import HomeroomGradeManagement from "@/pages/homeroom/GradeManagement";

// Subject Teacher Pages
import SubjectDashboard from "@/pages/subject/Dashboard";
import SubjectGradeManagement from "@/pages/subject/GradeManagement";

// Protected Route Wrapper
import ProtectedRoute from "@/components/routing/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SystemSettingsProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Dashboard Selector - Protected but outside MainLayout */}
            <Route path="/select-dashboard" element={<DashboardSelector />} />

            {/* Protected Routes wrapped in MainLayout */}
            <Route path="/" element={<MainLayout />}>
              
              {/* Common Routes */}
              <Route path="profile" element={<PersonalInfo />} />
              
              {/* Admin Routes */}
              <Route element={<ProtectedRoute roles={['admin']} />}>
                <Route index element={<AdminDashboard />} /> {/* Default for Admin */}
                <Route path="admin/dashboard" element={<AdminDashboard />} />
                <Route path="admin/management" element={<AdminManagement />} />
                <Route path="admin/classes" element={<ClassManagement />} />
                <Route path="admin/continuous" element={<ContinuousRecognition isAdmin={true} />} />
                <Route path="admin/ui-demo" element={<UIDemo />} />
              </Route>

              {/* Homeroom Teacher Routes */}
              <Route element={<ProtectedRoute roles={['teacher', 'homeroom_teacher']} />}>
                <Route path="homeroom/dashboard" element={<HomeroomDashboard />} />
                <Route path="homeroom/students" element={<StudentList isHomeroom={true} />} />
                <Route path="homeroom/attendance" element={<AttendanceView isHomeroom={true} />} />
                <Route path="homeroom/faces" element={<FaceManagement isHomeroom={true} />} />
                <Route path="homeroom/continuous" element={<ContinuousRecognition isHomeroom={true} />} />
                <Route path="homeroom/grades" element={<HomeroomGradeManagement isHomeroom={true} />} />
              </Route>

              {/* Subject Teacher Routes */}
              <Route element={<ProtectedRoute roles={['teacher', 'subject_teacher']} />}>
                <Route path="subject/dashboard" element={<SubjectDashboard />} />
                <Route path="subject/grades" element={<SubjectGradeManagement />} />
              </Route>

              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </SystemSettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
