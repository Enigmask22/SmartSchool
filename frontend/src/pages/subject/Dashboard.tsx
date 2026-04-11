import { useState } from "react";
import {
  Header,
  StatsCards,
  ClassFilter,
  TabButtons,
  OverviewTab,
  AttentionTab,
  TopStudentsTab,
  ComparisonTab,
} from "@/components/subject-dashboard";
import {
  useSubjectDashboard,
  SEMESTERS,
} from "@/hooks/subject-dashboard/useSubjectDashboard";
import { ACADEMIC_YEAR_OPTIONS } from "@/utils/constants";

const SubjectTeacherDashboard = () => {
  // UI State - Tab selection (kept in component)
  const [selectedTab, setSelectedTab] = useState("overview");
  
  const {
    loading,
    analytics,
    classList,
    selectedClass,
    loadingClasses,
    academicYear,
    semester,
    setSelectedClass,
    setAcademicYear,
    setSemester,
  } = useSubjectDashboard();

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="mx-auto space-y-6 max-w-7xl">
        {/* Header with user info and filters */}
        <Header
          academicYear={academicYear}
          semester={semester}
          onAcademicYearChange={setAcademicYear}
          onSemesterChange={setSemester}
          subjects={analytics?.subjects || []}
          academicYears={ACADEMIC_YEAR_OPTIONS}
          semesters={SEMESTERS}
          loading={loading}
        />

        {/* Class Filter */}
        <ClassFilter
          selectedClass={selectedClass}
          onClassSelect={setSelectedClass}
          classList={classList}
          loadingClasses={loadingClasses || loading}
          totalClasses={analytics?.total_classes || 0}
        />

        {/* Overview Stats Cards */}
        <StatsCards analytics={analytics || {
          total_classes: 0,
          total_students: 0,
          students_with_scores: 0,
          students_without_scores: 0,
          is_letter_grade_subject: false,
          subjects: [],
          overview: { pass_count: 0, fail_count: 0, average_score: 0, highest_score: 0, lowest_score: 0, pass_rate: 0 },
          performance_groups: {},
          score_distribution: {},
          students_need_attention: [],
          top_students: [],
          class_comparison: [],
        }} loading={loading} />

        {/* Tab Navigation */}
        <TabButtons selectedTab={selectedTab} onTabChange={setSelectedTab} />

        {/* Tab Content */}
        <OverviewTab data={analytics || {
          total_classes: 0,
          total_students: 0,
          students_with_scores: 0,
          students_without_scores: 0,
          is_letter_grade_subject: false,
          subjects: [],
          overview: { pass_count: 0, fail_count: 0, average_score: 0, highest_score: 0, lowest_score: 0, pass_rate: 0 },
          performance_groups: {},
          score_distribution: {},
          students_need_attention: [],
          top_students: [],
          class_comparison: [],
        }} loading={loading} hidden={selectedTab !== "overview"} />
        
        <AttentionTab data={analytics || {
          total_classes: 0,
          total_students: 0,
          students_with_scores: 0,
          students_without_scores: 0,
          is_letter_grade_subject: false,
          subjects: [],
          overview: { pass_count: 0, fail_count: 0, average_score: 0, highest_score: 0, lowest_score: 0, pass_rate: 0 },
          performance_groups: {},
          score_distribution: {},
          students_need_attention: [],
          top_students: [],
          class_comparison: [],
        }} loading={loading} hidden={selectedTab !== "attention"} />
        
        <TopStudentsTab data={analytics || {
          total_classes: 0,
          total_students: 0,
          students_with_scores: 0,
          students_without_scores: 0,
          is_letter_grade_subject: false,
          subjects: [],
          overview: { pass_count: 0, fail_count: 0, average_score: 0, highest_score: 0, lowest_score: 0, pass_rate: 0 },
          performance_groups: {},
          score_distribution: {},
          students_need_attention: [],
          top_students: [],
          class_comparison: [],
        }} loading={loading} hidden={selectedTab !== "top"} />
        
        <ComparisonTab data={analytics || {
          total_classes: 0,
          total_students: 0,
          students_with_scores: 0,
          students_without_scores: 0,
          is_letter_grade_subject: false,
          subjects: [],
          overview: { pass_count: 0, fail_count: 0, average_score: 0, highest_score: 0, lowest_score: 0, pass_rate: 0 },
          performance_groups: {},
          score_distribution: {},
          students_need_attention: [],
          top_students: [],
          class_comparison: [],
        }} loading={loading} hidden={selectedTab !== "comparison"} />
      </div>
    </div>
  );
};

export default SubjectTeacherDashboard;
