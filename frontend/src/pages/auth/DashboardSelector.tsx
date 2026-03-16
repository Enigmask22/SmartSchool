/**
 * DashboardSelector.tsx - Dashboard Role Selection Page
 * 
 * Refactored from DashboardSelector.jsx:
 * - Extracted role checking logic to useDashboardSelector hook
 * - Added TypeScript types
 * - Extracted sub-components for better organization
 */

import React from 'react';
import { GraduationCap, Users, Loader2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useDashboardSelector } from '@/hooks/useDashboardSelector';

/**
 * LoadingCard - Loading state display component
 */
const LoadingCard: React.FC = () => (
  <div className="flex justify-center items-center min-h-screen bg-gray-50">
    <Card className="w-96">
      <CardContent className="p-8 text-center">
        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Đang kiểm tra quyền truy cập...</p>
      </CardContent>
    </Card>
  </div>
);

/**
 * DashboardHeader - Header section with title and description
 */
const DashboardHeader: React.FC = () => (
  <Card className="mb-8">
    <CardContent className="p-8 text-center">
      <div className="inline-flex justify-center items-center mb-6 w-20 h-20 bg-primary rounded-full shadow-lg">
        <GraduationCap className="w-10 h-10 text-primary-foreground" />
      </div>
      <CardTitle className="mb-3 text-4xl font-bold text-primary">
        Chọn Dashboard
      </CardTitle>
      <CardDescription className="text-lg">
        Bạn vừa là Giáo viên chủ nhiệm vừa là Giáo viên bộ môn
      </CardDescription>
      <p className="mt-2 text-sm text-muted-foreground">
        Vui lòng chọn dashboard bạn muốn xem
      </p>
    </CardContent>
  </Card>
);

/**
 * FeatureList - List of features for a dashboard option
 */
interface FeatureListProps {
  features: string[];
}

const FeatureList: React.FC<FeatureListProps> = ({ features }) => (
  <ul className="space-y-3">
    {features.map((feature, index) => (
      <li key={index} className="flex items-center text-muted-foreground">
        <span className="mr-2 text-green-500">✓</span>
        <span className="text-sm">{feature}</span>
      </li>
    ))}
  </ul>
);

/**
 * HomeroomDashboardCard - Homeroom teacher dashboard option
 */
interface HomeroomDashboardCardProps {
  onClick: () => void;
}

const HomeroomDashboardCard: React.FC<HomeroomDashboardCardProps> = ({ onClick }) => (
  <Card
    onClick={onClick}
    className="overflow-hidden cursor-pointer group hover:shadow-xl hover:scale-105 transition-all duration-300"
  >
    <CardHeader className="bg-primary text-primary-foreground">
      <div className="flex justify-between items-center">
        <div className="flex justify-center items-center w-14 h-14 bg-primary-foreground/20 rounded-xl">
          <Users className="w-8 h-8 text-primary-foreground" />
        </div>
        <div className="flex justify-center items-center w-8 h-8 bg-primary-foreground/20 rounded-full transition-all group-hover:bg-primary-foreground/30">
          <ArrowRight className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>
      <CardTitle className="text-2xl font-bold text-primary-foreground">Dashboard Chủ Nhiệm</CardTitle>
      <CardDescription className="text-primary-foreground/80">
        Quản lý lớp chủ nhiệm của bạn
      </CardDescription>
    </CardHeader>
    
    <CardContent className="p-6">
      <FeatureList features={[
        'Theo dõi điểm danh học sinh',
        'Quản lý thông tin học sinh',
        'Thống kê chuyên cần theo tuần',
        'Quản lý khuôn mặt AI'
      ]} />
    </CardContent>

    <div className="px-6 pb-6">
      <Button className="w-full">
        Chọn Dashboard Chủ Nhiệm
      </Button>
    </div>
  </Card>
);

/**
 * SubjectDashboardCard - Subject teacher dashboard option
 */
interface SubjectDashboardCardProps {
  onClick: () => void;
}

const SubjectDashboardCard: React.FC<SubjectDashboardCardProps> = ({ onClick }) => (
  <Card
    onClick={onClick}
    className="overflow-hidden cursor-pointer group hover:shadow-xl hover:scale-105 transition-all duration-300"
  >
    <CardHeader className="bg-purple-600 text-white">
      <div className="flex justify-between items-center">
        <div className="flex justify-center items-center w-14 h-14 bg-white/20 rounded-xl">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>
        <div className="flex justify-center items-center w-8 h-8 bg-white/20 rounded-full transition-all group-hover:bg-white/30">
          <ArrowRight className="w-5 h-5 text-white" />
        </div>
      </div>
      <CardTitle className="text-2xl font-bold text-white">Dashboard Bộ Môn</CardTitle>
      <CardDescription className="text-white/80">
        Phân tích điểm số các lớp bạn dạy
      </CardDescription>
    </CardHeader>
    
    <CardContent className="p-6">
      <FeatureList features={[
        'Phân tích điểm số chuyên sâu',
        'Phân nhóm học lực chi tiết',
        'Học sinh cần quan tâm',
        'So sánh giữa các lớp'
      ]} />
    </CardContent>

    <div className="px-6 pb-6">
      <Button className="w-full bg-purple-600 hover:bg-purple-700">
        Chọn Dashboard Bộ Môn
      </Button>
    </div>
  </Card>
);

/**
 * DashboardFooter - Footer note about dashboard switching
 */
const DashboardFooter: React.FC = () => (
  <Card className="mt-8">
    <CardContent className="p-4 text-center">
      <p className="text-sm text-muted-foreground">
        💡 <span className="font-medium">Lưu ý:</span> Bạn có thể chuyển đổi giữa các dashboard bất cứ lúc nào thông qua menu bên trái
      </p>
    </CardContent>
  </Card>
);

/**
 * DashboardOptions - Grid of dashboard selection cards
 */
interface DashboardOptionsProps {
  hasHomeroomRole: boolean;
  hasSubjectRole: boolean;
  onHomeroomSelect: () => void;
  onSubjectSelect: () => void;
}

const DashboardOptions: React.FC<DashboardOptionsProps> = ({
  hasHomeroomRole,
  hasSubjectRole,
  onHomeroomSelect,
  onSubjectSelect
}) => (
  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
    {hasHomeroomRole && (
      <HomeroomDashboardCard onClick={onHomeroomSelect} />
    )}
    {hasSubjectRole && (
      <SubjectDashboardCard onClick={onSubjectSelect} />
    )}
  </div>
);

/**
 * DashboardSelector Component
 * Displays dashboard selection interface for users with multiple roles
 * 
 * Features:
 * - Protected route (redirects to login if not authenticated)
 * - Auto-redirects if user only has one role
 * - Shows loading state during role checking
 * - Displays dashboard options for all user roles
 */
const DashboardSelector: React.FC = () => {
  const { hasHomeroomRole, hasSubjectRole, loading, handleSelectDashboard } = useDashboardSelector();

  // Show loading state
  if (loading) {
    return <LoadingCard />;
  }

  // Auto-redirect if only one role
  if (hasHomeroomRole && !hasSubjectRole) {
    return null;
  }

  if (hasSubjectRole && !hasHomeroomRole) {
    return null;
  }

  // Show dashboard selection
  return (
    <div className="flex justify-center items-center p-6 min-h-screen bg-gray-50">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <DashboardHeader />

        {/* Dashboard Options */}
        <DashboardOptions
          hasHomeroomRole={hasHomeroomRole}
          hasSubjectRole={hasSubjectRole}
          onHomeroomSelect={() => handleSelectDashboard('homeroom')}
          onSubjectSelect={() => handleSelectDashboard('subject')}
        />

        {/* Footer */}
        <DashboardFooter />
      </div>
    </div>
  );
};

export default DashboardSelector;
