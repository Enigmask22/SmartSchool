import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import logger from '@/utils/logger';

// Helper function to highlight search term in text
export function highlightText(text: string, searchTerm: string): React.ReactNode {
  if (!searchTerm || !text) {
    return text;
  }

  const searchLower = searchTerm.toLowerCase();
  const textLower = String(text).toLowerCase();
  
  if (!textLower.includes(searchLower)) {
    return text;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let currentIndex = 0;

  while ((currentIndex = textLower.indexOf(searchLower, lastIndex)) !== -1) {
    if (currentIndex > lastIndex) {
      parts.push(String(text).substring(lastIndex, currentIndex));
    }
    parts.push(
      <span key={`${currentIndex}-highlight`} className="bg-yellow-200">
        {String(text).substring(currentIndex, currentIndex + searchLower.length)}
      </span>
    );
    lastIndex = currentIndex + searchLower.length;
  }

  if (lastIndex < text.length) {
    parts.push(String(text).substring(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

export function renderFieldHeader(field: string): string {
  const headerMap: Record<string, string> = {
    username: 'USERNAME',
    full_name: 'HỌ TÊN',
    is_active: 'TRẠNG THÁI',
    subjects: 'MÔN HỌC PHỤ TRÁCH',
    classes: 'LỚP HỌC',
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
    phone: 'SĐT',
    score_column_config: 'CẤU HÌNH CỘT ĐIỂM',
    teacher_code: 'MÃ SỐ GIÁO VIÊN',
  };
  return headerMap[field] || field.replace(/_/g, ' ').toUpperCase();
}

export function renderTableCell(field: string, item: any, hook: any, searchTerm: string = ''): React.ReactNode {
  // Safety check: ensure item exists
  if (!item) {
    return <span className="text-gray-400">-</span>;
  }

  if (field === 'classes') {
    // This is used for class_subjects tab - display classes as badges
    if (!item.class_names || !Array.isArray(item.class_names) || item.class_names.length === 0) {
      return <span className="text-xs italic text-gray-400">Chưa phân công lớp</span>;
    }

    return (
      <div className="flex flex-col gap-1">
        {item.class_names.map((className: string, idx: number) => (
          <Badge key={idx} className="text-xs text-blue-700 bg-blue-50 border-blue-200 border whitespace-nowrap min-w-[60px] h-7 flex items-center justify-center">
            {className}
          </Badge>
        ))}
      </div>
    );
  }

  if (field === 'subjects') {
    // This is only used for teachers tab
    // Debug logging to understand data structure
    logger.debug('[renderTableCell] subjects field:', {
      teacherId: item.id,
      hook_teacherSubjects: hook?.teacherSubjects,
      hook_subjects: hook?.subjects?.length,
    });

    if (!hook?.teacherSubjects || typeof hook.teacherSubjects !== 'object') {
      return <span className="text-xs italic text-gray-400">Chưa phân công</span>;
    }
    
    const teacherSubjectIds = hook.teacherSubjects[item.id] || [];
    if (!Array.isArray(teacherSubjectIds) || teacherSubjectIds.length === 0) {
      return <span className="text-xs italic text-gray-400">Chưa phân công</span>;
    }

    // Ensure hook.subjects exists and is an array
    if (!Array.isArray(hook.subjects)) {
      logger.warn('[renderTableCell] hook.subjects is not an array:', hook.subjects);
      return <span className="text-xs italic text-gray-400">Dữ liệu môn học chưa tải</span>;
    }

    return (
      <div className="flex flex-col gap-1">
        {teacherSubjectIds.map((subjectId: any) => {
          const subject = hook.subjects.find((s: any) => s.id === subjectId);
          if (!subject) {
            logger.warn(`[renderTableCell] Subject ID ${subjectId} not found in subjects array`);
            return null;
          }
          return (
            <Badge key={subjectId} className="text-xs text-blue-700 bg-blue-50 border-blue-200 border whitespace-nowrap min-w-[70px] h-7 flex items-center justify-center">
              {subject.subject_code || '-'}
            </Badge>
          );
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
        className={`text-xs whitespace-nowrap min-w-[60px] h-7 flex items-center justify-center border ${
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
      <Badge className="text-xs text-purple-800 bg-purple-100 border-purple-200 border whitespace-nowrap min-w-[70px] h-7 flex items-center justify-center">
        Bắt buộc
      </Badge>
    ) : (
      <Badge className="text-xs text-gray-800 bg-gray-100 border-gray-200 border whitespace-nowrap min-w-[70px] h-7 flex items-center justify-center">
        Tự chọn
      </Badge>
    );
  }

  if (typeof item[field] === 'boolean') {
    return item[field] ? (
      <Badge className="bg-green-100 text-green-800 border-green-200 border whitespace-nowrap min-w-[50px] h-7 flex items-center justify-center text-xs">
        Có
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 border-red-200 border whitespace-nowrap min-w-[50px] h-7 flex items-center justify-center text-xs">
        Không
      </Badge>
    );
  }

  if (field === 'role') {
    const roleMap: Record<string, string> = {
      admin: 'Quản trị viên',
      homeroom_teacher: 'GVCN',
      teacher: 'Giáo viên',
    };
    return (
      <Badge
        className={`text-xs whitespace-nowrap min-w-[85px] h-7 flex items-center justify-center border ${
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
      <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
        {Object.entries(item[field]).map(([key, value]: any) => (
          <Badge key={key} className="text-xs text-purple-700 bg-purple-50 border-purple-200 border whitespace-nowrap flex-shrink-0 h-7 flex items-center justify-center">
            {value.label} (HS: {value.he_so})
          </Badge>
        ))}
      </div>
    ) : (
      <span className="text-xs italic text-gray-400">Chưa cấu hình</span>
    );
  }

  // For text fields that might be long (email, username, descriptions, etc.)
  const longTextFields = ['email', 'username', 'full_name', 'description', 'teacher_code', 'subject_name', 'class_name', 'phone'];
  if (longTextFields.includes(field) && item[field]) {
    const highlighted = highlightText(String(item[field]), searchTerm);
    return renderTruncatedCell(highlighted, 'max-w-[150px]', String(item[field]));
  }

  return item[field] ? highlightText(String(item[field]), searchTerm) : '-';
}

// Helper function to truncate long text with styled tooltip
export function renderTruncatedCell(content: React.ReactNode, maxWidth: string = 'max-w-[180px]', fullText: string = ''): React.ReactNode {
  if (!content || content === '-') return '-';
  
  return (
    <Tooltip content={fullText || String(content)} side="top">
      <span className={`block ${maxWidth} truncate cursor-help`}>
        {content}
      </span>
    </Tooltip>
  );
}