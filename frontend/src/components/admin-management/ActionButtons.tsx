import React from 'react';
import { Plus, Download, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActionButtonsProps {
  activeTab: string;
  onAddClick: () => void;
  onImportClick?: () => void;
  onInitializeClick?: () => void;
  showInitializeButton?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  activeTab,
  onAddClick,
  onImportClick,
  onInitializeClick,
  showInitializeButton = false,
}) => {
  return (
    <div className="flex space-x-3">
      {activeTab === 'teachers' && (
        <Button
          onClick={onImportClick}
          className="bg-green-600 hover:bg-green-700"
        >
          <Download className="w-5 h-5 mr-2" />
          Import từ Users
        </Button>
      )}
      {activeTab === 'class_subjects' && showInitializeButton && (
        <Button
          onClick={onInitializeClick}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Shuffle className="w-5 h-5 mr-2" />
          Khởi tạo môn học
        </Button>
      )}
      <Button onClick={onAddClick}>
        <Plus className="w-5 h-5 mr-2" />
        Thêm mới
      </Button>
    </div>
  );
};