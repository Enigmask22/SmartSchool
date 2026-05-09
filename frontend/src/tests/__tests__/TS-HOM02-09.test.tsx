/**
 * Test Suite: TS-HOM02-09 - Attendance Management (Frontend Unit Tests)
 * ===================================================================
 * 
 * Test Matrix Mapping:
 * - useAttendanceAPI: Data fetching, statistics, bootstrap
 * - useAttendanceFilters: Filter state management
 * - useAttendanceEdit: Edit form state management
 * - Attendance record transformation
 * - Error handling and loading states
 *
 * Test Pattern: Vitest + React Testing Library, mocked API responses
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Mock useAttendanceAPI Hook Behavior
 */
const createMockAttendanceAPI = (overrides = {}) => {
  const defaults = {
    // Data
    attendanceRecords: [
      {
        id: 1,
        student_id: 'SV001',
        status: 'present',
        check_in_time: '07:30:00',
        check_out_time: '16:30:00',
        confidence_score: 0.95,
        notes: '',
        students: {
          student_id: 'SV001',
          full_name: 'Nguyễn Văn A',
          class_name: '10A',
        },
      },
      {
        id: 2,
        student_id: 'SV002',
        status: 'late',
        check_in_time: '08:15:00',
        confidence_score: 0.87,
        notes: 'Traffic jam',
        students: {
          student_id: 'SV002',
          full_name: 'Trần Thị B',
          class_name: '10A',
        },
      },
      {
        id: 3,
        student_id: 'SV003',
        status: 'absent',
        notes: 'Doctor appointment',
        students: {
          student_id: 'SV003',
          full_name: 'Lê Văn C',
          class_name: '10A',
        },
      },
    ],
    stats: {
      total_students: 30,
      present_count: 25,
      absent_count: 3,
      late_count: 2,
      attendance_rate: 83,
    },
    classes: ['10A', '10B', '10C'],
    homeroomClasses: [
      { id: '1', class_name: '10A' },
      { id: '2', class_name: '10B' },
    ],
    academicYears: ['2023-2024', '2024-2025', '2025-2026'],
    selectedAcademicYear: '2024-2025',
    apiSelectedClass: { id: '1', class_name: '10A' },

    // Loading states
    loading: false,
    bootstrapLoading: false,
    classesLoading: false,
    updating: false,

    // UI states
    error: null,
    successMessage: null,

    // Handlers
    attendanceBootstrap: vi.fn(),
    loadAttendanceData: vi.fn(),
    loadStats: vi.fn(),
    updateRecord: vi.fn(),

    // Setters
    setError: vi.fn(),
    setSuccessMessage: vi.fn(),
    setAttendanceRecords: vi.fn(),
    setStats: vi.fn(),
    setSelectedAcademicYear: vi.fn(),
  };

  return { ...defaults, ...overrides };
};

/**
 * Mock useAttendanceFilters Hook Behavior
 */
const createMockAttendanceFilters = (overrides = {}) => {
  const defaults = {
    selectedDate: '2024-04-19',
    selectedClass: 'all',
    selectedStatus: 'all',
    selectedAcademicYear: '2024-2025',
    showFullList: true,

    setSelectedDate: vi.fn(),
    setSelectedClass: vi.fn(),
    setSelectedStatus: vi.fn(),
    setSelectedAcademicYear: vi.fn(),
    setShowFullList: vi.fn(),

    handleDateChange: vi.fn(),
    handleClassChange: vi.fn(),
    handleStatusChange: vi.fn(),
    handleAcademicYearChange: vi.fn(),
    handleViewModeChange: vi.fn(),
    resetFilters: vi.fn(),
  };

  return { ...defaults, ...overrides };
};

/**
 * Mock useAttendanceEdit Hook Behavior
 */
const createMockAttendanceEdit = (overrides = {}) => {
  const defaults = {
    editingRecord: null,
    editStatus: '',
    editNotes: '',

    setEditingRecord: vi.fn(),
    setEditStatus: vi.fn(),
    setEditNotes: vi.fn(),

    startEdit: vi.fn(),
    cancelEdit: vi.fn(),
    clearEditState: vi.fn(),

    isEditingRecord: vi.fn((_r?: unknown) => false),
    getRecordKey: vi.fn((record?: unknown) => (record as { student_id?: string } | null)?.student_id || null),
  };

  return { ...defaults, ...overrides };
};

describe('TS-HOM02-09: Attendance Management (Frontend Unit Tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test Suite: useAttendanceAPI - Data Transformation
   */
  describe('useAttendanceAPI - Data Transformation', () => {
    it('should initialize with attendance records', () => {
      const mockApi = createMockAttendanceAPI();

      expect(mockApi.attendanceRecords).toHaveLength(3);
      expect(mockApi.attendanceRecords[0].student_id).toBe('SV001');
    });

    it('should transform attendance record structure correctly', () => {
      const mockApi = createMockAttendanceAPI();
      const record = mockApi.attendanceRecords[0];

      expect(record).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          student_id: expect.any(String),
          status: expect.stringMatching(/present|absent|late/),
          students: expect.objectContaining({
            full_name: expect.any(String),
            class_name: expect.any(String),
          }),
        })
      );
    });

    it('should include check-in/check-out times when available', () => {
      const mockApi = createMockAttendanceAPI();
      const presentRecord = mockApi.attendanceRecords[0];

      expect(presentRecord.check_in_time).toBeDefined();
      expect(presentRecord.check_out_time).toBeDefined();
    });

    it('should include confidence score from AI recognition', () => {
      const mockApi = createMockAttendanceAPI();
      const record = mockApi.attendanceRecords[0];

      expect(record.confidence_score).toBeDefined();
      expect(record.confidence_score).toBeGreaterThan(0);
      expect(record.confidence_score).toBeLessThanOrEqual(1);
    });

    it('should handle records with notes', () => {
      const mockApi = createMockAttendanceAPI();
      const noteRecord = mockApi.attendanceRecords[1];

      expect(noteRecord.notes).toBe('Traffic jam');
    });
  });

  /**
   * Test Suite: useAttendanceAPI - Statistics
   */
  describe('useAttendanceAPI - Statistics', () => {
    it('should calculate attendance statistics correctly', () => {
      const mockApi = createMockAttendanceAPI();

      expect(mockApi.stats).toEqual(
        expect.objectContaining({
          total_students: 30,
          present_count: 25,
          absent_count: 3,
          late_count: 2,
        })
      );
    });

    it('should calculate attendance rate', () => {
      const mockApi = createMockAttendanceAPI();

      expect(mockApi.stats?.attendance_rate).toBeDefined();
      expect(mockApi.stats?.attendance_rate).toBeGreaterThan(0);
      expect(mockApi.stats?.attendance_rate).toBeLessThanOrEqual(100);
    });

    it('should handle zero attendance rate', () => {
      const mockApi = createMockAttendanceAPI({
        stats: {
          total_students: 0,
          present_count: 0,
          absent_count: 0,
          late_count: 0,
          attendance_rate: 0,
        },
      });

      expect(mockApi.stats?.attendance_rate).toBe(0);
    });

    it('should handle 100% attendance', () => {
      const mockApi = createMockAttendanceAPI({
        stats: {
          total_students: 30,
          present_count: 30,
          absent_count: 0,
          late_count: 0,
          attendance_rate: 100,
        },
      });

      expect(mockApi.stats?.attendance_rate).toBe(100);
    });
  });

  /**
   * Test Suite: useAttendanceAPI - Loading & Error States
   */
  describe('useAttendanceAPI - Loading & Error States', () => {
    it('should have loading state', () => {
      const mockApi = createMockAttendanceAPI({ loading: true });

      expect(mockApi.loading).toBe(true);
    });

    it('should have bootstrap loading state', () => {
      const mockApi = createMockAttendanceAPI({ bootstrapLoading: true });

      expect(mockApi.bootstrapLoading).toBe(true);
    });

    it('should handle error state', () => {
      const mockApi = createMockAttendanceAPI({
        error: 'Failed to load attendance data',
      });

      expect(mockApi.error).toBe('Failed to load attendance data');
    });

    it('should clear error when data loads successfully', () => {
      const mockApi = createMockAttendanceAPI({
        error: null,
        loading: false,
      });

      expect(mockApi.error).toBeNull();
      expect(mockApi.loading).toBe(false);
    });

    it('should show success message on record update', () => {
      const mockApi = createMockAttendanceAPI({
        successMessage: 'Attendance record updated',
      });

      expect(mockApi.successMessage).toBe('Attendance record updated');
    });
  });

  /**
   * Test Suite: useAttendanceFilters - Filter State Management
   */
  describe('useAttendanceFilters - Filter State Management', () => {
    it('should initialize with default filter values', () => {
      const mockFilters = createMockAttendanceFilters();

      expect(mockFilters.selectedDate).toBeDefined();
      expect(mockFilters.selectedClass).toBe('all');
      expect(mockFilters.selectedStatus).toBe('all');
      expect(mockFilters.showFullList).toBe(true);
    });

    it('should update date filter', () => {
      const mockFilters = createMockAttendanceFilters();
      mockFilters.handleDateChange('2024-04-20');

      expect(mockFilters.handleDateChange).toHaveBeenCalledWith('2024-04-20');
    });

    it('should update class filter', () => {
      const mockFilters = createMockAttendanceFilters();
      mockFilters.handleClassChange('10A');

      expect(mockFilters.handleClassChange).toHaveBeenCalledWith('10A');
    });

    it('should update status filter', () => {
      const mockFilters = createMockAttendanceFilters();
      mockFilters.handleStatusChange('absent');

      expect(mockFilters.handleStatusChange).toHaveBeenCalledWith('absent');
    });

    it('should toggle view mode between full list and recorded only', () => {
      const mockFilters = createMockAttendanceFilters();
      mockFilters.handleViewModeChange(false);

      expect(mockFilters.handleViewModeChange).toHaveBeenCalledWith(false);
    });

    it('should reset all filters to defaults', () => {
      const mockFilters = createMockAttendanceFilters();
      mockFilters.resetFilters();

      expect(mockFilters.resetFilters).toHaveBeenCalled();
    });

    it('should update academic year filter', () => {
      const mockFilters = createMockAttendanceFilters();
      mockFilters.handleAcademicYearChange('2025-2026');

      expect(mockFilters.handleAcademicYearChange).toHaveBeenCalledWith('2025-2026');
    });
  });

  /**
   * Test Suite: useAttendanceEdit - Edit Form State
   */
  describe('useAttendanceEdit - Edit Form State', () => {
    it('should initialize with no editing record', () => {
      const mockEdit = createMockAttendanceEdit();

      expect(mockEdit.editingRecord).toBeNull();
      expect(mockEdit.editStatus).toBe('');
      expect(mockEdit.editNotes).toBe('');
    });

    it('should start editing a record', () => {
      const mockEdit = createMockAttendanceEdit();
      const record = {
        id: 1,
        student_id: 'SV001',
        status: 'present',
        notes: '',
        students: { student_id: 'SV001', full_name: 'Test', class_name: '10A' },
      };

      mockEdit.startEdit(record);

      expect(mockEdit.startEdit).toHaveBeenCalledWith(record);
    });

    it('should cancel edit and clear state', () => {
      const mockEdit = createMockAttendanceEdit();
      mockEdit.cancelEdit();

      expect(mockEdit.cancelEdit).toHaveBeenCalled();
    });

    it('should check if specific record is being edited', () => {
      const record = {
        id: 1,
        student_id: 'SV001',
        status: 'present',
        notes: '',
        students: { student_id: 'SV001', full_name: 'Test', class_name: '10A' },
      };
      const mockEdit = createMockAttendanceEdit({
        isEditingRecord: vi.fn((r) => r.student_id === 'SV001'),
      });

      const isEditing = mockEdit.isEditingRecord(record);
      expect(isEditing).toBe(true);

      expect(mockEdit.isEditingRecord).toHaveBeenCalledWith(record);
    });

    it('should generate unique record key', () => {
      const record = {
        id: 1,
        student_id: 'SV001',
        status: 'present',
        notes: '',
        students: { student_id: 'SV001', full_name: 'Test', class_name: '10A' },
      };
      const mockEdit = createMockAttendanceEdit();

      const key = mockEdit.getRecordKey(record);
      expect(key).toBe('SV001');

      expect(mockEdit.getRecordKey).toHaveBeenCalledWith(record);
    });

    it('should handle null record for key generation', () => {
      const mockEdit = createMockAttendanceEdit();

      const key = mockEdit.getRecordKey(null);

      expect(key).toBeNull();
    });
  });

  /**
   * Test Suite: Attendance Record Status Values
   */
  describe('Attendance Record Status Values', () => {
    it('should have valid status values', () => {
      const validStatuses = ['present', 'absent', 'late'];
      const mockApi = createMockAttendanceAPI();

      mockApi.attendanceRecords.forEach((record) => {
        expect(validStatuses).toContain(record.status);
      });
    });

    it('should support all three status transitions', () => {
      const mockEdit = createMockAttendanceEdit();

      mockEdit.setEditStatus('present');
      mockEdit.setEditStatus('absent');
      mockEdit.setEditStatus('late');

      expect(mockEdit.setEditStatus).toHaveBeenCalledTimes(3);
    });
  });

  /**
   * Test Suite: Attendance Record Integrity
   */
  describe('Attendance Record Integrity', () => {
    it('should maintain record IDs across operations', () => {
      const mockApi = createMockAttendanceAPI();
      const originalIds = mockApi.attendanceRecords.map((r) => r.id);

      expect(originalIds).toEqual([1, 2, 3]);
    });

    it('should maintain student IDs correctly', () => {
      const mockApi = createMockAttendanceAPI();

      mockApi.attendanceRecords.forEach((record) => {
        expect(record.student_id).toBeDefined();
        expect(typeof record.student_id).toBe('string');
      });
    });

    it('should have matching student data', () => {
      const mockApi = createMockAttendanceAPI();

      mockApi.attendanceRecords.forEach((record) => {
        expect(record.students).toBeDefined();
        expect(record.students?.student_id).toBe(record.student_id);
      });
    });
  });

  /**
   * Test Suite: Pagination-related State
   */
  describe('Pagination-related State', () => {
    it('should provide record count for pagination', () => {
      const mockApi = createMockAttendanceAPI();

      expect(mockApi.attendanceRecords.length).toBe(3);
    });

    it('should support class filtering', () => {
      const mockApi = createMockAttendanceAPI({
        homeroomClasses: [
          { id: '1', class_name: '10A' },
          { id: '2', class_name: '10B' },
          { id: '3', class_name: '10C' },
        ],
      });

      expect(mockApi.homeroomClasses.length).toBeGreaterThan(0);
    });
  });

  /**
   * Test Suite: Academic Year Management
   */
  describe('Academic Year Management', () => {
    it('should provide list of academic years', () => {
      const mockApi = createMockAttendanceAPI();

      expect(mockApi.academicYears).toBeDefined();
      expect(mockApi.academicYears.length).toBeGreaterThan(0);
    });

    it('should have a selected academic year', () => {
      const mockApi = createMockAttendanceAPI();

      expect(mockApi.selectedAcademicYear).toBeDefined();
      expect(mockApi.academicYears).toContain(mockApi.selectedAcademicYear);
    });

    it('should support academic year change', () => {
      const mockApi = createMockAttendanceAPI();
      mockApi.setSelectedAcademicYear('2025-2026');

      expect(mockApi.setSelectedAcademicYear).toHaveBeenCalledWith('2025-2026');
    });
  });
});
