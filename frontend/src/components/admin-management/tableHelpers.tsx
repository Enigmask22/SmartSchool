import React from 'react';
import { Badge } from '@/components/ui/badge';

export function renderFieldHeader(field: string): string {
  const headerMap: Record<string, string> = {
    username: 'USERNAME',
    full_name: 'HỌ TÊN',
    is_active: 'TRẠNG THÁI',
    subjects: 'MÔN HỌC PHỤ TRÁCH',
    subject_code: 'MÃ MÔN HỌC',
    subject_name: 'TÊN MÔN HỌC',
    description: 'MÔ TẢ',
    is_mandatory: 'BẮT BUỘC',
    class_name: 'TÊN LỚP',
    grade: 'KHỐI',
    homeroom_teacher: 'GIÁO VIÊN CHỦ NHIỆM',
    room_number: 'SỐ PHÒNG',
    academic_year: 'NĂM HỌC',
    total_students: 'TỔNG SỐ HỌC SINH',
    teacher_name: 'TÊN GIÁO VIÊN',
    semester: 'HỌC KỲ',
    date_of_birth: 'NGÀY SINH',
    gender: 'GIỚI TÍNH',
    phone: 'SDT',
    score_column_config: 'CẤU HÌNH CỘT ĐIỂM',
  };
  return headerMap[field] || field.replace(/_/g, ' ').toUpperCase();
}

export function renderTableCell(field: string, item: any, hook: any): React.ReactNode {
  // Safety check: ensure item exists
  if (!item) {
    return <span className="text-gray-400">-</span>;
  }

  if (field === 'subjects') {
    // This is only used for teachers tab
    if (!hook?.teacherSubjects) {
      return <span className="text-xs italic text-gray-400">Chưa phân công</span>;
    }
    
    const teacherSubjectIds = hook.teacherSubjects[item.id] || [];
    if (teacherSubjectIds.length === 0) {
      return <span className="text-xs italic text-gray-400">Chưa phân công</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {teacherSubjectIds.map((subjectId: any) => {
          const subject = hook.subjects?.find((s: any) => s.id === subjectId);
          return subject ? (
            <Badge key={subjectId} variant="outline" className="text-xs text-blue-700 border-blue-200 bg-blue-50">
              {subject.subject_code || '-'}
            </Badge>
          ) : null;
        })}
      </div>
    );
  }

  if (field === 'date_of_birth') {
    return item[field] && item[field] !== '-'
      ? new Date(item[field]).toLocaleDateString('vi-VN')
      : <span className="text-gray-400">-</span>;
  }

  if (field === 'gender') {
    return item[field] && item[field] !== '-' ? (
      <Badge
        variant="outline"
        className={`text-xs ${
          item[field] === 'Nam'
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : item[field] === 'Nữ'
            ? 'bg-pink-50 text-pink-700 border-pink-200'
            : 'bg-gray-50 text-gray-700 border-gray-200'
        }`}
      >
        {item[field]}
      </Badge>
    ) : (
      <span className="text-gray-400">-</span>
    );
  }

  if (field === 'is_mandatory') {
    return item[field] ? (
      <Badge variant="outline" className="text-xs text-purple-800 bg-purple-100 border-purple-200">
        Môn chính
      </Badge>
    ) : (
      <Badge variant="outline" className="text-xs text-gray-800 bg-gray-100 border-gray-200">
        Môn tự chọn
      </Badge>
    );
  }

  if (typeof item[field] === 'boolean') {
    return item[field] ? (
      <Badge className="bg-green-100 text-green-800">Có</Badge>
    ) : (
      <Badge variant="destructive">Không</Badge>
    );
  }

  if (field === 'role') {
    const roleMap: Record<string, string> = {
      admin: 'Quản trị viên',
      homeroom_teacher: 'Giáo viên chủ nhiệm',
      teacher: 'Giáo viên',
    };
    return (
      <Badge
        variant="outline"
        className={`text-xs ${
          item[field] === 'admin'
            ? 'bg-purple-50 text-purple-700 border-purple-200'
            : item[field] === 'homeroom_teacher'
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : 'bg-green-50 text-green-700 border-green-200'
        }`}
      >
        {roleMap[item[field]] || item[field]}
      </Badge>
    );
  }

  if (field === 'score_column_config') {
    return item[field] && typeof item[field] === 'object' ? (
      <div className="flex flex-wrap gap-1">
        {Object.entries(item[field]).map(([key, value]: any) => (
          <Badge key={key} variant="outline" className="text-xs text-purple-700 border-purple-200 bg-purple-50">
            {value.label} (HS: {value.he_so})
          </Badge>
        ))}
      </div>
    ) : (
      <span className="text-xs italic text-gray-400">Chưa cấu hình</span>
    );
  }

  return item[field] ?? '-';
}