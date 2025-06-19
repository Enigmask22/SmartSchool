import React, { useState, useEffect } from 'react';
import './App.css';

// Components
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import AttendanceView from './components/AttendanceView';
import AICamera from './components/AICamera';
import FaceManagement from './components/FaceManagement';
import ContinuousRecognition from './components/ContinuousRecognition';
import AIFeedback from './components/AIFeedback';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Kiểm tra authentication
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          // Verify token với backend
          // setUser(userData);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderContent = () => {
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
      default:
        return <Dashboard setCurrentView={setCurrentView} />;
    }
  };

  return (
    <div className="App">
      <Header 
        currentView={currentView}
        setCurrentView={setCurrentView}
        user={user}
      />
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App; 