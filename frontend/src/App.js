import React, { useState, useContext } from 'react';
import './App.css';

// Context
import { AuthProvider, AuthContext } from './contexts/AuthContext';

// Components
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import AttendanceView from './components/AttendanceView';
import AICamera from './components/AICamera';
import FaceManagement from './components/FaceManagement';
import ContinuousRecognition from './components/ContinuousRecognition';
import AIFeedback from './components/AIFeedback';
import SchoolDaysConfig from './components/SchoolDaysConfig';
import Login from './components/Login';
import GradeManagement from './components/GradeManagement';
import HomeroomDashboard from './components/HomeroomDashboard';
import AdminManagement from './components/AdminManagement';

function AppContent() {
  const { user, loading, isAuthenticated, isHomeroomTeacher, isSubjectTeacher, isAdmin } = useContext(AuthContext);
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Reset view when user changes (login/logout)
  React.useEffect(() => {
    if (!user) {
      // User logged out - reset to default
      setCurrentView('dashboard');
      setHasRedirected(false);
    } else if (!hasRedirected) {
      // User logged in - determine default view based on role (only once per login)
      if (isSubjectTeacher()) {
        console.log('🎯 Subject teacher detected, redirecting to grades page');
        setCurrentView('grades');
      } else if (isHomeroomTeacher()) {
        console.log('🏠 Homeroom teacher detected, redirecting to dashboard');
        setCurrentView('dashboard');
      } else if (isAdmin()) {
        console.log('👑 Admin detected, redirecting to dashboard');
        setCurrentView('dashboard');
      } else {
        // Fallback
        setCurrentView('dashboard');
      }
      setHasRedirected(true);
    }
  }, [user?.id, hasRedirected, isSubjectTeacher, isHomeroomTeacher, isAdmin]); // Include role functions as dependencies

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Login />;
  }

  const renderContent = () => {
    if (isHomeroomTeacher()) {
      // Giáo viên chủ nhiệm - tất cả components được filter theo lớp chủ nhiệm
      switch (currentView) {
        case 'dashboard':
          return <HomeroomDashboard />;
        case 'students':
          return <StudentList isHomeroom={true} />;
        case 'attendance':
          return <AttendanceView isHomeroom={true} />;
        case 'continuous':
          return <ContinuousRecognition isHomeroom={true} />;
        case 'faces':
          return <FaceManagement isHomeroom={true} />;
        case 'feedback':
          return <AIFeedback isHomeroom={true} />;
        case 'grades':
          return <GradeManagement isHomeroom={true} />;
        default:
          return <HomeroomDashboard />;
      }
    } else if (isSubjectTeacher()) {
      // Giáo viên bộ môn - mặc định vào trang Quản lý điểm
      switch (currentView) {
        case 'dashboard':
          return <Dashboard setCurrentView={setCurrentView} />;
        case 'students':
          return <StudentList />;
        case 'attendance':
          return <AttendanceView />;
        case 'camera':
          return <AICamera />;
        case 'continuous':
          return <ContinuousRecognition />;
        case 'faces':
          return <FaceManagement />;
        case 'feedback':
          return <AIFeedback />;
        case 'school-config':
          return <SchoolDaysConfig />;
        case 'grades':
          return <GradeManagement />;
        default:
          return <GradeManagement />; // Default cho giáo viên bộ môn là Quản lý điểm
      }
    } else if (isAdmin()) {
      // Admin - có tất cả quyền truy cập
      switch (currentView) {
        case 'dashboard':
          return <Dashboard setCurrentView={setCurrentView} />;
        case 'students':
          return <StudentList />;
        case 'attendance':
          return <AttendanceView />;
        case 'camera':
          return <AICamera />;
        case 'continuous':
          return <ContinuousRecognition />;
        case 'faces':
          return <FaceManagement />;
        case 'feedback':
          return <AIFeedback />;
        case 'school-config':
          return <SchoolDaysConfig />;
        case 'grades':
          return <GradeManagement />;
        case 'admin-management':
          return <AdminManagement />;
        default:
          return <Dashboard setCurrentView={setCurrentView} />;
      }
    } else {
      // Default fallback
      return (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Chưa được phân quyền</h2>
          <p className="text-gray-600">Vui lòng liên hệ quản trị viên để được cấp quyền truy cập</p>
        </div>
      );
    }
  };

  return (
    <div className="App flex h-screen bg-gray-50">
      <Sidebar 
        currentView={currentView}
        setCurrentView={setCurrentView}
        user={user}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      <main className={`
        flex-1 transition-all duration-300 overflow-auto
        ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}
        ml-0
      `}>
        <div className="p-4 lg:p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App; 