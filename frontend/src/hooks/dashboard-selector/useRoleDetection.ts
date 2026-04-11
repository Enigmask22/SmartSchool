/**
 * useRoleDetection - User Role Detection Domain Logic Hook
 * Checks if user has homeroom teacher and/or subject teacher roles
 * 
 * Domain responsibilities:
 * - Making API calls to check each role
 * - Handling API errors gracefully
 * - Returning which roles user has
 */

import { useEffect, useState } from 'react';
import api from '@/utils/api';
import logger from '@/utils/logger';

export interface UseRoleDetectionReturn {
  loading: boolean;
  hasHomeroomRole: boolean;
  hasSubjectRole: boolean;
}

/**
 * useRoleDetection Hook
 * Detects which teaching roles the user has
 * 
 * Checks:
 * 1. Homeroom teacher role (via getHomeroomClasses API)
 * 2. Subject teacher role (via getTeacherInfo API)
 * 
 * Both checks are independent - if one fails, the other still completes
 * 
 * @returns {UseRoleDetectionReturn} Loading state and role flags
 */
export const useRoleDetection = (): UseRoleDetectionReturn => {
  const [loading, setLoading] = useState(true);
  const [hasHomeroomRole, setHasHomeroomRole] = useState(false);
  const [hasSubjectRole, setHasSubjectRole] = useState(false);

  /**
   * Detect user roles on mount
   */
  useEffect(() => {
    detectRoles();
  }, []);

  /**
   * Check if user has homeroom and/or subject teacher roles
   * Attempts API calls for both roles, handling failures gracefully
   */
  const detectRoles = async () => {
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

  return {
    loading,
    hasHomeroomRole,
    hasSubjectRole
  };
};
