// React already imported by JSX transform
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight } from 'lucide-react';

interface ClassSubject {
  id: string | number;
  classes: {
    class_name: string;
    grade: string;
  };
  subjects: {
    subject_name: string;
  };
}

interface ClassSelectorProps {
  assignedClasses: ClassSubject[];
  academicYear: string;
  onSelect: (classSubject: ClassSubject) => void;
}

export default function ClassSelector({
  assignedClasses,
  academicYear,
  onSelect,
}
: ClassSelectorProps) {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="text-center">
          <CardTitle className="text-xl font-bold">
            Chọn lớp - môn học
          </CardTitle>
          <CardDescription className="mt-2">
            Lựa chọn lớp và môn học để bắt đầu quản lý điểm số
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 min-h-[400px] items-start">
          {assignedClasses.map((classSubject) => (
            <Card
              key={classSubject.id}
              onClick={() => onSelect(classSubject)}
              className="transition-all duration-200 cursor-pointer hover:shadow-lg hover:border-primary group"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center justify-center text-lg font-bold rounded-lg w-11 h-11 text-primary-foreground bg-primary">
                    {classSubject.subjects.subject_name[0]}
                  </div>
                  <div className="flex items-center justify-center transition-colors rounded-full w-7 h-7 bg-muted group-hover:bg-primary/10">
                    <span className="text-muted-foreground group-hover:text-primary">
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>

                <h3 className="mb-1 text-base font-bold text-foreground">
                  {classSubject.classes.class_name}
                </h3>
                <p className="mb-3 font-medium text-primary">
                  {classSubject.subjects.subject_name}
                </p>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    Khối {classSubject.classes.grade}
                  </Badge>
                  <span className="text-xs">{academicYear}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const ClassSelectorSkeleton = () => (
  <Card className="shadow-md">
    <CardHeader>
      <div className="text-center">
        <CardTitle className="text-xl font-bold">
          Chọn lớp - môn học
        </CardTitle>
        <CardDescription className="mt-2">
          Lựa chọn lớp và môn học để bắt đầu quản lý điểm số
        </CardDescription>
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 min-h-[400px] items-start">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card
            key={i}
            className="transition-all duration-200 hover:shadow-lg"
          >
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <Skeleton className="h-11 w-11 rounded-lg" />
                <Skeleton className="h-7 w-7 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </CardContent>
  </Card>
);
