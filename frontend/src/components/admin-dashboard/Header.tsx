import { Activity, BarChart3 } from "lucide-react";
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
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
  loading?: boolean;
}

export function Header({
  selectedPeriod,
  onPeriodChange,
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
            <label className="text-xs font-medium text-gray-500">
              Thời kỳ
            </label>
            <Skeleton className="h-10 w-[140px]" />
          </div>
          <Skeleton className="h-10 w-[100px] mt-6" />
        </div>
      ) : (
        <PageHeaderControls spacing="md">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">
              Thời kỳ
            </label>
            <Select value={selectedPeriod} onValueChange={onPeriodChange}>
              <SelectTrigger className="w-[140px] focus-visible:outline-none">
                <SelectValue placeholder="Chọn thời kỳ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ngày</SelectItem>
                <SelectItem value="30">30 ngày</SelectItem>
                <SelectItem value="90">90 ngày</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={onRefresh}
            disabled={refreshing}
            variant="outline"
            className="mt-6"
          >
            <Activity
              className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Làm mới
          </Button>
        </PageHeaderControls>
      )}
    </PageHeader>
  );
}
