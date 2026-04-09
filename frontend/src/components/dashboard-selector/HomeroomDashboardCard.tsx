import { Users, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FeatureList } from './FeatureList';

interface HomeroomDashboardCardProps {
  onClick: () => void;
}

export function HomeroomDashboardCard({ onClick }: HomeroomDashboardCardProps) {
  return (
    <Card
      onClick={onClick}
      className="overflow-hidden cursor-pointer group hover:shadow-xl hover:scale-105 transition-all duration-300 border-primary"
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
        <CardTitle className="text-2xl font-bold text-primary-foreground">Dashboard Chủ nhiệm</CardTitle>
        <CardDescription className="text-primary-foreground/80">
          Quản lý lớp chủ nhiệm của bạn
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <FeatureList
          features={[
            'Theo dõi điểm danh học sinh',
            'Quản lý thông tin học sinh',
            'Thống kê chuyên cần theo tuần',
            'Quản lý khuôn mặt AI',
          ]}
        />
      </CardContent>

      <div className="px-6 pb-6">
        <Button className="w-full">
          Chọn Dashboard Chủ nhiệm
        </Button>
      </div>
    </Card>
  );
}
