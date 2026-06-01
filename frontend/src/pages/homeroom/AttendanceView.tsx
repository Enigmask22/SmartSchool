import { useContext, useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAttendanceAPI } from '@/hooks/attendance/useAttendanceAPI';
import { useAttendanceFilters } from '@/hooks/attendance/useAttendanceFilters';
import { useAttendanceEdit } from '@/hooks/attendance/useAttendanceEdit';
import AttendanceStats from '@/components/attendance/AttendanceStats';
import AttendanceFilters from '@/components/attendance/AttendanceFilters';
import AttendanceTable from '@/components/attendance/AttendanceTable';
import LeaveRequestModal from '@/components/attendance/LeaveRequestModal';
import NotebookModal from '@/components/attendance/NotebookModal';
import { AuthContext } from '@/contexts/AuthContext';
import { CalendarCheck, Lock, BookOpen } from 'lucide-react';
import ApiService from '@/utils/api';
import logger from '@/utils/logger';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
    academicYears,
    apiSelectedClass,
    loading,
    classesLoading,
    updating,
    error,
    successMessage,
    attendanceBootstrap,
    updateRecord: apiUpdateRecord,
    attendanceEditLocked,
  } = api;

  // For homeroom teachers, use the selected class and its ID from the hook
  const displayClass = isHomeroomTeacher?.() && apiSelectedClass?.class_name ? apiSelectedClass.class_name : "";
  const displayClassId = isHomeroomTeacher?.() && apiSelectedClass?.id ? apiSelectedClass.id : undefined;

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

  // Local state for Notebook Modal (Sổ đầu bài)
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [notebookImageUrl, setNotebookImageUrl] = useState<string | null>(null);
  const [notebookLoading, setNotebookLoading] = useState(false);

  // Fetch notebook image khi thay đổi ngày hoặc lớp
  useEffect(() => {
    if (!displayClassId || !selectedDate) {
      setNotebookImageUrl(null);
      return;
    }
    setNotebookLoading(true);
    ApiService.getNotebookImage(displayClassId, selectedDate)
      .then((res: any) => {
        if (res.success && res.data?.image_url) {
          setNotebookImageUrl(res.data.image_url);
        } else {
          setNotebookImageUrl(null);
        }
      })
      .catch((err: any) => {
        logger.error('Error fetching notebook:', err);
        setNotebookImageUrl(null);
      })
      .finally(() => setNotebookLoading(false));
  }, [displayClassId, selectedDate]);

  const handleNotebookUploadSuccess = (imageUrl: string | null): void => {
    setNotebookImageUrl(imageUrl);
  };

  /**
   * Handle saving edited record - calls API and updates form state
   */
  const handleSaveEdit = async (): Promise<void> => {
    if (attendanceEditLocked) {
      toast.error('Đã quá hạn chỉnh sửa điểm danh.');
      return;
    }
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
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 shadow-md rounded-xl bg-primary flex-shrink-0">
            <CalendarCheck className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Điểm danh lớp học</h1>
            <div className="mt-1">
              {displayClass ? (
                <div className="flex gap-2">
                  <Badge variant="secondary">{selectedAcademicYear}</Badge>
                  <Badge variant="secondary">{`Lớp ${displayClass}`}</Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Chưa được phân công chủ nhiệm</p>
              )}
            </div>
          </div>
        </div>
        {displayClass && (
          <Button
            size="sm"
            variant={
              notebookImageUrl
                ? 'default'
                : 'outline'
            }
            onClick={() => setNotebookOpen(true)}
            disabled={notebookLoading}
            className={`h-9 text-xs ${notebookImageUrl ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
            title={
              notebookImageUrl
                ? 'Xem sổ đầu bài'
                : 'Upload sổ đầu bài'
            }
          >
            <BookOpen className="w-4 h-4 mr-1" />
            Sổ đầu bài
          </Button>
        )}
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

      {attendanceEditLocked && displayClass && (
        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <Lock className="h-4 w-4 text-amber-800" />
          <AlertDescription className="text-amber-900">
            Điểm danh đang khóa sửa (đã quá hạn hoặc bạn chưa được cấp quyền). Bạn vẫn xem được danh sách; chỉ xem đơn xin nghỉ đã lưu, không sửa trạng thái hay tải đơn mới.
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics */}
      <AttendanceStats stats={stats} loading={loading} />

      {/* Filters */}
      <AttendanceFilters
        loading={loading}
        selectedDate={selectedDate}
        selectedStatus={selectedStatus}
        selectedAcademicYear={selectedAcademicYear}
        showFullList={showFullList}
        academicYears={academicYears}
        classesLoading={classesLoading}
        onDateChange={handleDateChange}
        onStatusChange={handleStatusChange}
        onAcademicYearChange={(year) => {
          handleAcademicYearChange(year);
          const bootstrapParams: any = { year, date: selectedDate };
          if (displayClassId) bootstrapParams.classId = displayClassId;
          attendanceBootstrap(bootstrapParams);
        }}
        onViewModeChange={handleViewModeChange}
        onSearchClick={() => {
          const bootstrapParams: any = {
            year: selectedAcademicYear,
            date: selectedDate,
          };
          if (displayClassId) bootstrapParams.classId = displayClassId;
          attendanceBootstrap(bootstrapParams);
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
        selectedClass={displayClass}
        showFullList={showFullList}
        page={page}
        pageSize={pageSize}
        editingRecord={editingRecord}
        editStatus={editStatus}
        editNotes={editNotes}
        updating={updating}
        onEditRecord={(record) => {
          if (attendanceEditLocked) {
            toast.error('Đã quá hạn chỉnh sửa điểm danh.');
            return;
          }
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
          uploadDisabled={attendanceEditLocked}
        />
      )}

      {/* Notebook Modal (Sổ đầu bài) */}
      <NotebookModal
        open={notebookOpen}
        onClose={() => setNotebookOpen(false)}
        classId={displayClassId}
        className={displayClass}
        targetDate={selectedDate}
        existingImageUrl={notebookImageUrl}
        onUploadSuccess={handleNotebookUploadSuccess}
        uploadDisabled={attendanceEditLocked}
      />
    </div>
  );
};
