import { BarChart3, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AdminTabButtonsProps {
  selectedTab: string;
  onTabChange: (tab: "attendance" | "performance") => void;
}

export function AdminTabButtons({ selectedTab, onTabChange }: AdminTabButtonsProps) {
  return (
    <Card className="shadow-md">
      <CardContent className="p-2">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => onTabChange("attendance")}
            variant={selectedTab === "attendance" ? "default" : "outline"}
            className="flex-1 min-w-fit"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Điểm danh
          </Button>
          <Button
            onClick={() => onTabChange("performance")}
            variant={selectedTab === "performance" ? "default" : "outline"}
            className="flex-1 min-w-fit"
          >
            <Award className="w-4 h-4 mr-2" />
            Học lực theo lớp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
