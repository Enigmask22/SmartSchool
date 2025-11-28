import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ClassSubject {
  id: number;
  classes: {
    id: number;
    class_name: string;
    grade: string;
  };
  subjects: {
    id: number;
    subject_name: string;
  };
}

interface ClassSubjectSelectorProps {
  classSubjects: ClassSubject[];
  academicYear: string;
  onSelect: (classSubject: ClassSubject) => void;
}

export const ClassSubjectSelector: React.FC<ClassSubjectSelectorProps> = ({
  classSubjects,
  academicYear,
  onSelect,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="text-center">
          <CardTitle className="text-xl font-bold">Chọn lớp - môn học</CardTitle>
          <CardDescription>
            Lựa chọn lớp và môn học để bắt đầu quản lý điểm số
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classSubjects.map((classSubject) => (
            <Card
              key={classSubject.id}
              onClick={() => onSelect(classSubject)}
              className="transition-all duration-200 cursor-pointer hover:shadow-lg hover:border-primary group"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center justify-center text-lg font-bold rounded-lg w-11 h-11 text-primary-foreground bg-primary">
                    {classSubject.classes.class_name.charAt(0)}
                  </div>
                  <div className="flex items-center justify-center transition-colors rounded-full w-7 h-7 bg-muted group-hover:bg-primary/10">
                    <span className="text-muted-foreground group-hover:text-primary">
                      →
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

