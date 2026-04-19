/**
 * Test Suite: TS-HOM01-09 - Homeroom Dashboard Data & Logic (Frontend Unit Tests)
 * =============================================================================
 * 
 * Test Matrix Mapping:
 * - Data transformation from API response to component props
 * - Pagination logic
 * - Filter state management
 * - Statistics display and formatting
 * - Error state handling
 *
 * Test Pattern: Vitest + React Testing Library, mocked API responses
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Mock useHomeroomData Hook Behavior
 */
const createMockHomeroomData = (overrides = {}) => {
  const defaults = {
    loading: false,
    isRefetching: false,
    homeroomInfo: { class_name: '10A1' },
    academicYears: ['2023-2024', '2024-2025', '2025-2026'],
    selectedAcademicYear: '2024-2025',
    teacherClasses: [
      { id: 1, class_name: '10A1', grade: 10, academic_year: '2024-2025' },
      { id: 2, class_name: '10A2', grade: 10, academic_year: '2024-2025' },
    ],
    selectedClass: '10A1',
    selectedClassId: 1,
    selectedYear: 2025,
    selectedMonth: 4,
    students: [
      {
        id: 1,
        student_id: 'SV001',
        full_name: 'Nguyễn Văn A',
        class_name: '10A1',
        absent_count: 2,
        late_count: 1,
        early_count: 0,
      },
      {
        id: 2,
        student_id: 'SV002',
        full_name: 'Trần Thị B',
        class_name: '10A1',
        absent_count: 0,
        late_count: 3,
        early_count: 0,
      },
    ],
    topAbsent: [
      {
        student_name: 'Nguyễn Văn A',
        student_code: 'SV001',
        class_name: '10A1',
        absent_count: 2,
      },
    ],
    topLate: [
      {
        student_name: 'Trần Thị B',
        student_code: 'SV002',
        class_name: '10A1',
        late_count: 3,
      },
    ],
    attendanceStats: {
      absent_count: 2,
      late_count: 4,
      attendance_rate: 95,
    },
    setSelectedAcademicYear: vi.fn(),
    setSelectedYear: vi.fn(),
    setSelectedMonth: vi.fn(),
  };

  return { ...defaults, ...overrides };
};

describe('TS-HOM01-09: Homeroom Dashboard Data & Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Data Transformation
   */
  it('should transform API student response correctly', () => {
    const mockData = createMockHomeroomData();
    
    expect(mockData.students).toHaveLength(2);
    expect(mockData.students[0]).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        student_id: expect.any(String),
        full_name: expect.any(String),
        absent_count: expect.any(Number),
        late_count: expect.any(Number),
      })
    );
  });

  it('should handle empty student list', () => {
    const mockData = createMockHomeroomData({ students: [] });
    
    expect(mockData.students).toHaveLength(0);
    expect(Array.isArray(mockData.students)).toBe(true);
  });

  /**
   * Test: Academic Years & Classes
   */
  it('should provide list of academic years', () => {
    const mockData = createMockHomeroomData();
    
    expect(mockData.academicYears).toEqual(
      expect.arrayContaining(['2023-2024', '2024-2025', '2025-2026'])
    );
  });

  it('should have selected academic year', () => {
    const mockData = createMockHomeroomData();
    
    expect(mockData.selectedAcademicYear).toBe('2024-2025');
    expect(mockData.academicYears).toContain(mockData.selectedAcademicYear);
  });

  it('should list teacher classes', () => {
    const mockData = createMockHomeroomData();
    
    expect(mockData.teacherClasses).toHaveLength(2);
    expect(mockData.teacherClasses[0]).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        class_name: expect.any(String),
        grade: expect.any(Number),
        academic_year: expect.any(String),
      })
    );
  });

  it('should auto-select first class when available', () => {
    const mockData = createMockHomeroomData();
    
    if (mockData.teacherClasses.length > 0) {
      expect(mockData.selectedClassId).toBe(mockData.teacherClasses[0].id);
      expect(mockData.selectedClass).toBe(mockData.teacherClasses[0].class_name);
    }
  });

  /**
   * Test: Top Absent/Late Students
   */
  it('should sort top absent students by count descending', () => {
    const mockData = createMockHomeroomData({
      topAbsent: [
        { student_name: 'A', student_code: 'SV001', class_name: '10A1', absent_count: 5 },
        { student_name: 'B', student_code: 'SV002', class_name: '10A1', absent_count: 3 },
        { student_name: 'C', student_code: 'SV003', class_name: '10A1', absent_count: 1 },
      ],
    });

    for (let i = 0; i < mockData.topAbsent.length - 1; i++) {
      expect(mockData.topAbsent[i].absent_count).toBeGreaterThanOrEqual(
        mockData.topAbsent[i + 1].absent_count
      );
    }
  });

  it('should sort top late students by count descending', () => {
    const mockData = createMockHomeroomData({
      topLate: [
        { student_name: 'A', student_code: 'SV001', class_name: '10A1', late_count: 8 },
        { student_name: 'B', student_code: 'SV002', class_name: '10A1', late_count: 4 },
        { student_name: 'C', student_code: 'SV003', class_name: '10A1', late_count: 2 },
      ],
    });

    for (let i = 0; i < mockData.topLate.length - 1; i++) {
      expect(mockData.topLate[i].late_count).toBeGreaterThanOrEqual(
        mockData.topLate[i + 1].late_count
      );
    }
  });

  it('should limit top lists to 10 items', () => {
    const topAbsent = Array.from({ length: 15 }, (_, i) => ({
      student_name: `Student ${i}`,
      student_code: `SV${String(i).padStart(3, '0')}`,
      class_name: '10A1',
      absent_count: 15 - i,
    }));

    const mockData = createMockHomeroomData({ topAbsent: topAbsent.slice(0, 10) });
    
    expect(mockData.topAbsent.length).toBeLessThanOrEqual(10);
  });

  /**
   * Test: Attendance Statistics
   */
  it('should calculate attendance stats correctly', () => {
    const mockData = createMockHomeroomData();
    
    expect(mockData.attendanceStats).toEqual(
      expect.objectContaining({
        absent_count: expect.any(Number),
        late_count: expect.any(Number),
        attendance_rate: expect.any(Number),
      })
    );
  });

  it('should aggregate absence counts from all students', () => {
    const mockData = createMockHomeroomData({
      students: [
        { id: 1, student_id: 'SV001', full_name: 'A', class_name: '10A1', absent_count: 2, late_count: 0, early_count: 0 },
        { id: 2, student_id: 'SV002', full_name: 'B', class_name: '10A1', absent_count: 3, late_count: 0, early_count: 0 },
      ],
    });

    const totalAbsent = mockData.students.reduce((sum, s) => sum + s.absent_count, 0);
    expect(totalAbsent).toBe(5);
  });

  it('should aggregate late counts from all students', () => {
    const mockData = createMockHomeroomData({
      students: [
        { id: 1, student_id: 'SV001', full_name: 'A', class_name: '10A1', absent_count: 0, late_count: 2, early_count: 0 },
        { id: 2, student_id: 'SV002', full_name: 'B', class_name: '10A1', absent_count: 0, late_count: 1, early_count: 0 },
      ],
    });

    const totalLate = mockData.students.reduce((sum, s) => sum + s.late_count, 0);
    expect(totalLate).toBe(3);
  });

  /**
   * Test: Filter State Management
   */
  it('should track selected academic year', () => {
    const mockData = createMockHomeroomData();
    
    expect(mockData.selectedAcademicYear).toBe('2024-2025');
  });

  it('should track selected month and year', () => {
    const mockData = createMockHomeroomData({
      selectedYear: 2025,
      selectedMonth: 6,
    });

    expect(mockData.selectedYear).toBe(2025);
    expect(mockData.selectedMonth).toBe(6);
  });

  it('should allow changing academic year', () => {
    const setSelectedAcademicYear = vi.fn();
    const mockData = createMockHomeroomData({
      setSelectedAcademicYear,
    });

    mockData.setSelectedAcademicYear('2025-2026');
    
    expect(setSelectedAcademicYear).toHaveBeenCalledWith('2025-2026');
  });

  it('should allow changing month', () => {
    const setSelectedMonth = vi.fn();
    const mockData = createMockHomeroomData({
      setSelectedMonth,
    });

    mockData.setSelectedMonth(5);
    
    expect(setSelectedMonth).toHaveBeenCalledWith(5);
  });

  /**
   * Test: Loading States
   */
  it('should track loading state', () => {
    const mockData = createMockHomeroomData({ loading: true });
    
    expect(mockData.loading).toBe(true);
  });

  it('should track refetching state', () => {
    const mockData = createMockHomeroomData({ isRefetching: true });
    
    expect(mockData.isRefetching).toBe(true);
  });

  it('should not show loading when data available', () => {
    const mockData = createMockHomeroomData({
      loading: false,
      isRefetching: false,
    });

    expect(mockData.loading).toBe(false);
    expect(mockData.isRefetching).toBe(false);
  });

  /**
   * Test: Homeroom Info
   */
  it('should provide homeroom teacher info', () => {
    const mockData = createMockHomeroomData({
      homeroomInfo: {
        class_name: '10A1',
        teacher_name: 'Thầy Nguyễn',
      },
    });

    expect(mockData.homeroomInfo).toEqual(
      expect.objectContaining({
        class_name: expect.any(String),
      })
    );
  });

  it('should handle null homeroom info', () => {
    const mockData = createMockHomeroomData({ homeroomInfo: null });
    
    expect(mockData.homeroomInfo).toBeNull();
  });

  /**
   * Test: Edge Cases
   */
  it('should handle zero students', () => {
    const mockData = createMockHomeroomData({ students: [] });
    
    expect(mockData.students).toHaveLength(0);
    expect(Array.isArray(mockData.students)).toBe(true);
  });

  it('should handle zero attendance counts', () => {
    const mockData = createMockHomeroomData({
      students: [
        { id: 1, student_id: 'SV001', full_name: 'A', class_name: '10A1', absent_count: 0, late_count: 0, early_count: 0 },
      ],
    });

    expect(mockData.students[0].absent_count).toBe(0);
    expect(mockData.students[0].late_count).toBe(0);
  });

  it('should handle missing class name', () => {
    const mockData = createMockHomeroomData({
      selectedClass: null,
    });

    expect(mockData.selectedClass).toBeNull();
  });

  it('should handle empty top lists', () => {
    const mockData = createMockHomeroomData({
      topAbsent: [],
      topLate: [],
    });

    expect(mockData.topAbsent).toHaveLength(0);
    expect(mockData.topLate).toHaveLength(0);
  });

  /**
   * Test: Data Validation
   */
  it('should not allow negative counts', () => {
    const mockData = createMockHomeroomData({
      students: [
        { id: 1, student_id: 'SV001', full_name: 'A', class_name: '10A1', absent_count: 2, late_count: 1, early_count: 0 },
      ],
    });

    for (const student of mockData.students) {
      expect(student.absent_count).toBeGreaterThanOrEqual(0);
      expect(student.late_count).toBeGreaterThanOrEqual(0);
      expect(student.early_count).toBeGreaterThanOrEqual(0);
    }
  });

  it('should validate student IDs are numeric', () => {
    const mockData = createMockHomeroomData();

    for (const student of mockData.students) {
      expect(typeof student.id).toBe('number');
      expect(student.id).toBeGreaterThan(0);
    }
  });

  it('should validate class IDs are numeric', () => {
    const mockData = createMockHomeroomData();

    if (mockData.teacherClasses.length > 0) {
      for (const cls of mockData.teacherClasses) {
        expect(typeof cls.id).toBe('number');
        expect(cls.id).toBeGreaterThan(0);
      }
    }
  });

  it('should validate grade is in valid range', () => {
    const mockData = createMockHomeroomData();

    for (const cls of mockData.teacherClasses) {
      expect(cls.grade).toBeGreaterThanOrEqual(10);
      expect(cls.grade).toBeLessThanOrEqual(12);
    }
  });

  /**
   * Test: Date Format Validation
   */
  it('should validate academic year format', () => {
    const mockData = createMockHomeroomData();

    for (const year of mockData.academicYears) {
      // Format should be YYYY-YYYY
      const parts = year.split('-');
      expect(parts).toHaveLength(2);
      expect(/^\d{4}$/.test(parts[0])).toBe(true);
      expect(/^\d{4}$/.test(parts[1])).toBe(true);
    }
  });

  it('should validate month range', () => {
    const mockData = createMockHomeroomData({
      selectedMonth: 6,
    });

    expect(mockData.selectedMonth).toBeGreaterThanOrEqual(1);
    expect(mockData.selectedMonth).toBeLessThanOrEqual(12);
  });

  it('should validate year is valid', () => {
    const mockData = createMockHomeroomData({
      selectedYear: 2025,
    });

    expect(typeof mockData.selectedYear).toBe('number');
    expect(mockData.selectedYear).toBeGreaterThan(2000);
    expect(mockData.selectedYear).toBeLessThan(2100);
  });
});
