import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Token is already handled in ApiService request method

  // Check if user is logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Verify token is still valid (assuming there's a /auth/me endpoint)
        // For now, just trust the stored user data
        // const response = await api.request('/auth/me');
        // if (response.success) {
        //   setUser(response.data);
        // } else {
        //   logout();
        // }
      } catch (error) {
        console.error('Token verification failed:', error);
        logout();
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    try {
      const response = await api.login(email, password);

      if (response.success && response.data.access_token) {
        const { access_token, user } = response.data;
        
        // Store in localStorage
        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update state
        setToken(access_token);
        setUser(user);
        
        return user;
      } else {
        throw new Error(response.message || 'Invalid response format');
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.message || 'Đăng nhập thất bại';
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = () => {
    return !!token && !!user;
  };

  const isTeacher = () => {
    return user && (user.role === 'teacher' || user.role === 'admin');
  };

  const isHomeroomTeacher = () => {
    return user && user.role === 'homeroom_teacher';
  };

  const isSubjectTeacher = () => {
    return user && user.role === 'teacher';
  };

  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  const hasRole = (roles) => {
    if (!user) return false;
    return Array.isArray(roles) ? roles.includes(user.role) : user.role === roles;
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated,
    isTeacher,
    isHomeroomTeacher,
    isSubjectTeacher,
    isAdmin,
    hasRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 