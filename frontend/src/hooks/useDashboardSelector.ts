/**
 * useDashboardSelector - Dashboard Role Detection Hook
 * Extracted from DashboardSelector.tsx component
 * Handles role checking and dashboard selection logic
 */

import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '@/contexts/AuthContext';
import api from '@/utils/api';
import logger from "@/utils/logger";

export interface UseDashboardSelectorReturn {
  hasHomeroomRole: boolean;
  hasSubjectRole: boolean;
  loading: boolean;
  handleSelectDashboard: (type: 'homeroom' | 'subject') => void;
}

/**
 * useDashboardSelector Hook
 * Manages user role detection and dashboard navigation
 * 
 * Features:
 * - Checks if user has homeroom teacher role
 * - Checks if user has subject teacher role
 * - Auto-redirects if user only has one role
 * - Protected route - redirects to login if not authenticated
 * 
 * @returns {UseDashboardSelectorReturn} Dashboard selector state and handlers
 */
export const useDashboardSelector = (): UseDashboardSelectorReturn => {
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const [hasHomeroomRole, setHasHomeroomRole] = useState(false);
  const [hasSubjectRole, setHasSubjectRole] = useState(false);
  const [loading, setLoading] = useState(true);

  /**
   * Protect this route - redirect to login if not authenticated
   */
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  /**
   * Check user roles on mount
   */
  useEffect(() => {
    checkUserRoles();
  }, []);

  /**
   * Check if user has homeroom and/or subject teacher roles
   * Attempts API calls for both roles, handling failures gracefully
   */
  const checkUserRoles = async () => {
    try {
      setLoading(true);
      
      // Check if user is homeroom teacher
      try {
        const homeroomResponse = await api.getHomeroomClasses();
        if (homeroomResponse.success && homeroomResponse.data && homeroomResponse.data.length > 0) {
          setHasHomeroomRole(true);
        }
      } catch (error) {
        logger.debug('Không phải giáo viên chủ nhiệm');
      }

      // Check if user is subject teacher
      try {
        const teacherResponse = await api.getTeacherInfo();
        if (teacherResponse.success && teacherResponse.data) {
          setHasSubjectRole(true);
        }
      } catch (error) {
        logger.debug('Không phải giáo viên bộ môn');
      }
      
    } catch (error) {
      logger.error('Error checking user roles:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle dashboard selection
   * Navigates to the selected dashboard type
   */
  const handleSelectDashboard = (type: 'homeroom' | 'subject') => {
    navigate(`/${type}/dashboard`, { replace: true });
  };

  return {
    hasHomeroomRole,
    hasSubjectRole,
    loading,
    handleSelectDashboard
  };
};
