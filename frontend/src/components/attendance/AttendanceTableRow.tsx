// React already imported by JSX transform
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Student {
  student_id: string;
  full_name: string;
  class_name: string;
}

interface AttendanceRecord {
  id: number | null;
  student_id: string;
  status: 'present' | 'absent' | 'late';
  check_in_time?: string;
  check_out_time?: string;
  confidence_score?: number;
  notes?: string;
  students?: Student;
  leave_request_image?: string;
}

interface AttendanceTableRowProps {
  record: AttendanceRecord;
  index: number;
  isEditing: boolean;
  editStatus: string;
  editNotes: string;
  updating: boolean;
  onEdit: (record: AttendanceRecord) => void;
  onCancel: () => void;
  onSave: () => void;
  onStatusChange: (status: string) => void;
  onNotesChange: (notes: string) => void;
  onOpenLeaveRequest?: (record: AttendanceRecord) => void;
  isHomeroomTeacher?: boolean;
}

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { variant: string; className: string; label: string }> = {
    present: {
      variant: 'default',
      className: 'bg-green-100 text-green-800',
      label: 'Có mặt',
    },
    absent: {
      variant: 'destructive',
      className: '',
      label: 'Vắng mặt',
    },
    late: {
      variant: 'secondary',
      className: 'bg-yellow-100 text-yellow-800',
      label: 'Muộn',
    },
  };

  const config = statusConfig[status] || {
    variant: 'outline',
    className: '',
    label: status,
  };

  return (
    <Badge variant={config.variant as any} className={config.className}>
      {config.label}
    </Badge>
  );
};

const formatTime = (timeString?: string): string => {
  if (!timeString) return '-';
  try {
    const date = new Date(timeString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  } catch {
    return timeString;
  }
};

const AttendanceTableRow = ({
  record,
  isEditing,
  editStatus,
  editNotes,
  updating,
  onEdit,
  onCancel,
  onSave,
  onStatusChange,
  onNotesChange,
  onOpenLeaveRequest,
  isHomeroomTeacher,
}: AttendanceTableRowProps) => {
  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="font-medium">
        {record.students?.student_id || 'N/A'}
      </TableCell>
      <TableCell>
        <div className="font-medium">{record.students?.full_name || 'Không xác định'}</div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-blue-800 bg-blue-100">
          {record.students?.class_name || 'N/A'}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatTime(record.check_in_time)}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatTime(record.check_out_time)}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <Select value={editStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="present">Có mặt</SelectItem>
              <SelectItem value="absent">Vắng</SelectItem>
              <SelectItem value="late">Muộn</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          getStatusBadge(record.status)
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {record.confidence_score
          ? `${(record.confidence_score * 100 * 2).toFixed(1)}%`
          : '-'}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <Input
            type="text"
            value={editNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Nhập ghi chú..."
            className="h-8 text-xs"
          />
        ) : (
          <span className="truncate" title={record.notes || ''}>
            {record.notes || '-'}
          </span>
        )}
      </TableCell>
      <TableCell className="text-center">
        {isEditing ? (
          <div className="flex justify-center gap-2">
            <Button
              size="sm"
              onClick={onSave}
              disabled={updating}
              className="h-8 text-xs"
            >
              {updating ? '...' : 'Lưu'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onCancel}
              disabled={updating}
              className="h-8 text-xs"
            >
              Hủy
            </Button>
          </div>
        ) : (
          <div className="flex justify-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(record)}
              className="h-8 text-xs"
            >
              Sửa
            </Button>
            {isHomeroomTeacher && (
              <Button
                size="sm"
                variant={
                  record.leave_request_image
                    ? 'default'
                    : 'outline'
                }
                onClick={() => onOpenLeaveRequest?.(record)}
                className={`h-8 text-xs ${record.leave_request_image ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                title={
                  record.leave_request_image
                    ? 'Xem đơn xin nghỉ'
                    : 'Thêm đơn xin nghỉ'
                }
              >
                <FileText className="w-3 h-3 mr-1" />
                Đơn nghỉ
              </Button>
            )}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
};

export default AttendanceTableRow;
