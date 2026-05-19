import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  User,
  GraduationCap,
  BookOpen,
  School,
  UserCheck,
  Building,
  Camera,
  Settings,
} from 'lucide-react';

const TABS = [
  { id: 'users', label: 'Người dùng', icon: 'User' },
  { id: 'teachers', label: 'Giáo viên', icon: 'GraduationCap' },
  { id: 'subjects', label: 'Môn học', icon: 'BookOpen' },
  { id: 'classes', label: 'Lớp học', icon: 'School' },
  { id: 'class_subjects', label: 'Phân công giảng dạy', icon: 'Building' },
  { id: 'cameras', label: 'Quản lý Camera', icon: 'Camera' },
  { id: 'system_settings', label: 'Cài đặt hệ thống', icon: 'Settings' },
];

interface TabNavigationProps {
  activeTab: string;
  onTabClick: (tabId: string) => void;
}

export function TabNavigation({
  activeTab,
  onTabClick,
} : TabNavigationProps) 
{
  const tabIcons: Record<string, React.ReactNode> = {
    User: <User className="w-5 h-5" />,
    GraduationCap: <GraduationCap className="w-5 h-5" />,
    BookOpen: <BookOpen className="w-5 h-5" />,
    School: <School className="w-5 h-5" />,
    UserCheck: <UserCheck className="w-5 h-5" />,
    Building: <Building className="w-5 h-5" />,
    Camera: <Camera className="w-5 h-5" />,
    Settings: <Settings className="w-5 h-5" />,
  };

  return (
    <div className="mb-8">
      <Card className="shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 justify-start">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabClick(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-primary hover:bg-muted'
                }`}
              >
                {tabIcons[tab.icon]}
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground"></div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
