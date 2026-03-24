import {
  Database,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SystemHealthData } from "@/hooks/useAdminDashboard";

interface SystemHealthProps {
  systemHealth: SystemHealthData | null;
}

export function SystemHealth({ systemHealth }: SystemHealthProps) {
  if (!systemHealth) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Trạng Thái Database
          </CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Badge
              variant={
                systemHealth.database_status === "healthy"
                  ? "default"
                  : "destructive"
              }
            >
              {systemHealth.database_status === "healthy"
                ? "Hoạt động tốt"
                : "Lỗi"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Lỗi 24h</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {systemHealth.error_count_24h}
          </div>
          <p className="text-xs text-muted-foreground">Lỗi hệ thống</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Uptime</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{systemHealth.uptime}</div>
          <p className="text-xs text-muted-foreground">
            Thời gian hoạt động
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
