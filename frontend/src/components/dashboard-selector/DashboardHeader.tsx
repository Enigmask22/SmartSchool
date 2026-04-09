import { GraduationCap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';

export function DashboardHeader() {
  return (
    <Card className="mb-6">
      <CardContent className="p-8 text-center">
        <div className="inline-flex justify-center items-center mb-6 mr-3 w-16 h-16 bg-primary rounded-full shadow-lg">
          <GraduationCap className="w-10 h-10 text-primary-foreground" />
        </div>
        <CardTitle className="inline-flex mb-3 text-4xl font-bold text-primary">
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
}
