import { useContext, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { useAttendanceAPI } from '@/hooks/attendance/useAttendanceAPI';
import { useAttendanceFilters } from '@/hooks/attendance/useAttendanceFilters';
import { useAttendanceEdit } from '@/hooks/attendance/useAttendanceEdit';
import AttendanceStats from '@/components/attendance/AttendanceStats';
import AttendanceFilters from '@/components/attendance/AttendanceFilters';
import AttendanceTable from '@/components/attendance/AttendanceTable';
import LeaveRequestModal from '@/components/attendance/LeaveRequestModal';
import { AuthContext } from '@/contexts/AuthContext';
import { CalendarCheck } from 'lucide-react';
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
 * Architecture:
 * - useAttendanceAPI: API data fetching and bootstrap
 * - useAttendanceFilters: Filter UI state management
 * - useAttendanceEdit: Edit form state management
 * - usePagination: Generic pagination logic
 * - Local state: Leave request modal (UI concern)
 * 
 * Uses sub-components for UI organization:
 * - AttendanceStats: Display summary statistics
 * - AttendanceFilters: Filter controls
 * - AttendanceTable: Records table with pagination and edit
 */

export default function AttendanceView() {
  const authContext = useContext(AuthContext);
  const isHomeroomTeacher = authContext?.isHomeroomTeacher;

  // Filter state management
  const filters = useAttendanceFilters();
  const {
    selectedDate,
    selectedClass,
    selectedStatus,
    selectedAcademicYear,
    showFullList,
    handleDateChange,
    handleClassChange,
    handleStatusChange,
    handleAcademicYearChange,
    handleViewModeChange,
    resetFilters,
  } = filters;

  // API data fetching
  const api = useAttendanceAPI({
    selectedDate,
    selectedClass,
    selectedStatus,
    showFullList,
  });
  const {
    attendanceRecords,
    stats,
    classes,
    academicYears,
    loading,
    classesLoading,
    updating,
    error,
    successMessage,
    attendanceBootstrap,
    updateRecord: apiUpdateRecord,
  } = api;

  // Edit form state management
  const edit = useAttendanceEdit();
  const { editingRecord, editStatus, editNotes, startEdit, cancelEdit, isEditingRecord } = edit;

  // Local state for pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Calculate pagination
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const totalRecords = attendanceRecords.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const paginatedItems = attendanceRecords.slice(startIndex, endIndex);

  // Local state for Leave Request Modal (UI concern)
  const [leaveRequestOpen, setLeaveRequestOpen] = useState(false);
  const [leaveRequestRecord, setLeaveRequestRecord] = useState<any>(null);

  /**
   * Handle saving edited record - calls API and updates form state
   */
  const handleSaveEdit = async (): Promise<void> => {
    if (!editingRecord) return;
    const success = await apiUpdateRecord(editingRecord, editStatus, editNotes);
    if (success) {
      cancelEdit();
    }
  };

  /**
   * Handle opening leave request modal
   */
  const handleOpenLeaveRequest = (record: any): void => {
    setLeaveRequestRecord(record);
    setLeaveRequestOpen(true);
  };

  /**
   * Handle closing leave request modal
   */
  const handleLeaveRequestClose = (): void => {
    setLeaveRequestOpen(false);
    setLeaveRequestRecord(null);
  };

  /**
   * Handle successful leave request image upload
   */
  const handleLeaveRequestUploadSuccess = (imageUrl: string): void => {
    // Update record in list to reflect leave request image
    const updatedRecords = attendanceRecords.map((r: any) =>
      r.student_id === leaveRequestRecord?.student_id
        ? { ...r, leave_request_image: imageUrl }
        : r
    );
    api.setAttendanceRecords(updatedRecords);
  };

  return (
    <div className="attendance-view p-6">
      {/* Header */}
      <div className="mb-8">
        <PageHeader
          title="Điểm danh lớp học"
          description="Quản lý điểm danh lớp chủ nhiệm"
          icon={
          <div className="flex items-center justify-center w-16 h-16 shadow-md rounded-xl bg-primary flex-shrink-0">
            <CalendarCheck className="w-8 h-8 text-white" />
          </div>
          }
        />
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 mb-6 border rounded text-destructive bg-destructive/10 border-destructive/20">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="p-3 mb-6 text-green-700 bg-green-100 border border-green-400 rounded">
          {successMessage}
        </div>
      )}

      {/* Statistics */}
      <AttendanceStats stats={stats} loading={loading} />

      {/* Filters */}
      <AttendanceFilters
        loading={loading}
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
          handleAcademicYearChange(year);
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
        records={paginatedItems}
        totalRecords={totalRecords}
        totalPages={totalPages}
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
          startEdit(record);
        }}
        onCancelEdit={cancelEdit}
        onSaveEdit={handleSaveEdit}
        onStatusChange={(status) => edit.setEditStatus(status)}
        onNotesChange={(notes) => edit.setEditNotes(notes)}
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
