import React from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface User {
  id: number;
  full_name: string;
  email: string;
}

interface ImportTeachersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableUsers: User[];
  selectedUserIds: number[];
  onUserSelect: (userId: number) => void;
  onImport: () => void;
  isLoading?: boolean;
}

export const ImportTeachersModal: React.FC<ImportTeachersModalProps> = ({
  open,
  onOpenChange,
  availableUsers,
  selectedUserIds,
  onUserSelect,
  onImport,
  isLoading = false,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import giáo viên từ Users</DialogTitle>
          <DialogDescription>
            Chọn những user có role teacher hoặc homeroom_teacher để tạo thành giáo viên
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {availableUsers.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-8 h-8 mx-auto mb-4 text-gray-400" />
              <p className="font-medium text-gray-500">Không có user nào có thể import</p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-4 rounded-lg border-2 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => onUserSelect(user.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">{user.full_name}</h4>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Hủy
          </Button>
          <Button
            onClick={onImport}
            disabled={selectedUserIds.length === 0 || isLoading}
          >
            {isLoading ? 'Đang tạo...' : `Tạo ${selectedUserIds.length} giáo viên`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
