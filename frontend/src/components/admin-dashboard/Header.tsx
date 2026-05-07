import { BarChart3, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/common/PageHeader";
import { PageHeaderControls } from "@/components/common/PageHeader/PageHeaderControls";

interface HeaderProps {
  selectedAcademicYear: string;
  academicYears: string[];
  onAcademicYearChange: (year: string) => void;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
  loading?: boolean;
}

export function Header({
  selectedAcademicYear,
  academicYears,
  onAcademicYearChange,
  onRefresh,
  refreshing,
  loading = false,
}: HeaderProps) {
  return (
    <PageHeader
      title="Tổng quan"
      description="Các số liệu thống kê về hệ thống"
      icon={
        <div className="flex items-center justify-center w-16 h-16 shadow-md rounded-xl bg-primary flex-shrink-0">
          <BarChart3 className="w-8 h-8 text-white" />
        </div>
      }
      loading={loading}
    >
      {loading ? (
        <div className="flex gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Năm học</label>
            <Skeleton className="h-10 w-[160px]" />
          </div>
          <Skeleton className="h-10 w-[100px] mt-6" />
        </div>
      ) : (
        <PageHeaderControls spacing="md">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Năm học</label>
            <Select value={selectedAcademicYear} onValueChange={onAcademicYearChange}>
              <SelectTrigger className="w-[160px] focus-visible:outline-none">
                <SelectValue placeholder="Chọn năm học" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={onRefresh}
            disabled={refreshing}
            variant="outline"
            className="mt-6 h-10"
          >
            <RefreshCcw
              className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Làm mới
          </Button>
        </PageHeaderControls>
      )}
    </PageHeader>
  );
}

