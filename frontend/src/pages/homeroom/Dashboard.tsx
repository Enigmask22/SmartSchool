/**
 * HomeroomDashboard.tsx - Homeroom Dashboard Page
 * 
 * Refactored following Rule-of-Refactor:
 * - UI State: Filters, date, modal state (kept in component)
 * - Reusable Logic: usePagination (pagination for any array)
 * - Domain Logic: useHomeroomData (API calls and data transformation)
 * 
 * Features:
 * - Multi-filter interface (academic year, class, month, year)
 * - Student attendance statistics
 * - Top absent/late students
 * - Paginated student grid
 * - All students modal with full list
 */

import { useState, useEffect, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SimpleDatePicker } from '@/components/ui/simple-date-picker';
import { useHomeroomData } from '@/hooks/homeroom-dashboard/useHomeroomData';
import { usePagination } from '@/hooks/usePagination';
import {
  Header,
  StatsCards,
  TopAbsentLateCard,
  StudentGrid,
  AllStudentsModal,
} from '@/components/homeroom-dashboard';

/**
 * HomeroomDashboard Component
 * 
 * Coordinates between:
 * - useHomeroomData: Fetches and transforms dashboard data from API
 * - usePagination: Manages pagination state for current page
 * - Local state: Manages filters, date, and modal visibility
 */
export default function HomeroomDashboard() {
  // ============ Domain Logic Hooks ============
  const {
    loading,
    homeroomInfo,
    academicYears,
    selectedAcademicYear,
    teacherClasses,
    selectedClass,
    selectedClassId,
    students,
    topAbsent,
    topLate,
    attendanceStats,
    fetchDashboardData,
    setSelectedAcademicYear,
    setSelectedClass,
    setSelectedClassId,
  } = useHomeroomData();

  // ============ Reusable Pagination Hook ============
  const {
    currentPage,
    totalPages,
    currentItems: currentStudents,
    handlePageChange,
  } = usePagination(students, 12);

  // ============ UI State (kept in component) ============
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showAllStudents, setShowAllStudents] = useState(false);

  /**
   * Refetch dashboard data when filters change
   */
  useEffect(() => {
    if (selectedClass !== null && selectedClassId !== null) {
      fetchDashboardData({
        ay: selectedAcademicYear,
        y: selectedYear,
        m: selectedMonth,
        clsName: selectedClass,
        clsId: selectedClassId,
      });
    }
  }, [
    selectedAcademicYear,
    selectedYear,
    selectedMonth,
    selectedClass,
    selectedClassId,
    fetchDashboardData,
  ]);

  /**
   * Handle class selection
   */
  const handleClassChange = useCallback(
    (className: string, classId: number) => {
      setSelectedClass(className);
      setSelectedClassId(classId);
    },
    [setSelectedClass, setSelectedClassId]
  );

  // Render dashboard
  return (
    <div className="space-y-6 p-6">
      {/* Header with filters */}
      <Header
        selectedClass={selectedClass}
        selectedClassId={selectedClassId}
        selectedAcademicYear={selectedAcademicYear}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        academicYears={academicYears}
        teacherClasses={teacherClasses}
        onClassChange={handleClassChange}
        onAcademicYearChange={setSelectedAcademicYear}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
        loading={loading}
      />

      {/* Statistics Cards */}
      <StatsCards
        students={students}
        attendanceStats={attendanceStats}
        loading={loading}
      />

      {/* Date Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Chọn ngày điểm danh</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleDatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            placeholder="Chọn ngày điểm danh"
            className="w-[160px]"
          />
        </CardContent>
      </Card>

      {/* Top Absent/Late Students */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopAbsentLateCard
          title="Top vắng nhiều nhất (tháng)"
          description="Top 10 học sinh có số lần vắng cao nhất trong tháng"
          data={topAbsent}
          badgeVariant="destructive"
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          countKey="absent_count"
          loading={loading}
        />
        <TopAbsentLateCard
          title="Top đi muộn nhiều nhất (tháng)"
          description="Top 10 học sinh có số lần đi muộn cao nhất trong tháng"
          data={topLate}
          badgeVariant="warning"
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          countKey="late_count"
          loading={loading}
        />
      </div>

      {/* Students Grid with Pagination */}
      <StudentGrid
        homeroomInfo={homeroomInfo}
        students={students}
        currentPage={currentPage}
        studentsPerPage={12}
        currentStudents={currentStudents}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onViewAll={() => setShowAllStudents(true)}
        loading={loading}
      />

      {/* All Students Modal */}
      <AllStudentsModal
        open={showAllStudents}
        onOpenChange={setShowAllStudents}
        homeroomInfo={homeroomInfo}
        students={students}
      />
    </div>
  );
}
