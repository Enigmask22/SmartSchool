import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Users } from 'lucide-react';

interface ClassManagementTabNavigationProps {
  activeTab: 'profiles' | 'distribution';
  onTabClick: (tab: 'profiles' | 'distribution') => void;
}

export function ClassManagementTabNavigation({
  activeTab,
  onTabClick,
}: ClassManagementTabNavigationProps) {
  const tabs = [
    {
      id: 'distribution' as const,
      label: 'Phân bổ lớp học',
      icon: BookOpen,
      description: 'Quản lý phân bổ học sinh theo lớp',
    },
    {
      id: 'profiles' as const,
      label: 'Hồ sơ học sinh',
      icon: Users,
      description: 'Quản lý thông tin học sinh',
    },
  ];

  return (
    <div>
      <Card className="shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 justify-start">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabClick(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:text-primary hover:bg-muted'
                  }`}
                  title={tab.description}
                >
                  <IconComponent className="w-5 h-5" />
                  <span>{tab.label}</span>
                  {activeTab === tab.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground"></div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
