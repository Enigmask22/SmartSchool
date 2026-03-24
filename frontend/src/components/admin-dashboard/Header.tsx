import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HeaderProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
}

export function Header({
  selectedPeriod,
  onPeriodChange,
  onRefresh,
  refreshing,
}: HeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Dashboard Quản Trị
        </h1>
        <p className="text-gray-600">
          Tổng quan hệ thống và thống kê chi tiết
        </p>
      </div>
      <div className="flex items-center space-x-4">
        <Select value={selectedPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 ngày</SelectItem>
            <SelectItem value="30">30 ngày</SelectItem>
            <SelectItem value="90">90 ngày</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={onRefresh}
          disabled={refreshing}
          variant="outline"
        >
          <Activity
            className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          Làm mới
        </Button>
      </div>
    </div>
  );
}
