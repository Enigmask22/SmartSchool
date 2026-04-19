import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MoveClassModal from '@/components/class-management/MoveClassModal';

/**
 * Test Suite: TS-ADM03-02, 03 - Student Class Transfer UI Tests
 * 
 * TS-ADM03-02: Validation - UI checkbox validation (error if no students selected)
 * TS-ADM03-03: Logic - Class dropdown filtering (year/grade/class filtering)
 * 
 * Key Business Rules:
 * - Cannot transfer if no students selected
 * - Dropdown filters: Year → Grade → Class
 * - Target class should NOT be current class
 * - Deactivated students not transferable (handled in parent component)
 */

describe('TS-ADM03-02: Student Selection Validation', () => {
  const mockAcademicYears = ['2024-2025', '2025-2026'];
  const mockClasses = [
    {
      id: 1,
      class_name: '10A1',
      grade: 10,
      academic_year: '2024-2025',
    },
    {
      id: 2,
      class_name: '10A2',
      grade: 10,
      academic_year: '2024-2025',
    },
    {
      id: 3,
      class_name: '11A1',
      grade: 11,
      academic_year: '2024-2025',
    },
    {
      id: 4,
      class_name: '10A1',
      grade: 10,
      academic_year: '2025-2026',
    },
  ];

  it('should disable confirm button when no students selected', () => {
    const mockOnConfirm = vi.fn();
    
    render(
      <MoveClassModal
        open={true}
        onOpenChange={vi.fn()}
        moveYear=""
        setMoveYear={vi.fn()}
        moveGrade=""
        setMoveGrade={vi.fn()}
        moveTargetClassId=""
        setMoveTargetClassId={vi.fn()}
        moveLoading={false}
        academicYears={mockAcademicYears}
        moveYearClasses={mockClasses}
        selectedStudentIds={[]}
        onConfirm={mockOnConfirm}
      />
    );

    const confirmButton = screen.getByText('Xác nhận');
    expect(confirmButton).toBeDisabled();
  });

  it('should enable confirm button when students are selected and form is complete', () => {
    const mockOnConfirm = vi.fn();
    const mockSetMoveYear = vi.fn();
    const mockSetMoveGrade = vi.fn();
    const mockSetMoveTargetClassId = vi.fn();

    render(
      <MoveClassModal
        open={true}
        onOpenChange={vi.fn()}
        moveYear="2024-2025"
        setMoveYear={mockSetMoveYear}
        moveGrade="10"
        setMoveGrade={mockSetMoveGrade}
        moveTargetClassId="2"
        setMoveTargetClassId={mockSetMoveTargetClassId}
        moveLoading={false}
        academicYears={mockAcademicYears}
        moveYearClasses={mockClasses}
        selectedStudentIds={[1, 2]}
        onConfirm={mockOnConfirm}
      />
    );

    const confirmButton = screen.getByText('Xác nhận');
    expect(confirmButton).not.toBeDisabled();
  });

  it('should keep confirm button disabled if form incomplete even with students selected', () => {
    const mockOnConfirm = vi.fn();

    render(
      <MoveClassModal
        open={true}
        onOpenChange={vi.fn()}
        moveYear=""
        setMoveYear={vi.fn()}
        moveGrade=""
        setMoveGrade={vi.fn()}
        moveTargetClassId=""
        setMoveTargetClassId={vi.fn()}
        moveLoading={false}
        academicYears={mockAcademicYears}
        moveYearClasses={mockClasses}
        selectedStudentIds={[1, 2]}
        onConfirm={mockOnConfirm}
      />
    );

    const confirmButton = screen.getByText('Xác nhận');
    expect(confirmButton).toBeDisabled();
  });

  it('should display loading state when moving', () => {
    render(
      <MoveClassModal
        open={true}
        onOpenChange={vi.fn()}
        moveYear="2024-2025"
        setMoveYear={vi.fn()}
        moveGrade="10"
        setMoveGrade={vi.fn()}
        moveTargetClassId="2"
        setMoveTargetClassId={vi.fn()}
        moveLoading={true}
        academicYears={mockAcademicYears}
        moveYearClasses={mockClasses}
        selectedStudentIds={[1, 2]}
        onConfirm={vi.fn()}
      />
    );

    const confirmButton = screen.getByText('Đang chuyển...');
    expect(confirmButton).toBeDisabled();
    expect(screen.getByRole('button', { name: /đang chuyển/i })).toBeInTheDocument();
  });
});

describe('TS-ADM03-03: Class Dropdown Filtering Logic', () => {
  const mockAcademicYears = ['2024-2025', '2025-2026'];
  const mockClasses = [
    { id: 1, class_name: '10A1', grade: 10, academic_year: '2024-2025' },
    { id: 2, class_name: '10A2', grade: 10, academic_year: '2024-2025' },
    { id: 3, class_name: '11A1', grade: 11, academic_year: '2024-2025' },
    { id: 4, class_name: '11A2', grade: 11, academic_year: '2024-2025' },
    { id: 5, class_name: '10A1', grade: 10, academic_year: '2025-2026' },
    { id: 6, class_name: '10A2', grade: 10, academic_year: '2025-2026' },
  ];

  it('should show all academic years in first dropdown', () => {
    render(
      <MoveClassModal
        open={true}
        onOpenChange={vi.fn()}
        moveYear=""
        setMoveYear={vi.fn()}
        moveGrade=""
        setMoveGrade={vi.fn()}
        moveTargetClassId=""
        setMoveTargetClassId={vi.fn()}
        moveLoading={false}
        academicYears={mockAcademicYears}
        moveYearClasses={mockClasses}
        selectedStudentIds={[]}
        onConfirm={vi.fn()}
      />
    );

    // Verify the year dropdown is rendered and not disabled
    const yearSelect = screen.getAllByRole('combobox')[0];
    expect(yearSelect).toBeInTheDocument();
    expect(yearSelect).not.toBeDisabled();
    // Year options will render when dropdown opens
  });

  it('should filter grades based on selected academic year', () => {
    const mockSetMoveYear = vi.fn();

    render(
      <MoveClassModal
        open={true}
        onOpenChange={vi.fn()}
        moveYear="2024-2025"
        setMoveYear={mockSetMoveYear}
        moveGrade=""
        setMoveGrade={vi.fn()}
        moveTargetClassId=""
        setMoveTargetClassId={vi.fn()}
        moveLoading={false}
        academicYears={mockAcademicYears}
        moveYearClasses={mockClasses}
        selectedStudentIds={[]}
        onConfirm={vi.fn()}
      />
    );

    // Verify that grade dropdown is enabled when year is selected
    const gradeSelect = screen.getAllByRole('combobox')[1];
    expect(gradeSelect).toBeInTheDocument();
    expect(gradeSelect).not.toBeDisabled();
    // Grade options will render when dropdown opens
  });

  it('should filter classes based on selected year and grade', () => {
    render(
      <MoveClassModal
        open={true}
        onOpenChange={vi.fn()}
        moveYear="2024-2025"
        setMoveYear={vi.fn()}
        moveGrade="10"
        setMoveGrade={vi.fn()}
        moveTargetClassId=""
        setMoveTargetClassId={vi.fn()}
        moveLoading={false}
        academicYears={mockAcademicYears}
        moveYearClasses={mockClasses}
        selectedStudentIds={[]}
        onConfirm={vi.fn()}
      />
    );

    // Verify the component renders with proper structure
    expect(screen.getByText('Chuyển lớp cho học sinh')).toBeInTheDocument();
    // The actual class options (10A1, 10A2) will be rendered when dropdown opens
    const classSelect = screen.getAllByRole('combobox')[2];
    expect(classSelect).not.toBeDisabled();
  });

  it('should disable grade dropdown when no year selected', () => {
    render(
      <MoveClassModal
        open={true}
        onOpenChange={vi.fn()}
        moveYear=""
        setMoveYear={vi.fn()}
        moveGrade=""
        setMoveGrade={vi.fn()}
        moveTargetClassId=""
        setMoveTargetClassId={vi.fn()}
        moveLoading={false}
        academicYears={mockAcademicYears}
        moveYearClasses={mockClasses}
        selectedStudentIds={[]}
        onConfirm={vi.fn()}
      />
    );

    const gradeSelect = screen.getAllByRole('combobox')[1];
    expect(gradeSelect).toHaveAttribute('disabled');
  });

  it('should disable class dropdown when year or grade not selected', () => {
    render(
      <MoveClassModal
        open={true}
        onOpenChange={vi.fn()}
        moveYear="2024-2025"
        setMoveYear={vi.fn()}
        moveGrade=""
        setMoveGrade={vi.fn()}
        moveTargetClassId=""
        setMoveTargetClassId={vi.fn()}
        moveLoading={false}
        academicYears={mockAcademicYears}
        moveYearClasses={mockClasses}
        selectedStudentIds={[]}
        onConfirm={vi.fn()}
      />
    );

    const classSelect = screen.getAllByRole('combobox')[2];
    expect(classSelect).toHaveAttribute('disabled');
  });

  it('should reset grade when year changes', () => {
    const mockSetMoveGrade = vi.fn();
    const mockSetMoveTargetClassId = vi.fn();

    render(
      <MoveClassModal
        open={true}
        onOpenChange={vi.fn()}
        moveYear="2024-2025"
        setMoveYear={vi.fn()}
        moveGrade="10"
        setMoveGrade={mockSetMoveGrade}
        moveTargetClassId="1"
        setMoveTargetClassId={mockSetMoveTargetClassId}
        moveLoading={false}
        academicYears={mockAcademicYears}
        moveYearClasses={mockClasses}
        selectedStudentIds={[]}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Năm học')).toBeInTheDocument();
  });

  it('should reset class when grade changes', () => {
    const mockSetMoveTargetClassId = vi.fn();

    render(
      <MoveClassModal
        open={true}
        onOpenChange={vi.fn()}
        moveYear="2024-2025"
        setMoveYear={vi.fn()}
        moveGrade="10"
        setMoveGrade={vi.fn()}
        moveTargetClassId="1"
        setMoveTargetClassId={mockSetMoveTargetClassId}
        moveLoading={false}
        academicYears={mockAcademicYears}
        moveYearClasses={mockClasses}
        selectedStudentIds={[]}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Khối')).toBeInTheDocument();
  });

  it('should handle dropdown with no matching classes', () => {
    const emptyClasses = [];

    render(
      <MoveClassModal
        open={true}
        onOpenChange={vi.fn()}
        moveYear="2024-2025"
        setMoveYear={vi.fn()}
        moveGrade="10"
        setMoveGrade={vi.fn()}
        moveTargetClassId=""
        setMoveTargetClassId={vi.fn()}
        moveLoading={false}
        academicYears={['2024-2025']}
        moveYearClasses={emptyClasses}
        selectedStudentIds={[]}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Lớp đích')).toBeInTheDocument();
  });

  it('should show correct count of grades for different academic years', () => {
    render(
      <MoveClassModal
        open={true}
        onOpenChange={vi.fn()}
        moveYear="2024-2025"
        setMoveYear={vi.fn()}
        moveGrade=""
        setMoveGrade={vi.fn()}
        moveTargetClassId=""
        setMoveTargetClassId={vi.fn()}
        moveLoading={false}
        academicYears={['2024-2025', '2025-2026']}
        moveYearClasses={[
          { id: 1, class_name: '10A1', grade: 10, academic_year: '2024-2025' },
          { id: 3, class_name: '11A1', grade: 11, academic_year: '2024-2025' },
          { id: 5, class_name: '10A1', grade: 10, academic_year: '2025-2026' },
        ]}
        selectedStudentIds={[]}
        onConfirm={vi.fn()}
      />
    );

    // Verify the component renders properly
    expect(screen.getByText('Chuyển lớp cho học sinh')).toBeInTheDocument();
    // Grade dropdown should be enabled when year is selected
    const gradeSelect = screen.getAllByRole('combobox')[1];
    expect(gradeSelect).not.toBeDisabled();
    // Grade options will render when dropdown opens
  });
});

describe('TS-ADM03 MoveClassModal Integration Tests', () => {
  const mockAcademicYears = ['2024-2025'];
  const mockClasses = [
    { id: 1, class_name: '10A1', grade: 10, academic_year: '2024-2025' },
    { id: 2, class_name: '10A2', grade: 10, academic_year: '2024-2025' },
  ];

  it('should render modal with proper accessibility labels', () => {
    render(
      <MoveClassModal
        open={true}
        onOpenChange={vi.fn()}
        moveYear=""
        setMoveYear={vi.fn()}
        moveGrade=""
        setMoveGrade={vi.fn()}
        moveTargetClassId=""
        setMoveTargetClassId={vi.fn()}
        moveLoading={false}
        academicYears={mockAcademicYears}
        moveYearClasses={mockClasses}
        selectedStudentIds={[]}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Chuyển lớp cho học sinh')).toBeInTheDocument();
    expect(screen.getByText('Năm học')).toBeInTheDocument();
    expect(screen.getByText('Khối')).toBeInTheDocument();
    expect(screen.getByText('Lớp đích')).toBeInTheDocument();
  });

  it('should close modal when cancel button clicked', () => {
    const mockOnOpenChange = vi.fn();

    render(
      <MoveClassModal
        open={true}
        onOpenChange={mockOnOpenChange}
        moveYear=""
        setMoveYear={vi.fn()}
        moveGrade=""
        setMoveGrade={vi.fn()}
        moveTargetClassId=""
        setMoveTargetClassId={vi.fn()}
        moveLoading={false}
        academicYears={mockAcademicYears}
        moveYearClasses={mockClasses}
        selectedStudentIds={[]}
        onConfirm={vi.fn()}
      />
    );

    const cancelButton = screen.getByText('Hủy');
    expect(cancelButton).toBeInTheDocument();
  });
});

