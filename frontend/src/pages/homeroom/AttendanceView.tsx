import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAttendanceData } from '@/hooks/useAttendanceData';
import AttendanceStats from '@/components/attendance/AttendanceStats';
import AttendanceFilters from '@/components/attendance/AttendanceFilters';
import AttendanceTable from '@/components/attendance/AttendanceTable';
import LeaveRequestModal from '@/components/attendance/LeaveRequestModal';
import { AuthContext } from '@/contexts/AuthContext';
import logger from '@/utils/logger';

/**
 * AttendanceView Component
 * 
 * Main attendance management page for homeroom teachers
 * - View attendance records by date, class, status
 * - Edit attendance records
 * - View statistics
 * - Toggle between full list and recorded-only views
 * 
 * Uses useAttendanceData hook for all state and data management
 * Uses sub-components for UI organization:
 * - AttendanceStats: Display summary statistics
 * - AttendanceFilters: Filter controls
 * - AttendanceTable: Records table with pagination and edit
 */

export default function AttendanceView() {
  const authContext = React.useContext(AuthContext);
  const isHomeroomTeacher = authContext?.isHomeroomTeacher;
  const {
    // Data
    attendanceRecords,
    stats,
    classes,
    academicYears,

    // Loading states
    loading,
    classesLoading,
    updating,

    // UI states
    error,
    successMessage,

    // Filter states
    selectedDate,
    selectedClass,
    selectedStatus,
    selectedAcademicYear,
    showFullList,
    page,
    pageSize,

    // Edit states
    editingRecord,
    editStatus,
    editNotes,

    // Handlers
    handleDateChange,
    handleClassChange,
    handleStatusChange,
    handleViewModeChange,
    handleEditRecord,
    handleCancelEdit,
    handleSaveEdit,
    resetFilters,

    // Bootstrap
    attendanceBootstrap,

    // Leave request states
    leaveRequestOpen,
    leaveRequestRecord,

    // Leave request handlers
    handleOpenLeaveRequest,
    handleLeaveRequestClose,
    handleLeaveRequestUploadSuccess,

    // Setters
    setSelectedAcademicYear,
    setPage,
    setPageSize,
    setEditStatus,
    setEditNotes,

    // Helpers
    isEditingRecord,
  } = useAttendanceData();

  // Show loading spinner while initial data loads
  if (loading && attendanceRecords.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="attendance-view">
      {/* Header */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Điểm danh</CardTitle>
            <CardDescription>Quản lý điểm danh học sinh</CardDescription>
            {error && (
              <div className="p-3 mt-2 border rounded text-destructive bg-destructive/10 border-destructive/20">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="p-3 mt-2 text-green-700 bg-green-100 border border-green-400 rounded">
                {successMessage}
              </div>
            )}
          </CardHeader>
        </Card>
      </div>

      {/* Statistics */}
      <AttendanceStats stats={stats} />

      {/* Filters */}
      <AttendanceFilters
        selectedDate={selectedDate}
        selectedClass={selectedClass}
        selectedStatus={selectedStatus}
        selectedAcademicYear={selectedAcademicYear}
        showFullList={showFullList}
        classes={classes}
        academicYears={academicYears}
        classesLoading={classesLoading}
        onDateChange={handleDateChange}
        onClassChange={handleClassChange}
        onStatusChange={handleStatusChange}
        onAcademicYearChange={(year) => {
          setSelectedAcademicYear(year);
          attendanceBootstrap({ year, date: selectedDate });
        }}
        onViewModeChange={handleViewModeChange}
        onSearchClick={() => {
          attendanceBootstrap({
            year: selectedAcademicYear,
            date: selectedDate,
            className: selectedClass && selectedClass !== 'all' ? selectedClass : undefined,
          });
        }}
        onResetClick={resetFilters}
      />

      {/* Table */}
      <AttendanceTable
        records={attendanceRecords}
        loading={loading}
        selectedDate={selectedDate}
        selectedClass={selectedClass}
        showFullList={showFullList}
        page={page}
        pageSize={pageSize}
        editingRecord={editingRecord}
        editStatus={editStatus}
        editNotes={editNotes}
        updating={updating}
        onEditRecord={(record) => {
          logger.debug('🖱️ Click Sửa button', { record });
          handleEditRecord(record);
        }}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
        onStatusChange={setEditStatus}
        onNotesChange={setEditNotes}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        isEditingRecord={isEditingRecord}
        onOpenLeaveRequest={handleOpenLeaveRequest}
        isHomeroomTeacher={isHomeroomTeacher}
      />

      {/* Leave Request Modal */}
      {leaveRequestRecord && (
        <LeaveRequestModal
          open={leaveRequestOpen}
          onClose={handleLeaveRequestClose}
          studentId={leaveRequestRecord.student_id}
          studentName={
            leaveRequestRecord.students?.full_name || ''
          }
          studentCode={
            leaveRequestRecord.students?.student_id || ''
          }
          targetDate={selectedDate}
          existingImageUrl={leaveRequestRecord.leave_request_image || null}
          onUploadSuccess={handleLeaveRequestUploadSuccess}
        />
      )}
    </div>
  );
};
