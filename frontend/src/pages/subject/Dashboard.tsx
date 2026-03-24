import { useContext, useState } from "react";
import { AuthContext } from "@/contexts/AuthContext";
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
  ACADEMIC_YEARS,
  SEMESTERS,
} from "@/hooks/subject-dashboard/useSubjectDashboard";

const SubjectTeacherDashboard = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  
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
          userName={user?.full_name || ""}
          academicYear={academicYear}
          semester={semester}
          onAcademicYearChange={setAcademicYear}
          onSemesterChange={setSemester}
          subjects={analytics?.subjects || []}
          academicYears={ACADEMIC_YEARS}
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
          students_with_grades: 0,
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
        {analytics && (
          <>
            {selectedTab === "overview" && <OverviewTab data={analytics} loading={loading} />}
            {selectedTab === "attention" && <AttentionTab data={analytics} loading={loading} />}
            {selectedTab === "top" && <TopStudentsTab data={analytics} loading={loading} />}
            {selectedTab === "comparison" && <ComparisonTab data={analytics} loading={loading} />}
          </>
        )}
      </div>
    </div>
  );
};

export default SubjectTeacherDashboard;
