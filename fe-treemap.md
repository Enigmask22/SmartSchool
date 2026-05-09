# Frontend File Structure

```
frontend/
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.js
├── vitest.config.ts
├── tailwind.config.js
├── postcss.config.js
├── playwright.config.js
├── components.json
├── check-logger-imports.js
├── .env
│
├── types/
│   └── index.ts
│
├── public/
│
├── e2e/
│   ├── fixtures/
│   │   ├── admin.fixture.js
│   │   ├── auth.fixture.js
│   │   └── homeroom.fixture.js
│   ├── helpers/
│   │   └── test-data.js
│   └── specs/
│       ├── TS-ADM01-08.spec.js
│       ├── TS-ADM02-12.spec.js
│       ├── TS-ADM02EX-06-09.spec.js
│       ├── TS-ADM03-08.spec.js
│       ├── TS-ADM04-06.spec.js
│       ├── TS-ADM06-06.spec.js
│       ├── TS-ADM07-08.spec.js
│       ├── TS-ADM08-01-09.spec.js
│       ├── TS-ADM09-08.spec.js
│       ├── TS-ADM10-08.spec.js
│       ├── TS-GEN02-01-18.spec.js
│       ├── TS-HOM01-08.spec.js
│       ├── TS-HOM02-08.spec.js
│       ├── TS-HOM03-10.spec.js
│       ├── TS-HOM04-11.spec.js
│       ├── TS-SUB01-06.spec.js
│       ├── TS-SUB02-10.spec.js
│       ├── TS-SUB02EXT-10.spec.js
│       └── TS-SUB02EXT-2-ocr.spec.js
│
└── src/
    ├── App.tsx
    ├── App.css
    ├── index.tsx
    ├── index.css
    ├── vite-env.d.ts
    │
    ├── contexts/
    │   ├── AuthContext.tsx
    │   ├── SystemSettingsContext.tsx
    │   └── useSystemSettings.ts
    │
    ├── layouts/
    │   └── MainLayout.tsx
    │
    ├── utils/
    │   ├── api.ts
    │   ├── constants.ts
    │   ├── excelScoreExport.ts
    │   ├── logger.ts
    │   ├── studentReportExport.ts
    │   └── utils.ts
    │
    ├── pages/
    │   ├── admin/
    │   │   ├── ClassManagement.tsx
    │   │   ├── ContinuousRecognition.tsx
    │   │   ├── Dashboard.tsx
    │   │   ├── Management.tsx
    │   │   └── UIDemo.tsx
    │   ├── auth/
    │   │   ├── DashboardSelector.tsx
    │   │   ├── ForgotPassword.tsx
    │   │   └── Login.tsx
    │   ├── homeroom/
    │   │   ├── AttendanceView.tsx
    │   │   ├── Dashboard.tsx
    │   │   ├── FaceManagement.tsx
    │   │   └── StudentList.tsx
    │   ├── profile/
    │   │   └── PersonalInfo.tsx
    │   └── subject/
    │       ├── Dashboard.tsx
    │       └── ScoreManagement.tsx
    │
    ├── hooks/
    │   ├── useAuthProtection.ts
    │   ├── usePagination.ts
    │   ├── usePeriodFilter.ts
    │   ├── useTabState.ts
    │   ├── admin-dashboard/
    │   │   └── useAdminDashboard.ts
    │   ├── admin-management/
    │   │   ├── FORM_VALIDATION_EXAMPLE.tsx
    │   │   ├── useAdminFilters.ts
    │   │   ├── useAdminForm.ts
    │   │   ├── useAdminImport.ts
    │   │   ├── useAdminManagement.ts
    │   │   ├── useAdminSearch.ts
    │   │   ├── useAdminUtilities.ts
    │   │   ├── useClassSelection.ts
    │   │   ├── useClassSubjectBulkSelection.ts
    │   │   ├── useConfirmDialog.ts
    │   │   ├── useFormValidation.ts
    │   │   ├── useScoreColumnManagement.ts
    │   │   ├── useSorting.ts
    │   │   ├── useTabCrud.ts
    │   │   ├── useTableFilters.ts
    │   │   └── useTeacherSubjectManagement.ts
    │   ├── attendance/
    │   │   ├── useAttendanceAPI.ts
    │   │   ├── useAttendanceEdit.ts
    │   │   └── useAttendanceFilters.ts
    │   ├── class-management/
    │   │   ├── useClassManagement.ts
    │   │   ├── useClassManagementAPI.ts
    │   │   ├── useClassManagementData.ts
    │   │   ├── useClassManagementDialog.ts
    │   │   └── useClassManagementStudentOps.ts
    │   ├── continuous-recognition/
    │   │   ├── index.ts
    │   │   ├── useRecognitionCamera.ts
    │   │   ├── useRecognitionCameraSource.ts
    │   │   ├── useRecognitionConnection.ts
    │   │   ├── useRecognitionControl.ts
    │   │   └── useRecognitionData.ts
    │   ├── dashboard-selector/
    │   │   └── useRoleDetection.ts
    │   ├── face-management/
    │   │   ├── index.ts
    │   │   ├── useFaceManagement.ts
    │   │   ├── useFaceManagementAPI.ts
    │   │   ├── useFaceManagementFilters.ts
    │   │   ├── useFaceRegistration.ts
    │   │   └── useMultipleFaceRegistration.ts
    │   ├── forgot-password/
    │   │   ├── useOTPInput.ts
    │   │   └── usePasswordResetLogic.ts
    │   ├── homeroom-dashboard/
    │   │   └── useHomeroomData.ts
    │   ├── login/
    │   │   ├── useAuthSubmit.ts
    │   │   └── usePasswordVisibility.ts
    │   ├── profile/
    │   │   ├── index.ts
    │   │   ├── usePasswordManagement.ts
    │   │   └── usePersonalInfoData.ts
    │   ├── score-management/
    │   │   ├── index.ts
    │   │   ├── useScoreConfigForm.ts
    │   │   ├── useScoreEditForm.ts
    │   │   ├── useScoreImportForm.ts
    │   │   ├── useScoreManagement.ts
    │   │   ├── useScoreManagementAPI.ts
    │   │   └── useScoreManagementFilters.ts
    │   ├── student-list/
    │   │   ├── useStudentEdit.ts
    │   │   ├── useStudentFeedback.ts
    │   │   ├── useStudentFilters.ts
    │   │   ├── useStudentImport.ts
    │   │   ├── useStudentList.ts
    │   │   ├── useStudentScores.ts
    │   │   └── useStudentSubjects.ts
    │   └── subject-dashboard/
    │       └── useSubjectDashboard.ts
    │
    ├── components/
    │   ├── admin-dashboard/
    │   │   ├── index.ts
    │   │   ├── AdminTabButtons.tsx
    │   │   ├── AttendanceTrendsTab.tsx
    │   │   ├── ClassPerformanceTab.tsx
    │   │   ├── Header.tsx
    │   │   ├── InfraCards.tsx
    │   │   ├── OverviewCards.tsx
    │   │   └── TeacherPerformanceTab.tsx
    │   ├── admin-management/
    │   │   ├── ActionButtons.tsx
    │   │   ├── AdminManagementForm.tsx
    │   │   ├── AdminPagination.tsx
    │   │   ├── AdminTable.tsx
    │   │   ├── CameraManagement.tsx
    │   │   ├── ImportTeachersModal.tsx
    │   │   ├── SearchAndFilters.tsx
    │   │   ├── SystemSettings.tsx
    │   │   ├── tableHelpers.tsx
    │   │   ├── TabNavigation.tsx
    │   │   └── form-sections/
    │   │       ├── ClassSubjectsFormSection.tsx
    │   │       ├── CommonFormFields.tsx
    │   │       ├── FormFieldRenderer.tsx
    │   │       ├── OtherTabsFormSection.tsx
    │   │       ├── SubjectsFormSection.tsx
    │   │       └── TeachersFormSection.tsx
    │   ├── attendance/
    │   │   ├── AttendanceFilters.tsx
    │   │   ├── AttendanceStats.tsx
    │   │   ├── AttendanceTable.tsx
    │   │   ├── AttendanceTableRow.tsx
    │   │   └── LeaveRequestModal.tsx
    │   ├── class-management/
    │   │   ├── index.ts
    │   │   ├── AddStudentModal.tsx
    │   │   ├── AssignToClassModal.tsx
    │   │   ├── ClassFilterCard.tsx
    │   │   ├── ClassManagementSelector.tsx
    │   │   ├── ClassManagementTabNavigation.tsx
    │   │   ├── EditStudentModal.tsx
    │   │   ├── ImportModal.tsx
    │   │   ├── MoveClassModal.tsx
    │   │   └── StudentsTableCard.tsx
    │   ├── common/
    │   │   ├── Sidebar.tsx
    │   │   └── PageHeader/
    │   │       ├── index.ts
    │   │       ├── PageHeader.tsx
    │   │       ├── PageHeaderControls.tsx
    │   │       ├── PageHeaderSkeleton.tsx
    │   │       └── PageHeaderTitle.tsx
    │   ├── continuous-recognition/
    │   │   ├── index.ts
    │   │   ├── CameraView.tsx
    │   │   ├── PageHeader.tsx
    │   │   ├── RecentRecognitions.tsx
    │   │   └── StatisticsPanel.tsx
    │   ├── dashboard-selector/
    │   │   ├── index.ts
    │   │   ├── DashboardHeader.tsx
    │   │   ├── FeatureList.tsx
    │   │   ├── HomeroomDashboardCard.tsx
    │   │   ├── LoadingCard.tsx
    │   │   └── SubjectDashboardCard.tsx
    │   ├── face-management/
    │   │   ├── index.ts
    │   │   ├── AIStatusCard.tsx
    │   │   ├── FaceManagementSkeleton.tsx
    │   │   ├── FilterSection.tsx
    │   │   ├── Instructions.tsx
    │   │   ├── MultipleFaceRegistration.tsx
    │   │   └── StudentsTable.tsx
    │   ├── forgot-password/
    │   │   ├── index.ts
    │   │   ├── ErrorAlert.tsx
    │   │   ├── ForgotPasswordHeader.tsx
    │   │   ├── OTPInput.tsx
    │   │   ├── Step1Form.tsx
    │   │   ├── Step2Form.tsx
    │   │   ├── Step3Form.tsx
    │   │   └── SuccessAlert.tsx
    │   ├── homeroom-dashboard/
    │   │   ├── index.ts
    │   │   ├── AllStudentsModal.tsx
    │   │   ├── HeaderFilters.tsx
    │   │   ├── StatsCards.tsx
    │   │   ├── StudentGrid.tsx
    │   │   └── TopAbsentLateCard.tsx
    │   ├── login/
    │   │   ├── index.ts
    │   │   ├── DemoAccounts.tsx
    │   │   ├── ErrorAlert.tsx
    │   │   ├── ForgotPasswordLink.tsx
    │   │   ├── LoginHeader.tsx
    │   │   ├── PasswordField.tsx
    │   │   ├── SubmitButton.tsx
    │   │   └── UsernameField.tsx
    │   ├── profile/
    │   │   ├── PasswordSection.tsx
    │   │   ├── PersonalInfoSection.tsx
    │   │   ├── PersonalInfoSkeleton.tsx
    │   │   └── TeachingInfoSection.tsx
    │   ├── routing/
    │   │   └── ProtectedRoute.tsx
    │   ├── score-management/
    │   │   ├── index.ts
    │   │   ├── AddColumnModal.tsx
    │   │   ├── ClassSelector.tsx
    │   │   ├── ConfigEditorModal.tsx
    │   │   ├── ImportPreviewModal.tsx
    │   │   ├── NoScoreConfigState.tsx
    │   │   ├── OCRScoreSheet.tsx
    │   │   ├── ScoreEditModal.tsx
    │   │   ├── ScoreManagementHeader.tsx
    │   │   ├── ScoreTable.tsx
    │   │   └── ScoreTableHeader.tsx
    │   ├── student-list/
    │   │   ├── index.ts
    │   │   ├── MultipleFaceRegistration.tsx
    │   │   ├── StudentGridView.tsx
    │   │   ├── StudentListPageHeader.tsx
    │   │   ├── StudentListTool.tsx
    │   │   ├── StudentPagination.tsx
    │   │   ├── StudentTableView.tsx
    │   │   └── modals/
    │   │       ├── index.ts
    │   │       ├── EditStudentModal.tsx
    │   │       ├── EmailReportCardModal.tsx
    │   │       ├── FeedbackModal.tsx
    │   │       ├── ScoresModal.tsx
    │   │       ├── SubjectImportModal.tsx
    │   │       └── SubjectSelectionModal.tsx
    │   ├── subject-dashboard/
    │   │   ├── index.ts
    │   │   ├── ClassFilter.tsx
    │   │   ├── Header.tsx
    │   │   ├── StatsCards.tsx
    │   │   ├── TabButtons.tsx
    │   │   └── tabs/
    │   │       ├── AttentionTab.tsx
    │   │       ├── ComparisonTab.tsx
    │   │       ├── OverviewTab.tsx
    │   │       └── TopStudentsTab.tsx
    │   └── ui/
    │       ├── alert-dialog.tsx
    │       ├── alert.tsx
    │       ├── avatar.tsx
    │       ├── badge.tsx
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── confirm-dialog.tsx
    │       ├── dialog.tsx
    │       ├── input.tsx
    │       ├── label.tsx
    │       ├── popover.tsx
    │       ├── progress.tsx
    │       ├── select.tsx
    │       ├── separator.tsx
    │       ├── simple-date-picker.tsx
    │       ├── skeleton.tsx
    │       ├── sonner.tsx
    │       ├── table.tsx
    │       ├── tabs.tsx
    │       ├── textarea.tsx
    │       └── tooltip.tsx
    │
    └── tests/
        ├── setup.ts
        ├── hook-test-template.ts
        └── __tests__/
            ├── example.test.ts
            ├── useFormValidation.test.ts
            ├── TS-ADM01-06.test.tsx
            ├── TS-ADM02-06.test.tsx
            ├── TS-ADM02EX-02-03.test.tsx
            ├── TS-ADM03-02-03.test.tsx
            ├── TS-ADM04-02-03.test.tsx
            ├── TS-ADM04-04-05.test.tsx
            ├── TS-ADM06-02-03.test.tsx
            ├── TS-ADM06-04-05.test.tsx
            ├── TS-ADM06EX-T01-T02.test.tsx
            ├── TS-ADM07-02-03.test.tsx
            ├── TS-ADM07-04-05.test.tsx
            ├── TS-ADM08-08.test.tsx
            ├── TS-ADM09-09.test.tsx
            ├── TS-ADM10-09.test.tsx
            ├── TS-GEN02-04.test.tsx
            ├── TS-GEN03-GEN04-FE.test.tsx
            ├── TS-HOM01-09.test.tsx
            ├── TS-HOM02-09.test.tsx
            ├── TS-HOM03-10.test.tsx
            ├── TS-HOM04-11.test.tsx
            ├── TS-SUB01-10.test.ts
            ├── TS-SUB02-04.test.ts
            ├── TS-SUB02EXT-04.test.ts
            └── TS-SUB02EXT-2-ocr-frontend.test.ts
```
