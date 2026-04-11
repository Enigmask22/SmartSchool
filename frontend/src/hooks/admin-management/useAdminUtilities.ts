import { useState, useCallback } from 'react';
import api from '@/utils/api';
import logger from '@/utils/logger';

export function useAdminUtilities() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [homeroomTeachers, setHomeroomTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Generate password utility
  const generatePassword = useCallback(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }, []);

  // Load all reference data
  const loadAllReferenceData = useCallback(async () => {
    try {
      const [teachersRes, homeroomTeachersRes, subjectsRes, classesRes, usersRes] = await Promise.all([
        api.request('/admin/teachers'),
        api.request('/admin/teachers/homeroom'),
        api.request('/admin/subjects'),
        api.request('/admin/classes'),
        api.request('/admin/users'),
      ]);

      if (teachersRes.success) setTeachers(teachersRes.data || []);
      if (homeroomTeachersRes.success) setHomeroomTeachers(homeroomTeachersRes.data || []);
      if (subjectsRes.success) setSubjects(subjectsRes.data || []);
      if (classesRes.success) setClasses(classesRes.data || []);
      if (usersRes.success) setUsers(usersRes.data || []);
    } catch (err) {
      logger.error('Error loading reference data:', err);
    }
  }, []);

  // Load specific reference data
  const loadTeachers = useCallback(async () => {
    try {
      const res = await api.request('/admin/teachers');
      if (res.success) setTeachers(res.data || []);
    } catch (err) {
      logger.error('Error loading teachers:', err);
    }
  }, []);

  const loadHomeroomTeachers = useCallback(async () => {
    try {
      const res = await api.request('/admin/teachers/homeroom');
      if (res.success) setHomeroomTeachers(res.data || []);
    } catch (err) {
      logger.error('Error loading homeroom teachers:', err);
    }
  }, []);

  const loadSubjects = useCallback(async () => {
    try {
      const res = await api.request('/admin/subjects');
      if (res.success) setSubjects(res.data || []);
    } catch (err) {
      logger.error('Error loading subjects:', err);
    }
  }, []);

  const loadClasses = useCallback(async () => {
    try {
      const res = await api.request('/admin/classes');
      if (res.success) setClasses(res.data || []);
    } catch (err) {
      logger.error('Error loading classes:', err);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await api.request('/admin/users');
      if (res.success) setUsers(res.data || []);
    } catch (err) {
      logger.error('Error loading users:', err);
    }
  }, []);

  return {
    teachers,
    homeroomTeachers,
    subjects,
    classes,
    users,
    generatePassword,
    loadAllReferenceData,
    loadTeachers,
    loadHomeroomTeachers,
    loadSubjects,
    loadClasses,
    loadUsers,
  };
}
