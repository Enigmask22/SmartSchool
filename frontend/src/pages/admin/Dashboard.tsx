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
import { useAdminDashboard } from "@/hooks/useAdminDashboard";

export default function AdminDashboard() {
  const {
    loading,
    refreshing,
    selectedPeriod,
    overview,
    attendanceTrends,
    classPerformance,
    teacherPerformance,
    systemHealth,
    handlePeriodChange,
    handleRefresh,
  } = useAdminDashboard();

  if (loading) {
    return null;
  }

  return (
    <div className="space-y-6 p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <Header
        selectedPeriod={selectedPeriod}
        onPeriodChange={handlePeriodChange}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {/* Overview Cards */}
      <OverviewCards overview={overview} />

      {/* System Health */}
      <SystemHealth systemHealth={systemHealth} />

      {/* Main Content Tabs */}
      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="attendance">Điểm Danh</TabsTrigger>
          <TabsTrigger value="performance">Hiệu Suất Lớp</TabsTrigger>
          <TabsTrigger value="teachers">Giáo Viên</TabsTrigger>
        </TabsList>

        {/* Attendance Trends */}
        <TabsContent value="attendance" className="space-y-4">
          <AttendanceTrendsTab
            attendanceTrends={attendanceTrends}
            selectedPeriod={selectedPeriod}
          />
        </TabsContent>

        {/* Class Performance */}
        <TabsContent value="performance" className="space-y-4">
          <ClassPerformanceTab classPerformance={classPerformance} />
        </TabsContent>

        {/* Teacher Performance */}
        <TabsContent value="teachers" className="space-y-4">
          <TeacherPerformanceTab teacherPerformance={teacherPerformance} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
