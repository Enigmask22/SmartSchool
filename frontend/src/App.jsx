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
import ClassManagement from './components/ClassManagement';
import SubjectTeacherDashboard from './components/SubjectTeacherDashboard';
import DashboardSelector from './components/DashboardSelector';

function AppContent() {
  const { user, loading, isAuthenticated, isHomeroomTeacher, isSubjectTeacher, isAdmin } = useContext(AuthContext);
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [selectedDashboardType, setSelectedDashboardType] = useState(null); // 'homeroom' or 'subject'
  const [showDashboardSelector, setShowDashboardSelector] = useState(false);

  // Reset view when user changes (login/logout)
  React.useEffect(() => {
    if (!user) {
      // User logged out - reset to default
      setCurrentView('dashboard');
      setHasRedirected(false);
      setSelectedDashboardType(null);
      setShowDashboardSelector(false);
    } else if (!hasRedirected) {
      // User logged in - check if need to show dashboard selector
      
      // Admin không cần chọn dashboard - bypass trực tiếp
      if (isAdmin()) {
        console.log('👑 Admin logged in - bypassing dashboard selector');
        setShowDashboardSelector(false);
        setSelectedDashboardType('admin'); // Set special type for admin
        setCurrentView('dashboard');
        setHasRedirected(true);
        return;
      }
      
      // Nếu chưa chọn dashboard type, hiển thị selector cho giáo viên
      if (!selectedDashboardType) {
        console.log('🎯 Showing dashboard selector');
        setShowDashboardSelector(true);
      }
      setHasRedirected(true);
    }
  }, [user?.id, hasRedirected, selectedDashboardType, isAdmin]); // Include role functions as dependencies

  // Handle dashboard selection
  const handleDashboardSelect = (type) => {
    console.log(`📊 Dashboard type selected: ${type}`);
    setSelectedDashboardType(type);
    setShowDashboardSelector(false);
    setCurrentView('dashboard');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 rounded-full border-b-2 border-indigo-600 animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Login />;
  }

  // Nếu cần hiển thị dashboard selector
  if (showDashboardSelector) {
    return <DashboardSelector onSelectDashboard={handleDashboardSelect} />;
  }

  const renderContent = () => {
    // Admin có dashboard riêng - không cần chọn
    if (selectedDashboardType === 'admin' || isAdmin()) {
      switch (currentView) {
        case 'dashboard':
          return <Dashboard setCurrentView={setCurrentView} />;
        // Ẩn các tab không cần thiết cho Admin
        // case 'students':
        //   return <StudentList />;
        // case 'attendance':
        //   return <AttendanceView />;
        // case 'camera':
        //   return <AICamera />;
        // case 'continuous':
        //   return <ContinuousRecognition />;
        // case 'faces':
        //   return <FaceManagement />;
        case 'school-config':
          return <SchoolDaysConfig />;
        case 'class-management':
          return <ClassManagement />;
        // case 'grades':
        //   return <GradeManagement />;
        case 'admin-management':
          return <AdminManagement />;
        default:
          return <Dashboard setCurrentView={setCurrentView} />;
      }
    }
    
    // Nếu user đã chọn dashboard type, ưu tiên theo lựa chọn đó
    if (selectedDashboardType === 'homeroom') {
      // Homeroom dashboard view
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
        case 'grades':
          return <GradeManagement isHomeroom={true} />;
        default:
          return <HomeroomDashboard />;
      }
    } else if (selectedDashboardType === 'subject') {
      // Subject teacher dashboard view
      switch (currentView) {
        case 'dashboard':
          return <SubjectTeacherDashboard />;
        case 'grades':
          return <GradeManagement />;
        default:
          return <SubjectTeacherDashboard />;
      }
    }
    
    // Fallback to role-based rendering nếu chưa chọn
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
        // case 'feedback': // Tạm ẩn AI Nhận xét
        //   return <AIFeedback isHomeroom={true} />;
        case 'grades':
          return <GradeManagement isHomeroom={true} />;
        default:
          return <HomeroomDashboard />;
      }
    } else if (isSubjectTeacher()) {
      // Giáo viên bộ môn - mặc định vào trang Dashboard Analytics
      switch (currentView) {
        case 'dashboard':
          return <SubjectTeacherDashboard />;
        case 'grades':
          return <GradeManagement />;
        default:
          return <SubjectTeacherDashboard />; // Default cho giáo viên bộ môn là Dashboard
      }
    } else {
      // Default fallback
      return (
        <div className="py-12 text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Chưa được phân quyền</h2>
          <p className="text-gray-600">Vui lòng liên hệ quản trị viên để được cấp quyền truy cập</p>
        </div>
      );
    }
  };

  // Handle dashboard switch
  const handleDashboardSwitch = () => {
    // Admin không có dashboard switch
    if (isAdmin()) {
      console.log('⚠️ Admin không thể switch dashboard');
      return;
    }
    
    const newType = selectedDashboardType === 'homeroom' ? 'subject' : 'homeroom';
    console.log(`🔄 Switching dashboard from ${selectedDashboardType} to ${newType}`);
    setSelectedDashboardType(newType);
    setCurrentView('dashboard'); // Reset to dashboard view
  };

  return (
    <div className="flex h-screen bg-gray-50 App">
      <Sidebar 
        currentView={currentView}
        setCurrentView={setCurrentView}
        user={user}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        selectedDashboardType={selectedDashboardType}
        onDashboardSwitch={handleDashboardSwitch}
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