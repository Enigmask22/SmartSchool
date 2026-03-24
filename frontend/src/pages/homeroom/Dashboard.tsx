/**
 * HomeroomDashboard.tsx - Homeroom Dashboard Page
 * 
 * Refactored from HomeroomDashboard.jsx:
 * - Extracted state management to useHomeroomDashboard hook
 * - Added TypeScript types
 * - Organized into sub-components
 * 
 * Features:
 * - Multi-filter interface (academic year, class, month, year)
 * - Student attendance statistics
 * - Top absent/late students
 * - Paginated student grid
 * - All students modal with full list
 */

import React from 'react';
import { Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SimpleDatePicker } from '@/components/ui/simple-date-picker';
import { useHomeroomDashboard } from '@/hooks/useHomeroomDashboard';
import {
  Header,
  StatsCards,
  TopAbsentLateCard,
  StudentGrid,
  AllStudentsModal,
} from '@/components/homeroom-dashboard';

export default function HomeroomDashboard() {
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
    selectedDate,
    selectedYear,
    selectedMonth,
    showAllStudents,
    currentPage,
    totalPages,
    currentStudents,
    setSelectedAcademicYear,
    setSelectedClass,
    setSelectedClassId,
    setSelectedDate,
    setSelectedYear,
    setSelectedMonth,
    setShowAllStudents,
    handlePageChange,
  } = useHomeroomDashboard();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
        </div>
      </div>
    );
  }

  const handleClassChange = (className: string, classId: number) => {
    setSelectedClass(className);
    setSelectedClassId(classId);
  };

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
      />

      {/* Statistics Cards */}
      <StatsCards students={students} attendanceStats={attendanceStats} />

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
        />
        <TopAbsentLateCard
          title="Top đi muộn nhiều nhất (tháng)"
          description="Top 10 học sinh có số lần đi muộn cao nhất trong tháng"
          data={topLate}
          badgeVariant="warning"
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          countKey="late_count"
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
