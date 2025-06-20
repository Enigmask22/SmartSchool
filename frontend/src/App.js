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

function AppContent() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, loading, isAuthenticated } = useContext(AuthContext);

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
    // Nếu user là teacher (giáo viên bộ môn), chỉ cho phép truy cập Grade Management
    if (user?.role === 'teacher') {
      switch (currentView) {
        case 'grades':
          return <GradeManagement />;
        default:
          return <GradeManagement />;
      }
    }

    // Admin có thể truy cập tất cả
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
        return <Dashboard setCurrentView={setCurrentView} />;
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