import { useState, useEffect, useCallback } from 'react';
import { ChartNoAxesCombined } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
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
    selectedClass,
    selectedYear,
    selectedMonth,
    students,
    topAbsent,
    topLate,
    attendanceStats,
    setSelectedAcademicYear,
    setSelectedYear,
    setSelectedMonth,
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
  }, [selectedAcademicYear, setSelectedYear]);

  /**
   * Handle academic year change
   */
  const handleAcademicYearChange = useCallback(
    (academicYear: string) => {
      setSelectedAcademicYear(academicYear);
    },
    [setSelectedAcademicYear]
  );

  // Render dashboard
  return (
    <div className="space-y-6 p-6">
      {/* Header with filters */}
      <PageHeader
        title="Tổng quan lớp chủ nhiệm"
        description={selectedClass ? <Badge variant="secondary" className="text-sm px-3 py-1">{`Lớp ${selectedClass}`}</Badge> : 'Chưa được phân công chủ nhiệm'}
        icon={
          <div className="flex items-center justify-center w-16 h-16 shadow-md rounded-xl bg-primary flex-shrink-0">
            <ChartNoAxesCombined className="w-8 h-8 text-white" />
          </div>
        }
      >
        <HeaderFilters
          selectedAcademicYear={selectedAcademicYear}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          academicYears={academicYears}
          onAcademicYearChange={handleAcademicYearChange}
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
          title="Học sinh vắng nhiều nhất (tháng)"
          description={`Top 10 học sinh có số lần vắng cao nhất trong tháng ${selectedMonth}/${selectedYear}`}
          data={topAbsent}
          badgeVariant="destructive"
          countKey="absent_count"
          loading={loading}
        />
        <TopAbsentLateCard
          title="Học sinh đi muộn nhiều nhất (tháng)"
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
