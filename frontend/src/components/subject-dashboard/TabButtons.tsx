import {
  BarChart3,
  AlertTriangle,
  Trophy,
  TrendingDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TabButtonsProps {
  selectedTab: string;
  onTabChange: (tab: "overview" | "attention" | "top" | "comparison") => void;
}

export function TabButtons({ selectedTab, onTabChange }: TabButtonsProps) {
  return (
    <Card>
      <CardContent className="p-2">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => onTabChange('overview')}
            variant={selectedTab === 'overview' ? 'default' : 'outline'}
            className="flex-1 min-w-fit"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Tổng quan
          </Button>
          <Button
            onClick={() => onTabChange('attention')}
            variant={selectedTab === 'attention' ? 'default' : 'outline'}
            className="flex-1 min-w-fit"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Học sinh cần quan tâm
          </Button>
          <Button
            onClick={() => onTabChange('top')}
            variant={selectedTab === 'top' ? 'default' : 'outline'}
            className="flex-1 min-w-fit"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Học sinh xuất sắc
          </Button>
          <Button
            onClick={() => onTabChange('comparison')}
            variant={selectedTab === 'comparison' ? 'default' : 'outline'}
            className="flex-1 min-w-fit"
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            So sánh lớp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
