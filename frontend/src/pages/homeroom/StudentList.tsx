import React, { useContext } from "react";
import { AlertCircle, Users } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { AuthContext } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useStudentList } from "@/hooks/useStudentList";
import {
  StudentListHeader,
  StudentPagination,
  StudentGridView,
  StudentTableView,
  StudentSummary,
} from "@/components/student-list";
import {
  ScoresModal,
  FeedbackModal,
  SubjectSelectionModal,
  FaceRegistrationModal,
  EditStudentModal,
  EmailReportCardModal,
  SubjectImportModal,
} from "@/components/student-list/modals";

const StudentListPage: React.FC = () => {
  const { isHomeroomTeacher } = useContext(AuthContext);
  const { academicYear, semester } = useSystemSettings();

  const hook = useStudentList();

  const {
    // Data
    students,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    selectedClass,
    setSelectedClass,
    availableClasses,
    classesLoading,
    homeroomClasses,
    academicYears,
    selectedAcademicYear,
    setSelectedAcademicYear,
    selectedSemester,
    setSelectedSemester,
    availableSemesters,
    showInactive,
    setShowInactive,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    viewMode,
    setViewMode,
    filteredStudents,
    paginatedStudents,
    totalStudents,
    totalPages,
    startIndex,
    endIndex,
    restoreLoading,

    // Face Registration Modal
    showFaceModal,
    setShowFaceModal,
    selectedStudentForFace,
    setSelectedStudentForFace,
    faceRegistrationLoading,
    closeFaceModal,
    videoRef,
    canvasRef,
    fileInputRef,
    capturedImage,
    setCapturedImage,
    uploadedImage,
    setUploadedImage,
    registrationMode,
    setRegistrationMode,
    cameraReady,
    cameraError,
    capturePhoto,
    resetCamera,
    handleImageUpload,
    submitFaceRegistration,

    // Multiple Face Registration Modal
    showMultipleModal,
    setShowMultipleModal,
    selectedStudentForMultiple,
    setSelectedStudentForMultiple,
    multipleFiles,
    multipleResults,
    setMultipleFiles,
    setMultipleResults,
    removeMultipleFile,
    handleMultipleFileSelect,
    submitMultipleFaceRegistration,
    multipleFileInputRef,

    // Edit Modal
    showEditModal,
    setShowEditModal,
    selectedStudentForEdit,
    editForm,
    editLoading,
    handleEditFormChange,
    addParentContactRow,
    removeParentContactRow,
    updateParentContactField,
    submitEditForm,
    closeEditModal,

    // Scores Modal
    showScoresModal,
    setShowScoresModal,
    selectedStudentForScores,
    studentScores,
    scoresLoading,
    hasScoreData,
    closeScoresModal,

    // Feedback Modal
    showFeedbackModal,
    setShowFeedbackModal,
    selectedStudentForFeedback,
    feedbackForm,
    setFeedbackForm,
    generatedFeedback,
    setGeneratedFeedback,
    feedbackLoading,
    feedbackError,
    feedbackSuccess,
    smsLoading,
    handleFeedbackFormChange,
    generateFeedback,
    saveComment,
    closeFeedbackModal,

    // Subject Modal
    showSubjectModal,
    setShowSubjectModal,
    selectedStudentForSubject,
    availableSubjects,
    selectedSubjects,
    toggleSubjectSelection,
    saveSubjectSelection,
    subjectLoading,
    closeSubjectModal,

    // Subject Import Modal
    showSubjectImportModal,
    setShowSubjectImportModal,
    subjectImportFile,
    setSubjectImportFile,
    subjectImportLoading,
    handleSubjectImport,

    // Email Dialog
    showEmailDialog,
    setShowEmailDialog,
    emailRecipient,
    setEmailRecipient,
    emailSending,
    emailError,
    emailSuccess,
    handleSendEmailReportCard,
    closeEmailDialog,

    // Actions
    fetchStudents,
    fetchAvailableClasses,
    startFaceRegistration,
    handleEdit,
    handleRestore,
    handleViewScores,
    handleFeedbackClick,
    handleSubjectSelection,
    downloadSubjectTemplate,
    exportAllComments,
    exportStudentReportCard,
  } = hook;

  return (
    <div className="min-h-screen p-6 space-y-6 bg-gray-50">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-primary" />
            <span className="text-3xl font-bold">Danh sách học sinh</span>
          </CardTitle>
          <CardDescription className="text-lg">
            Quản lý thông tin học sinh
          </CardDescription>
        </CardHeader>
        {error && (
          <CardContent>
            <div className="flex items-center p-4 space-x-2 border rounded-lg bg-destructive/10 border-destructive/20">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-destructive">{error}</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Header with filters and actions */}
      <StudentListHeader
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        availableClasses={availableClasses}
        classesLoading={classesLoading}
        isHomeroomTeacher={isHomeroomTeacher()}
        homeroomClasses={homeroomClasses}
        academicYears={academicYears}
        selectedAcademicYear={selectedAcademicYear}
        setSelectedAcademicYear={(v) => {
          setSelectedAcademicYear(v);
          fetchAvailableClasses(v);
        }}
        selectedSemester={selectedSemester}
        setSelectedSemester={setSelectedSemester}
        availableSemesters={availableSemesters}
        showInactive={showInactive}
        setShowInactive={setShowInactive}
        fetchAvailableClasses={fetchAvailableClasses}
        onRefresh={fetchStudents}
        onDownloadTemplate={downloadSubjectTemplate}
        onImportSubjects={() => setShowSubjectImportModal(true)}
        onExportComments={exportAllComments}
      />

      {/* Pagination Header */}
      {totalStudents > 0 && (
        <StudentPagination
          totalStudents={totalStudents}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          totalPages={totalPages}
          viewMode={viewMode as "grid" | "list"}
          setViewMode={setViewMode}
          startIndex={startIndex}
          endIndex={endIndex}
        />
      )}

      {/* Students Display - Grid or List View */}
      {viewMode === "grid" ? (
        <StudentGridView
          paginatedStudents={paginatedStudents}
          filteredStudents={filteredStudents}
          searchTerm={searchTerm}
          selectedClass={selectedClass}
          restoreLoading={restoreLoading}
          onEdit={handleEdit}
          onViewScores={handleViewScores}
          onFeedback={handleFeedbackClick}
          onSelectSubjects={handleSubjectSelection}
          onUploadMultiple={(student) => {
            setSelectedStudentForFace(student);
            setRegistrationMode("multiple");
            setShowFaceModal(true);
          }}
          onRestore={handleRestore}
        />
      ) : (
        <StudentTableView
          paginatedStudents={paginatedStudents}
          filteredStudents={filteredStudents}
          searchTerm={searchTerm}
          selectedClass={selectedClass}
          startIndex={startIndex}
          restoreLoading={restoreLoading}
          onEdit={handleEdit}
          onViewScores={handleViewScores}
          onFeedback={handleFeedbackClick}
          onSelectSubjects={handleSubjectSelection}
          onUploadMultiple={(student) => {
            setSelectedStudentForFace(student);
            setRegistrationMode("multiple");
            setShowFaceModal(true);
          }}
          onRestore={handleRestore}
        />
      )}

      {/* Summary Footer */}
      <StudentSummary
        totalStudents={totalStudents}
        activeStudents={filteredStudents.filter((s) => s.is_active !== false)
          .length}
        inactiveStudents={filteredStudents.filter((s) => s.is_active === false)
          .length}
        filteredCount={filteredStudents.length}
        totalCount={totalStudents}
        searchTerm={searchTerm}
        selectedClass={selectedClass}
      />

      {/* Individual Modals */}
      <FaceRegistrationModal
        open={showFaceModal}
        onOpenChange={setShowFaceModal}
        selectedStudent={selectedStudentForFace}
        showFaceModal={showFaceModal}
        setShowFaceModal={setShowFaceModal}
        registrationMode={registrationMode as "camera" | "upload" | "multiple"}
        setRegistrationMode={setRegistrationMode}
        capturedImage={capturedImage}
        setCapturedImage={setCapturedImage}
        uploadedImage={uploadedImage}
        setUploadedImage={setUploadedImage}
        cameraReady={cameraReady}
        cameraError={cameraError}
        faceRegistrationLoading={faceRegistrationLoading}
        multipleFiles={multipleFiles}
        multipleResults={multipleResults}
        setMultipleFiles={setMultipleFiles}
        setMultipleResults={setMultipleResults}
        videoRef={videoRef}
        canvasRef={canvasRef}
        fileInputRef={fileInputRef}
        multipleFileInputRef={multipleFileInputRef}
        capturePhoto={capturePhoto}
        resetCamera={resetCamera}
        handleImageUpload={handleImageUpload}
        submitFaceRegistration={submitFaceRegistration}
        handleMultipleFileSelect={handleMultipleFileSelect}
        removeMultipleFile={removeMultipleFile}
        submitMultipleFaceRegistration={submitMultipleFaceRegistration}
      />

      <EditStudentModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        selectedStudent={selectedStudentForEdit}
        editForm={editForm}
        editLoading={editLoading}
        isHomeroomTeacher={isHomeroomTeacher()}
        onFormChange={handleEditFormChange}
        onAddParentContact={addParentContactRow}
        onRemoveParentContact={removeParentContactRow}
        onUpdateParentContactField={updateParentContactField}
        onSubmit={submitEditForm}
        onClose={closeEditModal}
      />

      <ScoresModal
        open={showScoresModal}
        onOpenChange={setShowScoresModal}
        selectedStudent={selectedStudentForScores}
        scores={studentScores}
        loading={scoresLoading}
        hasData={hasScoreData}
        onClose={closeScoresModal}
        academicYear={academicYear}
        semester={semester}
      />

      <FeedbackModal
        open={showFeedbackModal}
        onOpenChange={setShowFeedbackModal}
        selectedStudent={selectedStudentForFeedback}
        form={feedbackForm}
        onFormChange={handleFeedbackFormChange}
        loading={feedbackLoading}
        feedbackLoading={feedbackLoading}
        error={feedbackError}
        success={feedbackSuccess}
        hasScoreData={hasScoreData}
        generatedFeedback={generatedFeedback}
        onGeneratedFeedbackChange={setGeneratedFeedback}
        onGenerateFeedback={generateFeedback}
        onSaveComment={saveComment}
        onClose={closeFeedbackModal}
        smsLoading={smsLoading}
        exportStudentReportCard={exportStudentReportCard}
        openEmailDialog={() => setShowEmailDialog(true)}
      />

      <EmailReportCardModal
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        selectedStudent={selectedStudentForFeedback}
        emailRecipient={emailRecipient}
        emailSending={emailSending}
        emailError={emailError}
        emailSuccess={emailSuccess}
        generatedFeedback={generatedFeedback}
        semester={semester}
        selectedSemester={selectedSemester}
        academicYear={academicYear}
        selectedAcademicYear={selectedAcademicYear}
        onEmailRecipientChange={setEmailRecipient}
        onSend={handleSendEmailReportCard}
        onClose={closeEmailDialog}
      />

      <SubjectSelectionModal
        open={showSubjectModal}
        onOpenChange={setShowSubjectModal}
        selectedStudent={selectedStudentForSubject}
        availableSubjects={availableSubjects}
        selectedSubjects={selectedSubjects}
        onToggleSubject={toggleSubjectSelection}
        loading={subjectLoading}
        onSave={saveSubjectSelection}
        onClose={closeSubjectModal}
      />

      <SubjectImportModal
        open={showSubjectImportModal}
        onOpenChange={setShowSubjectImportModal}
        selectedClass={selectedClass}
        subjectImportFile={subjectImportFile}
        subjectImportLoading={subjectImportLoading}
        onFileSelect={setSubjectImportFile}
        onImport={handleSubjectImport}
        onClose={() => {
          setShowSubjectImportModal(false);
          setSubjectImportFile(null);
        }}
      />
    </div>
  );
};

export default StudentListPage;
