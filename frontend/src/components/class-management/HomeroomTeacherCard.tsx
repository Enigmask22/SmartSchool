import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCheck } from 'lucide-react';

interface HomeroomTeacherCardProps {
  homeroomTeacher: {
    name: string;
    code: string;
    full_name: string;
  } | null;
  selectedClassForManagement: string | null;
}

const HomeroomTeacherCard = ({
  homeroomTeacher,
  selectedClassForManagement,
}: HomeroomTeacherCardProps) => {
  if (!selectedClassForManagement || !homeroomTeacher) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserCheck className="w-5 h-5 text-primary" />
          <span>Giáo viên chủ nhiệm</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary">
            <span className="text-lg font-bold text-primary-foreground">
              {homeroomTeacher.full_name?.charAt(0) || '?'}
            </span>
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {homeroomTeacher.full_name || homeroomTeacher.name}
            </p>
            {homeroomTeacher.code && (
              <p className="text-sm text-muted-foreground">
                Mã GV: {homeroomTeacher.code}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HomeroomTeacherCard;
