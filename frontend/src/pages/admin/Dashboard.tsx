// React already imported by JSX transform
import { useState } from "react";
import { Award, BarChart3 } from "lucide-react";
import {
  Header,
  OverviewCards,
  InfraCards,
  AdminTabButtons,
  AttendanceTrendsTab,
  ClassPerformanceTab,
} from "@/components/admin-dashboard";
import { useAdminDashboard } from "@/hooks/admin-dashboard/useAdminDashboard";

export default function AdminDashboard() {
  // Domain logic hook
  const {
    loading,
    refreshing,
    attendancePeriod,
    isCurrentYear,
    selectedAcademicYear,
    academicYears,
    overview,
    attendanceTrends,
    classPerformance,
    infraStats,
    handleAttendancePeriodChange,
    handleAcademicYearChange,
    handleRefresh,
  } = useAdminDashboard();

  // UI state
  const [activeTab, setActiveTab] = useState<"attendance" | "performance">("attendance");
  const dashboardTabs = [
    { key: "attendance", label: "Điểm danh", icon: BarChart3 },
    { key: "performance", label: "Học lực theo lớp", icon: Award },
  ];

  return (
    <div className="space-y-6 p-6 min-h-screen">
      {/* Header — only academic year selector here */}
      <Header
        selectedAcademicYear={selectedAcademicYear}
        academicYears={academicYears}
        onAcademicYearChange={handleAcademicYearChange}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        loading={loading}
      />

      {/* KPI Stats Cards */}
      <OverviewCards
        overview={overview}
        selectedAcademicYear={selectedAcademicYear}
        loading={loading}
      />

      {/* Infrastructure Cards */}
      <InfraCards infraStats={infraStats} loading={loading} />

      {/* Tab Navigation */}
      <AdminTabButtons
        selectedTab={activeTab}
        tabs={dashboardTabs}
        onTabChange={(tab) => setActiveTab(tab as "attendance" | "performance")}
      />

      {/* Tab Content */}
      {activeTab === "attendance" && (
        <AttendanceTrendsTab
          attendanceTrends={attendanceTrends}
          attendancePeriod={attendancePeriod}
          isCurrentYear={isCurrentYear}
          onPeriodChange={handleAttendancePeriodChange}
          loading={loading}
        />
      )}
      {activeTab === "performance" && (
        <ClassPerformanceTab classPerformance={classPerformance} loading={loading} />
      )}
    </div>
  );
}
