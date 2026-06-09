import React from 'react';
import { createPortal } from 'react-dom';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch.jsx';
import { Settings2, Package, FileText, ChevronRight, ChevronDown } from 'lucide-react';

/** Radix Switch props — file `switch.jsx` không export type. */
const PermissionSwitch = Switch as React.ComponentType<{
  checked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  'aria-label'?: string;
}>;
import logger from '@/utils/logger';

// Portal Tooltip Component - renders outside table DOM
function PortalTooltip({ 
  children, 
  tooltipContent 
}: { 
  children: React.ReactNode
  tooltipContent: React.ReactNode
}) {
  const [showTooltip, setShowTooltip] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const triggerRef = React.useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 10, // Position above with gap
        left: rect.left + rect.width / 2, // Center horizontally
      });
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <>
      <div 
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-full"
      >
        {children}
      </div>
      
      {showTooltip && createPortal(
        <div 
          className="fixed z-[99999] pointer-events-none"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="bg-white border border-gray-300 rounded-lg shadow-xl p-4 whitespace-normal w-max max-w-sm">
            {tooltipContent}
            {/* Arrow pointing down */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-[7px]">
              <div className="border-8 border-transparent border-t-white border-t-8" />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// Score Config Portal Component - shows hierarchical config on hover
function ScoreConfigPortal({ 
  scoreConfig 
}: { 
  scoreConfig: Record<string, any>
}) {
  const [showPortal, setShowPortal] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const triggerRef = React.useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 10,
        left: rect.left + rect.width / 2,
      });
      setShowPortal(true);
    }
  };

  const handleMouseLeave = () => {
    setShowPortal(false);
  };

  return (
    <>
      <div 
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-full"
      >
        <Badge className="text-xs text-purple-700 bg-purple-50 border-purple-200 border whitespace-nowrap h-7 flex items-center justify-center gap-1 cursor-help hover:bg-purple-100 transition-colors">
          <Settings2 className="w-3 h-3" />
          {Object.keys(scoreConfig).length} cột
        </Badge>
      </div>

      {showPortal && createPortal(
        <div 
          className="fixed z-[99999] pointer-events-none"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-max max-w-md">
            {/* Header */}
            <div className="mb-3 pb-2 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-900">Cấu hình cột điểm</p>
            </div>

            {/* Content - no scroll, let it expand */}
            <div className="space-y-2">
              {Object.entries(scoreConfig).filter(([key]) => key !== "is_char").map(([key, value]: any) => {
                const isParent = value.data && Object.keys(value.data).length > 0;
                return (
                  <div key={key}>
                    {/* Parent Column */}
                    <div className="p-2 bg-gray-50 rounded border border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          {isParent ? (
                            <Package className="w-4 h-4 text-orange-600 flex-shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">{value.label}</p>
                            <p className="text-xs text-gray-600">{key} • HS: {value.he_so}</p>
                          </div>
                        </div>
                        {isParent && (
                          <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded flex-shrink-0">
                            {Object.keys(value.data).length}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Child Columns */}
                    {isParent && value.data && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-3">
                        {Object.entries(value.data).map(([childKey, childValue]: any) => (
                          <div key={childKey} className="py-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-800 truncate">{childValue.label}</p>
                                  <p className="text-xs text-gray-600">{childKey}</p>
                                </div>
                              </div>
                              <span className="text-xs text-gray-700 font-medium flex-shrink-0">HS: {childValue.he_so}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Arrow pointing down */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-[7px]">
              <div className="border-8 border-transparent border-t-white border-t-8" />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

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
    id: 'STT',
    username: 'USERNAME',
    full_name: 'HỌ TÊN',
    is_active: 'TRẠNG THÁI',
    subjects: 'MÔN HỌC PHỤ TRÁCH',
    classes: 'LỚP HỌC',
    subject_code: 'MÃ MÔN HỌC',
    subject_name: 'TÊN MÔN HỌC',
    description: 'MÔ TẢ',
    is_mandatory: 'NHÓM MÔN',
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
    can_edit_grade: 'SỬA BẢNG ĐIỂM',
    can_edit_attendance: 'SỬA ĐIỂM DANH',
  };
  return headerMap[field] || field.replace(/_/g, ' ').toUpperCase();
}

export function renderTableCell(
  field: string,
  item: any,
  hook: any,
  searchTerm: string = '',
  index?: number,
  currentPage: number = 1,
  pageSize: number = 10,
  sorting?: any,
  totalItems: number = 0
): React.ReactNode {
  // Safety check: ensure item exists
  if (!item) {
    return <span className="text-gray-400">-</span>;
  }

  // Handle id field - display as sequential number (STT)
  if (field === 'id') {
    if (index !== undefined) {
      let stt: number;
      
      // If sorting by 'id' field, reflect the sort order in STT
      if (sorting?.sortState.field === 'id') {
        if (sorting.sortState.direction === 'desc') {
          // For descending sort: show reverse order
          // Total items - current position + 1
          stt = totalItems - ((currentPage - 1) * pageSize + index);
        } else {
          // For ascending sort: show normal order
          stt = (currentPage - 1) * pageSize + index + 1;
        }
      } else {
        // Not sorting by id: always show sequential position
        stt = (currentPage - 1) * pageSize + index + 1;
      }
      
      return <span className="font-medium">{stt}</span>;
    }
    return <span className="text-gray-400">-</span>;
  }

  if (field === 'classes') {
    // This is used for class_subjects tab - display classes as badges with height limit and hover tooltip
    if (!item.class_names || !Array.isArray(item.class_names) || item.class_names.length === 0) {
      return <span className="text-xs italic text-gray-400">Chưa phân công lớp</span>;
    }

    const MAX_VISIBLE_CLASSES = 4;
    const visibleClasses = item.class_names.slice(0, MAX_VISIBLE_CLASSES);
    const hiddenCount = Math.max(0, item.class_names.length - MAX_VISIBLE_CLASSES);

    // Group classes by grade if available
    const classesByGrade: Record<string, string[]> = {};
    if (Array.isArray(item.class_ids) && hook?.classes) {
      item.class_ids.forEach((classId: number, idx: number) => {
        const classData = hook.classes.find((c: any) => c.id === classId);
        if (classData && item.class_names[idx]) {
          const grade = classData.grade || 'Không xác định';
          if (!classesByGrade[grade]) {
            classesByGrade[grade] = [];
          }
          classesByGrade[grade].push(item.class_names[idx]);
        }
      });
    }

    const content = (
      <div className="w-full flex flex-col gap-1 max-h-[150px] overflow-y-auto">
        {visibleClasses.map((className: string, idx: number) => (
          <Badge key={idx} className="text-xs text-blue-700 bg-blue-50 border-blue-200 border whitespace-nowrap min-w-[60px] h-7 flex items-center justify-center">
            {className}
          </Badge>
        ))}
        {hiddenCount > 0 && (
          <Badge className="text-xs text-orange-700 bg-orange-50 border-orange-200 border whitespace-nowrap h-7 flex items-center justify-center gap-1 cursor-default">
            <ChevronDown className="w-3 h-3" />
            +{hiddenCount} lớp
          </Badge>
        )}
      </div>
    );

    // If there are hidden classes, wrap with custom portal tooltip
    if (hiddenCount > 0) {
      const tooltipContent = (
        <>
          <p className="font-semibold text-gray-800 text-sm mb-3">Danh sách lớp học ({item.class_names.length})</p>
          <div className="space-y-3">
            {Object.keys(classesByGrade).sort().map((grade) => (
              <div key={grade}>
                <p className="text-xs font-semibold text-gray-600 mb-2">Khối {grade}:</p>
                <div className="flex flex-wrap gap-2 ml-2">
                  {classesByGrade[grade].map((className: string, idx: number) => (
                    <Badge key={idx} className="text-xs text-blue-700 bg-blue-50 border-blue-200 border whitespace-nowrap">
                      {className}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      );

      return (
        <PortalTooltip tooltipContent={tooltipContent}>
          {content}
        </PortalTooltip>
      );
    }

    // If all classes fit, just show them without tooltip
    return content;
  }

  if (field === 'subjects') {
    // This is only used for teachers tab
    // Debug logging to understand data structure
    // logger.debug('[renderTableCell] subjects field:', {
    //   teacherId: item.id,
    //   hook_teacherSubjects: hook?.teacherSubjects,
    //   hook_subjects: hook?.subjects?.length,
    // });

    if (!hook?.teacherSubjects || typeof hook.teacherSubjects !== 'object') {
      return <span className="text-xs italic text-gray-400">Chưa phân công</span>;
    }
    
    const teacherSubjectIds = hook.teacherSubjects[item.id] || [];
    if (!Array.isArray(teacherSubjectIds) || teacherSubjectIds.length === 0) {
      return <span className="text-xs italic text-gray-400">Chưa phân công</span>;
    }

    // Ensure hook.subjects exists and is an array
    if (!Array.isArray(hook.subjects)) {
      //logger.warn('[renderTableCell] hook.subjects is not an array:', hook.subjects);
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

  if (field === 'can_edit_grade' || field === 'can_edit_attendance') {
    // Admin: không cần ngoại lệ deadline cho cả hai quyền.
    // GV bộ môn: chỉ quản điểm môn — không cấp quyền ngoại lệ sửa điểm danh (cột điểm danh luôn không áp dụng).
    const isAdminUser = item.role === 'admin';
    const isTeacherAttendanceNotApplicable =
      item.role === 'teacher' && field === 'can_edit_attendance';
    const showNotApplicable = isAdminUser || isTeacherAttendanceNotApplicable;
    const notApplicableLabel = isAdminUser
      ? 'Không áp dụng'
      : isTeacherAttendanceNotApplicable
        ? 'Không áp dụng'
        : '';
    return (
      <div className="flex justify-center w-full">
        {showNotApplicable ? (
          <span className="text-xs text-muted-foreground italic">{notApplicableLabel}</span>
        ) : (
          <PermissionSwitch
            checked={!!item[field]}
            disabled={!hook?.toggleUserEditFlag}
            onCheckedChange={(checked) =>
              hook.toggleUserEditFlag(
                item.id,
                field as 'can_edit_grade' | 'can_edit_attendance',
                checked
              )
            }
            aria-label={
              field === 'can_edit_grade'
                ? 'Bật hoặc tắt quyền sửa bảng điểm'
                : 'Bật hoặc tắt quyền sửa điểm danh'
            }
          />
        )}
      </div>
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
    if (!item[field] || typeof item[field] !== 'object' || Object.keys(item[field]).length === 0) {
      return (
        <span className="block w-full text-center text-xs italic text-gray-400">Chưa cấu hình</span>
      );
    }

    return <ScoreConfigPortal scoreConfig={item[field]} />;
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
  
  const tooltipText = fullText || String(content);
  
  return (
    <div className="group relative w-full block">
      <span className={`block ${maxWidth} truncate cursor-help`}>
        {content}
      </span>
      
      {/* Inline white tooltip */}
      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-200 z-50 hidden group-hover:block">
        <div className="bg-white border border-gray-300 rounded-lg shadow-xl px-3 py-2 whitespace-normal w-max max-w-xs text-sm text-gray-800">
          {tooltipText}
          {/* Arrow pointing down */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-[7px]">
            <div className="border-6 border-transparent border-t-white border-t-6" />
          </div>
        </div>
      </div>
    </div>
  );
}