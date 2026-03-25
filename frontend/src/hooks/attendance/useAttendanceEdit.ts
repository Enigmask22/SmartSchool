import { useState } from 'react';

/**
 * useAttendanceEdit - Edit Form State Management Hook
 * Manages all edit form state for individual attendance records
 * 
 * Responsibilities:
 * - Track which record is being edited
 * - Manage edit form inputs (status, notes)
 * - Provide helpers to check if a record is currently being edited
 * 
 * Does NOT:
 * - Make API calls (parent component handles save)
 * - Manage data (handled by useAttendanceAPI)
 * - Manage pagination
 */

interface Student {
  student_id: string;
  full_name: string;
  class_name: string;
}

export interface AttendanceRecord {
  id: number | null;
  student_id: string;
  status: 'present' | 'absent' | 'late';
  check_in_time?: string;
  check_out_time?: string;
  confidence_score?: number;
  notes?: string;
  students?: Student;
  leave_request_image?: string;
}

interface UseAttendanceEditReturn {
  // Edit state
  editingRecord: AttendanceRecord | null;
  editStatus: string;
  editNotes: string;

  // Setters
  setEditingRecord: (record: AttendanceRecord | null) => void;
  setEditStatus: (status: string) => void;
  setEditNotes: (notes: string) => void;

  // Handlers
  startEdit: (record: AttendanceRecord) => void;
  cancelEdit: () => void;
  clearEditState: () => void;

  // Helpers
  isEditingRecord: (record: AttendanceRecord) => boolean;
  getRecordKey: (record: AttendanceRecord | null) => string | null;
}

export const useAttendanceEdit = (): UseAttendanceEditReturn => {
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');

  /**
   * Get unique key for a record (handles both ID and fallback to student_id)
   */
  const getRecordKey = (record: AttendanceRecord | null): string | null => {
    if (!record) return null;
    return record.student_id ?? record.students?.student_id ?? null;
  };

  /**
   * Check if a specific record is currently being edited
   */
  const isEditingRecord = (record: AttendanceRecord): boolean => {
    if (!editingRecord || !record) return false;
    const editingKey = getRecordKey(editingRecord);
    const recordKey = getRecordKey(record);
    return String(editingKey) === String(recordKey) && editingKey !== null;
  };

  /**
   * Start editing a record - populate form with record's current values
   */
  const startEdit = (record: AttendanceRecord): void => {
    setEditingRecord(record);
    setEditStatus(record.status || 'absent');
    setEditNotes(record.notes || '');
  };

  /**
   * Cancel editing - clear all edit state
   */
  const cancelEdit = (): void => {
    setEditingRecord(null);
    setEditStatus('');
    setEditNotes('');
  };

  /**
   * Clear edit state (for use after successful save)
   */
  const clearEditState = (): void => {
    cancelEdit();
  };

  return {
    // Edit state
    editingRecord,
    editStatus,
    editNotes,

    // Setters
    setEditingRecord,
    setEditStatus,
    setEditNotes,

    // Handlers
    startEdit,
    cancelEdit,
    clearEditState,

    // Helpers
    isEditingRecord,
    getRecordKey,
  };
};
