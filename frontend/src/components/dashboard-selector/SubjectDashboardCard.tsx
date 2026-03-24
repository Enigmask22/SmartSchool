import { GraduationCap, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FeatureList } from './FeatureList';

interface SubjectDashboardCardProps {
  onClick: () => void;
}

export function SubjectDashboardCard({ onClick }: SubjectDashboardCardProps) {
  return (
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
        <FeatureList
          features={[
            'Phân tích điểm số chuyên sâu',
            'Phân nhóm học lực chi tiết',
            'Học sinh cần quan tâm',
            'So sánh giữa các lớp',
          ]}
        />
      </CardContent>

      <div className="px-6 pb-6">
        <Button className="w-full bg-purple-600 hover:bg-purple-700">
          Chọn Dashboard Bộ Môn
        </Button>
      </div>
    </Card>
  );
}
