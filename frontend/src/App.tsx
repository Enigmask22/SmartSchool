import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import { ROUTES } from "@/utils/constants";
import { Toaster } from "@/components/ui/sonner";

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
import PersonalInfo from "@/pages/profile/PersonalInfo";

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

// Subject Teacher Pages
import SubjectDashboard from "@/pages/subject/Dashboard";
import SubjectScoreManagement from "@/pages/subject/ScoreManagement";

// Protected Route Wrapper
import ProtectedRoute from "@/components/routing/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SystemSettingsProvider>
          <Routes>
            {/* Public Routes */}
            <Route path={ROUTES.LOGIN} element={<Login />} />
            <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
            
            {/* Dashboard Selector - Protected but outside MainLayout */}
            <Route path={ROUTES.SELECT_DASHBOARD} element={<DashboardSelector />} />

            {/* Protected Routes wrapped in MainLayout */}
            <Route path={ROUTES.ROOT} element={<MainLayout />}>
              
              {/* Common Routes */}
              <Route path={ROUTES.PROFILE.substring(1)} element={<PersonalInfo />} />
              
              {/* Admin Routes */}
              <Route element={<ProtectedRoute roles={['admin']} />}>
                <Route index element={<AdminDashboard />} /> {/* Default for Admin */}
                <Route path={ROUTES.ADMIN.DASHBOARD.substring(1)} element={<AdminDashboard />} />
                <Route path={ROUTES.ADMIN.MANAGEMENT.substring(1)} element={<AdminManagement />} />
                <Route path={ROUTES.ADMIN.CLASSES.substring(1)} element={<ClassManagement />} />
                <Route path={ROUTES.ADMIN.CONTINUOUS.substring(1)} element={<ContinuousRecognition />} />
                <Route path={ROUTES.ADMIN.UI_DEMO.substring(1)} element={<UIDemo />} />
              </Route>

              {/* Homeroom Teacher Routes */}
              <Route element={<ProtectedRoute roles={['teacher', 'homeroom_teacher']} />}>
                <Route path={ROUTES.HOMEROOM.DASHBOARD.substring(1)} element={<HomeroomDashboard />} />
                <Route path={ROUTES.HOMEROOM.STUDENTS.substring(1)} element={<StudentList />} />
                <Route path={ROUTES.HOMEROOM.ATTENDANCE.substring(1)} element={<AttendanceView />} />
                <Route path={ROUTES.HOMEROOM.FACES.substring(1)} element={<FaceManagement />} />
              </Route>

              {/* Subject Teacher Routes */}
              <Route element={<ProtectedRoute roles={['teacher', 'subject_teacher']} />}>
                <Route path={ROUTES.SUBJECT.DASHBOARD.substring(1)} element={<SubjectDashboard />} />
                <Route path={ROUTES.SUBJECT.GRADES.substring(1)} element={<SubjectScoreManagement />} />
              </Route>

              {/* Fallback route */}
              <Route path="*" element={<Navigate to={ROUTES.ROOT} replace />} />
            </Route>
          </Routes>
        </SystemSettingsProvider>
        <Toaster/>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
