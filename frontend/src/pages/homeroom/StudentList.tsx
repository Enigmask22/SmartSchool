import { useEffect, useContext } from "react";
import { AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { AuthContext } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/contexts/useSystemSettings";
import { useStudentList } from "@/hooks/student-list/useStudentList";
import { useStudentFilters } from "@/hooks/student-list/useStudentFilters";
import { useStudentScores } from "@/hooks/student-list/useStudentScores";
import { useStudentFeedback } from "@/hooks/student-list/useStudentFeedback";
import {
  StudentListPageHeader,
  StudentListTool,
  StudentPagination,
  StudentGridView,
  StudentTableView,
} from "@/components/student-list";
import {
  ScoresModal,
  FeedbackModal,
  EmailReportCardModal,
} from "@/components/student-list/modals";

export function StudentListPage() {
  const authContext = useContext(AuthContext);
  const isHomeroomTeacher = authContext?.isHomeroomTeacher || (() => false);
  const { settings } = useSystemSettings();

  // Initialize filters hook - StudentList is now responsible for managing filters
  const filters = useStudentFilters();

  // Initialize academic year and semester from settings (matching FaceManagement pattern)
  useEffect(() => {
    if (settings.academic_year && !filters.selectedAcademicYear) {
      filters.setSelectedAcademicYear(settings.academic_year);
    }
  }, [settings.academic_year, filters]);

  useEffect(() => {
    if (settings.semester && !filters.selectedSemester) {
      filters.setSelectedSemester(settings.semester);
    }
  }, [settings.semester, filters]);

  // Initialize student list hook with filter dependencies
  const studentList = useStudentList({
    searchTerm: filters.searchTerm,
    selectedClass: filters.selectedClass,
    selectedAcademicYear: filters.selectedAcademicYear,
    selectedSemester: filters.selectedSemester,
    showInactive: filters.showInactive,
    homeroomClasses: filters.homeroomClasses,
  });

  // Initialize scores hook - needed by feedback
  const scores = useStudentScores(filters.selectedAcademicYear, filters.selectedSemester);

  // Initialize feedback hook (depends on scores)
  const feedback = useStudentFeedback({
    filters,
    scoresData: scores,
  });

  // Auto-select homeroom teacher's class for current academic year
  useEffect(() => {
    if (
      isHomeroomTeacher() &&
      filters.homeroomClasses &&
      filters.homeroomClasses.length > 0 &&
      (!filters.selectedClass || filters.selectedClass === "all")
    ) {
      filters.setSelectedClass(filters.homeroomClasses[0].class_name);
    }
  }, [filters.selectedAcademicYear, filters.homeroomClasses, isHomeroomTeacher, filters]);

  // Calculate pagination from filteredStudents
  const { totalStudents, totalPages, startIndex, endIndex } = filters.calculatePagination(studentList.filteredStudents);

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Page Header with Title, Badge, and Controls */}
      <StudentListPageHeader
        selectedClass={filters.selectedClass}
        academicYears={filters.academicYears}
        selectedAcademicYear={filters.selectedAcademicYear}
        onAcademicYearChange={(year) => {
          filters.setSelectedAcademicYear(year);
        }}
        selectedSemester={filters.selectedSemester}
        onSemesterChange={filters.setSelectedSemester}
        availableSemesters={filters.availableSemesters}
        loading={studentList.loading}
      />

      {/* Error Alert */}
      {studentList.error && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center p-4 space-x-2 border rounded-lg bg-destructive/10 border-destructive/20">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-destructive">{studentList.error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <StudentListTool
        searchTerm={filters.searchTerm}
        setSearchTerm={filters.setSearchTerm}
        selectedClass={filters.selectedClass}
        setSelectedClass={filters.setSelectedClass}
        availableClasses={filters.availableClasses}
        classesLoading={filters.classesLoading}
        isHomeroomTeacher={isHomeroomTeacher?.()}
        selectedAcademicYear={filters.selectedAcademicYear}
        selectedSemester={filters.selectedSemester}
        showInactive={filters.showInactive}
        setShowInactive={filters.setShowInactive}
        onRefresh={studentList.fetchStudents}
        onExportComments={() => {/* to be implemented in StudentListHeader */}}
      />

      {/* Pagination and Summary */}
      <StudentPagination
        totalStudents={totalStudents}
        currentPage={filters.currentPage}
        setCurrentPage={filters.setCurrentPage}
        pageSize={filters.pageSize}
        setPageSize={filters.setPageSize}
        totalPages={totalPages}
        viewMode={filters.viewMode as "grid" | "list"}
        setViewMode={filters.setViewMode}
        startIndex={startIndex}
        endIndex={endIndex}
        activeStudents={studentList.filteredStudents.filter((s) => s.is_active !== false).length}
        inactiveStudents={studentList.filteredStudents.filter((s) => s.is_active === false).length}
        filteredCount={studentList.filteredStudents.length}
        totalCount={totalStudents}
        searchTerm={filters.searchTerm}
        selectedClass={filters.selectedClass}
        loading={studentList.loading}
      />

      {/* Students Display - Grid or List View */}
      {filters.viewMode === "grid" ? (
        <StudentGridView
          paginatedStudents={studentList.filteredStudents.slice(startIndex, endIndex)}
          filteredStudents={studentList.filteredStudents}
          searchTerm={filters.searchTerm}
          selectedClass={filters.selectedClass}
          restoreLoading={false}
          fetchStudents={studentList.fetchStudents}
          onFeedback={feedback.handleFeedbackClick}
          onViewScores={scores.handleViewScores}
          loading={studentList.loading}
        />
      ) : (
        <StudentTableView
          paginatedStudents={studentList.filteredStudents.slice(startIndex, endIndex)}
          filteredStudents={studentList.filteredStudents}
          searchTerm={filters.searchTerm}
          selectedClass={filters.selectedClass}
          startIndex={startIndex}
          restoreLoading={false}
          fetchStudents={studentList.fetchStudents}
          onFeedback={feedback.handleFeedbackClick}
          onViewScores={scores.handleViewScores}
          loading={studentList.loading}
        />
      )}

      {/* Modals managed by page-level hooks */}
      <ScoresModal
        open={scores.showScoresModal}
        onOpenChange={scores.setShowScoresModal}
        selectedStudent={scores.selectedStudentForScores}
        scores={scores.studentScores}
        loading={scores.scoresLoading}
        hasData={scores.hasScoreData}
        onClose={scores.closeScoresModal}
        academicYear={filters.selectedAcademicYear}
        semester={filters.selectedSemester}
      />

      <FeedbackModal
        open={feedback.showFeedbackModal}
        onOpenChange={feedback.setShowFeedbackModal}
        selectedStudent={feedback.selectedStudentForFeedback}
        form={feedback.feedbackForm as any}
        onFormChange={feedback.handleFeedbackFormChange}
        loading={feedback.feedbackLoading}
        feedbackLoading={feedback.feedbackLoading}
        error={feedback.feedbackError}
        success={feedback.feedbackSuccess}
        hasScoreData={scores.hasScoreData}
        generatedFeedback={feedback.generatedFeedback}
        onGeneratedFeedbackChange={feedback.setGeneratedFeedback}
        onGenerateFeedback={feedback.generateFeedback}
        onSaveComment={feedback.saveComment}
        onClose={feedback.closeFeedbackModal}
        smsLoading={feedback.smsLoading}
        exportStudentReportCard={studentList.exportStudentReportCard}
        openEmailDialog={() => studentList.setShowEmailDialog(true)}
      />

      <EmailReportCardModal
        open={studentList.showEmailDialog}
        onOpenChange={studentList.setShowEmailDialog}
        selectedStudent={feedback.selectedStudentForFeedback}
        emailRecipient={studentList.emailRecipient}
        emailSending={studentList.emailSending}
        emailError={studentList.emailError}
        emailSuccess={studentList.emailSuccess}
        generatedFeedback={feedback.generatedFeedback}
        semester={filters.selectedSemester}
        selectedSemester={filters.selectedSemester}
        academicYear={filters.selectedAcademicYear}
        selectedAcademicYear={filters.selectedAcademicYear}
        onEmailRecipientChange={studentList.setEmailRecipient}
        onSend={studentList.handleSendEmailReportCard}
        onClose={studentList.closeEmailDialog}
      />
    </div>
  );
};

export default StudentListPage;
