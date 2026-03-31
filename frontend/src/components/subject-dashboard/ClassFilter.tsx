import React from 'react';
import { Users, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Subject {
  subject_id: string;
  subject_name: string;
  subject_code: string;
}

interface Class {
  class_id: string;
  class_name: string;
  grade: number;
  subjects: Subject[];
}

interface ClassFilterProps {
  classList: Class[];
  selectedClass: string | null;
  loadingClasses: boolean;
  totalClasses: number;
  onClassSelect: (classId: string | null) => void;
}

export const ClassFilter: React.FC<ClassFilterProps> = ({
  classList,
  selectedClass,
  loadingClasses,
  totalClasses,
  onClassSelect,
}) => (
  <div className="p-4 bg-white border shadow-md rounded-xl">
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center space-x-2">
        <Users className="w-5 h-5 text-gray-600" />
        <label className="text-sm font-medium text-gray-700">Lọc theo lớp học:</label>
      </div>
      <div className="flex flex-wrap flex-1 gap-2">
        <Button
          variant={selectedClass === null ? "default" : "outline"}
          size="sm"
          onClick={() => onClassSelect(null)}
          className="transition-all"
          disabled={loadingClasses}
        >
          <GraduationCap className="w-4 h-4 mr-1" />
          Tất cả lớp ({totalClasses})
        </Button>
        {loadingClasses
          ? [...Array(4)].map((_, idx) => (
              <Skeleton key={idx} className="w-24 h-8 rounded" />
            ))
          : classList && classList.length > 0
          ? classList.map((classItem) => (
              <Button
                key={classItem.class_id}
                variant={selectedClass === classItem.class_id ? "default" : "outline"}
                size="sm"
                onClick={() => onClassSelect(classItem.class_id)}
                className="transition-all"
              >
                {classItem.class_name}
                {classItem.subjects && classItem.subjects.length > 0 && (
                  <span className="ml-1 text-xs opacity-70">
                    ({classItem.subjects.map((s) => s.subject_code).join(", ")})
                  </span>
                )}
              </Button>
            ))
          : null}
      </div>
      {selectedClass && (
        <Badge variant="secondary" className="text-blue-700 bg-blue-100">
          Đang xem: {classList.find((c) => c.class_id === selectedClass)?.class_name || ""}
        </Badge>
      )}
    </div>
  </div>
);
