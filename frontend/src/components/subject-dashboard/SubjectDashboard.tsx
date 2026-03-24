import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { TabButtons } from './TabButtons';
import { EmptyState } from './EmptyState';
import { OverviewTab } from './tabs/OverviewTab';
import { AttentionTab } from './tabs/AttentionTab';
import { TopStudentsTab } from './tabs/TopStudentsTab';
import { ComparisonTab } from './tabs/ComparisonTab';
import { useSubjectDashboard } from '@/hooks/useSubjectDashboard';

export function SubjectDashboard() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const { analytics: data, loading } = useSubjectDashboard();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-800">Không thể tải dữ liệu. Vui lòng thử lại.</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Bảng Điều Khiển Phân Tích Điểm Số
        </h1>
        <p className="text-gray-600 mt-1">Phân tích và quản lý dữ liệu học sinh</p>
      </div>

      {/* Tab Navigation */}
      <TabButtons selectedTab={selectedTab} onTabChange={(tab) => setSelectedTab(tab)} />

      {/* Tab Content */}
      <div>
        {selectedTab === 'overview' && (
          <OverviewTab data={data} />
        )}
        {selectedTab === 'attention' && (
          <AttentionTab data={data} />
        )}
        {selectedTab === 'top' && (
          <TopStudentsTab data={data} />
        )}
        {selectedTab === 'comparison' && (
          <ComparisonTab data={data} />
        )}
      </div>
    </div>
  );
}
