import { Users, CheckCircle2, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StudentSummaryProps {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  filteredCount: number;
  totalCount: number;
  searchTerm?: string;
  selectedClass?: string;
}

export function StudentSummary({
  activeStudents,
  inactiveStudents,
  filteredCount,
  totalCount,
  searchTerm = "",
  selectedClass = "",
}: StudentSummaryProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex flex-wrap items-center gap-6">
          {/* Displayed count */}
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-muted-foreground">
              Hiển thị <span className="font-semibold text-foreground">{filteredCount}</span> / <span className="font-semibold text-foreground">{totalCount}</span> học sinh
              {searchTerm && <span> với từ khóa <span className="font-semibold italic">"{searchTerm}"</span></span>}
              {selectedClass && <span> trong lớp <span className="font-semibold">{selectedClass}</span></span>}
            </span>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-border" />

          {/* Active students count */}
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{activeStudents}</span> đang hoạt động
            </span>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-border" />

          {/* Inactive students count */}
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{inactiveStudents}</span> đã xóa
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
