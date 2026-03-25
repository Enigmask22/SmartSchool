import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';
import api from '@/utils/api';

interface PersonalInfoData {
  user: any;
  teacher: any;
  homeroom_classes: any[];
  subject_classes: any[];
}

interface UsePersonalInfoDataReturn {
  // Data
  personalData: any;
  userData: any;
  homeroomClasses: any[];
  subjectClasses: any[];
  // Loading states (follow standard pattern)
  loading: boolean;        // true only on initial load
  updating: boolean;       // true when saving
  error: string | null;
  successMessage: string | null;
  // Functions
  loadPersonalData: () => Promise<void>;
  updateTeacherProfile: (data: Record<string, any>) => Promise<void>;
  clearSuccess: () => void;
}

/**
 * Manages personal info data loading and updates.
 * 
 * Dependencies:
 * - authContext.currentUser (injected via hook)
 * - API endpoints: /profile/personal-info, /profile/update-teacher
 * 
 * Auto-refetch on:
 * - Component mount (via useEffect)
 * - User change (if auth user changes)
 * 
 * Loading behavior:
 * - loading: true on first fetch only (not on updates)
 * - updating: true when saving profile
 */
export const usePersonalInfoData = (): UsePersonalInfoDataReturn => {
  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error('usePersonalInfoData must be used within AuthProvider');
  }
  const { user } = authContext;

  // Data states
  const [personalData, setPersonalData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [homeroomClasses, setHomeroomClasses] = useState<any[]>([]);
  const [subjectClasses, setSubjectClasses] = useState<any[]>([]);

  // Loading states (follow Rule-of-Refactor pattern)
  const [loading, setLoading] = useState(true);      // Initial load only
  const [updating, setUpdating] = useState(false);   // Save operations
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load personal data on mount
  useEffect(() => {
    loadPersonalData();
  }, [user]);

  const loadPersonalData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const personalResponse = await api.getPersonalInfo();
      if (personalResponse.success) {
        const data: PersonalInfoData = personalResponse.data;

        setUserData(data.user);
        setPersonalData(data.teacher || null);
        setHomeroomClasses(data.homeroom_classes || []);
        setSubjectClasses(data.subject_classes || []);
      } else {
        setError('Không thể tải thông tin cá nhân');
      }
    } catch (err) {
      logger.error('Error loading personal data:', err);
      setError('Không thể tải thông tin cá nhân');
    } finally {
      setLoading(false);
    }
  };

  const updateTeacherProfile = async (updateData: Record<string, any>): Promise<void> => {
    try {
      setUpdating(true);
      setError(null);
      setSuccessMessage(null);

      const response = await api.updateTeacherProfile(updateData);

      if (response.success) {
        setPersonalData(response.data);
        setSuccessMessage('Cập nhật thông tin thành công');
      } else {
        setError(response.message || 'Cập nhật thông tin thất bại');
      }
    } catch (err) {
      logger.error('Error updating personal data:', err);
      setError('Có lỗi xảy ra khi cập nhật thông tin');
    } finally {
      setUpdating(false);
    }
  };

  const clearSuccess = (): void => {
    setSuccessMessage(null);
  };

  return {
    personalData,
    userData,
    homeroomClasses,
    subjectClasses,
    loading,
    updating,
    error,
    successMessage,
    loadPersonalData,
    updateTeacherProfile,
    clearSuccess,
  };
};
