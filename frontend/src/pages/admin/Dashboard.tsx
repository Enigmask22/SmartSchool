// React already imported by JSX transform
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Header,
  OverviewCards,
  SystemHealth,
  AttendanceTrendsTab,
  ClassPerformanceTab,
  TeacherPerformanceTab,
} from "@/components/admin-dashboard";
import { useAdminDashboard } from "@/hooks/admin-dashboard/useAdminDashboard";
import { useTabState } from "@/hooks/useTabState";

export default function AdminDashboard() {
  // Domain logic hook
  const {
    loading,
    refreshing,
    selectedPeriod,
    selectedAcademicYear,
    academicYears,
    overview,
    attendanceTrends,
    classPerformance,
    teacherPerformance,
    systemHealth,
    handlePeriodChange,
    handleAcademicYearChange,
    handleRefresh,
  } = useAdminDashboard();

  // UI state hook
  const { activeTab, handleTabChange } = useTabState('attendance');

  return (
    <div className="space-y-6 p-6 min-h-screen">
      {/* Header */}
      {/* <Header
        selectedPeriod={selectedPeriod}
        selectedAcademicYear={selectedAcademicYear}
        academicYears={academicYears}
        onPeriodChange={handlePeriodChange}
        onAcademicYearChange={handleAcademicYearChange}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        loading={loading}
      /> */}

      {/* Overview Cards */}
      {/* <OverviewCards overview={overview} loading={loading} /> */}

      {/* System Health */}
      {/* <SystemHealth systemHealth={systemHealth} loading={loading} /> */}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="attendance">Điểm danh</TabsTrigger>
          <TabsTrigger value="performance">Hiệu suất lớp</TabsTrigger>
          <TabsTrigger value="teachers">Giáo viên</TabsTrigger>
        </TabsList>

        {/* Attendance Trends */}
        <TabsContent value="attendance" className="space-y-4">
          <AttendanceTrendsTab
            attendanceTrends={attendanceTrends}
            selectedPeriod={selectedPeriod}
            loading={loading}
          />
        </TabsContent>

        {/* Class Performance */}
        <TabsContent value="performance" className="space-y-4">
          <ClassPerformanceTab classPerformance={classPerformance} loading={loading} />
        </TabsContent>

        {/* Teacher Performance */}
        <TabsContent value="teachers" className="space-y-4">
          <TeacherPerformanceTab teacherPerformance={teacherPerformance} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
