import { useContext } from "react";
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
  LoadingState,
  ErrorState,
} from "@/components/subject-dashboard";
import {
  useSubjectDashboard,
  ACADEMIC_YEARS,
  SEMESTERS,
  type AnalyticsData,
} from "@/hooks/useSubjectDashboard";

const SubjectTeacherDashboard = () => {
  const { user } = useContext(AuthContext);
  const {
    loading,
    analytics,
    selectedTab,
    classList,
    selectedClass,
    loadingClasses,
    academicYear,
    semester,
    setSelectedTab,
    setSelectedClass,
    setAcademicYear,
    setSemester,
  } = useSubjectDashboard();

  // Show loading state
  if (loading) {
    return <LoadingState />;
  }

  // Show error state if no analytics data
  if (!analytics) {
    return <ErrorState />;
  }

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
          subjects={analytics.subjects || []}
          academicYears={ACADEMIC_YEARS}
          semesters={SEMESTERS}
        />

        {/* Class Filter */}
        <ClassFilter
          selectedClass={selectedClass}
          onClassSelect={setSelectedClass}
          classList={classList}
          loadingClasses={loadingClasses}
          totalClasses={analytics.total_classes}
        />

        {/* Overview Stats Cards */}
        <StatsCards analytics={analytics} />

        {/* Tab Navigation */}
        <TabButtons selectedTab={selectedTab} onTabChange={setSelectedTab} />

        {/* Tab Content */}
        {selectedTab === "overview" && <OverviewTab data={analytics} />}
        {selectedTab === "attention" && <AttentionTab data={analytics} />}
        {selectedTab === "top" && <TopStudentsTab data={analytics} />}
        {selectedTab === "comparison" && <ComparisonTab data={analytics} />}
      </div>
    </div>
  );
};

export default SubjectTeacherDashboard;
