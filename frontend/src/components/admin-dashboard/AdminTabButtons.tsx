import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface AdminDashboardTabItem {
  key: string;
  label: string;
  icon?: LucideIcon;
}

interface AdminTabButtonsProps {
  selectedTab: string;
  tabs: AdminDashboardTabItem[];
  onTabChange: (tab: string) => void;
}

export function AdminTabButtons({ selectedTab, tabs, onTabChange }: AdminTabButtonsProps) {
  return (
    <Card className="shadow-md">
      <CardContent className="py-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                variant={selectedTab === tab.key ? "default" : "outline"}
                className="min-w-[200px] h-12"
              >
                {Icon ? <Icon className="w-4 h-4 mr-2" /> : null}
                {tab.label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
