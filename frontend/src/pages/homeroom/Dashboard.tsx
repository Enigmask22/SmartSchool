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
import { ChartNoAxesCombined } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { useHomeroomData } from '@/hooks/homeroom-dashboard/useHomeroomData';
import { usePagination } from '@/hooks/usePagination';
import {
  HeaderFilters,
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
    isRefetching,
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
  // const [selectedDate, setSelectedDate] = useState(
  //   new Date().toISOString().split('T')[0]
  // );
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showAllStudents, setShowAllStudents] = useState(false);

  /**
   * Sync selectedYear from academic year on first bootstrap
   * Extract end year from academic year format: "2025-2026" → 2026
   */
  useEffect(() => {
    if (selectedAcademicYear) {
      const parts = selectedAcademicYear.split('-');
      if (parts.length === 2) {
        const endYear = parseInt(parts[1], 10);
        if (!isNaN(endYear)) {
          setSelectedYear(endYear);
        }
      }
    }
  }, [selectedAcademicYear]);

  /**
   * Handle academic year change - batch all updates together
   * This prevents multiple fetch calls by syncing everything in one event handler
   * Keeps month unchanged - only updates academic year and lets year sync via useEffect
   */
  const handleAcademicYearChange = useCallback(
    (academicYear: string) => {
      // All updates happen synchronously in the event handler = React batches them
      setSelectedAcademicYear(academicYear);
      // Note: selectedYear will be extracted by useEffect watching selectedAcademicYear
      // selectedMonth is kept as-is (doesn't reset)
      // Don't reset selectedClass - the hook will update it when classes are fetched
    },
    [setSelectedAcademicYear]
  );

  /**
   * Refetch dashboard data when filters change (class, month, year)
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
      <PageHeader
        title="Tổng quan lớp chủ nhiệm"
        description={selectedClass ? `Lớp ${selectedClass}` : 'Đang tải...'}
        icon={
          <div className="flex items-center justify-center w-16 h-16 shadow-md rounded-xl bg-primary flex-shrink-0">
            <ChartNoAxesCombined className="w-8 h-8 text-white" />
          </div>
        }
      >
        <HeaderFilters
          selectedAcademicYear={selectedAcademicYear}
          selectedClass={selectedClass}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          academicYears={academicYears}
          teacherClasses={teacherClasses}
          onAcademicYearChange={handleAcademicYearChange}
          onClassChange={handleClassChange}
          onMonthChange={setSelectedMonth}
          onYearChange={setSelectedYear}
          loading={loading}
          isRefetching={isRefetching}
        />
      </PageHeader>

      {/* Statistics Cards */}
      <StatsCards
        students={students}
        attendanceStats={attendanceStats}
        loading={loading}
      />

      {/* Date Selector */}
      {/* <Card>
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
      </Card> */}

      {/* Top Absent/Late Students */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopAbsentLateCard
          title="Top vắng nhiều nhất (tháng)"
          description={`Top 10 học sinh có số lần vắng cao nhất trong tháng ${selectedMonth}/${selectedYear}`}
          data={topAbsent}
          badgeVariant="destructive"
          countKey="absent_count"
          loading={loading}
        />
        <TopAbsentLateCard
          title="Top đi muộn nhiều nhất (tháng)"
          description={`Top 10 học sinh có số lần đi muộn cao nhất trong tháng ${selectedMonth}/${selectedYear}`}
          data={topLate}
          badgeVariant="warning"
          countKey="late_count"
          loading={loading}
        />
      </div>

      {/* Students Grid with Pagination */}
      <StudentGrid
        homeroomInfo={homeroomInfo}
        currentPage={currentPage}
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
