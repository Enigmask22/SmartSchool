import React from 'react';
import { Users, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { CommonFormFields } from './CommonFormFields';

interface ClassSubjectsFormSectionProps {
  hook: any;
  form: any;
  classSelectionHook?: any;
  isEdit?: boolean;
  item?: any;
}

const getFieldLabel = (field: string): string => {
  const labelMap: Record<string, string> = {
    subject_id: 'Môn học',
    teacher_id: 'Giáo viên',
    academic_year: 'Năm học',
    semester: 'Học kỳ',
  };
  return labelMap[field] || field.replace(/_/g, ' ');
};

const getFieldValue = (field: string, formData: any, item: any, hook: any): string => {
  // Always prefer item data for read-only display (item is the source of truth)
  const value = item?.[field] ?? formData[field];
  
  if (field === 'subject_id') {
    const subject = hook.subjects?.find((s: any) => s.id === value);
    return subject ? `${subject.subject_name} (${subject.subject_code})` : '-';
  }
  
  if (field === 'teacher_id') {
    const teacher = hook.teachers?.find((t: any) => t.id === value);
    return teacher ? `${teacher.full_name} (${teacher.teacher_code})` : '-';
  }
  
  if (field === 'academic_year' || field === 'semester') {
    return value || '-';
  }
  
  return String(value || '-');
};

export const ClassSubjectsFormSection: React.FC<ClassSubjectsFormSectionProps> = ({
  hook,
  form,
  classSelectionHook,
  isEdit = false,
  item = null,
}) => {
  // Filter teachers when subject is selected
  React.useEffect(() => {
    if (form.formData.subject_id && hook.subjectTeachersData?.length > 0) {
      // Get all teacher IDs that teach the selected subject
      const teacherIds = hook.subjectTeachersData
        .filter((st: any) => st.subject_id === form.formData.subject_id && st.is_active !== false)
        .map((st: any) => st.teacher_id);

      // Filter teachers list to only those who teach this subject
      const filtered = (hook.teachers || []).filter((t: any) => teacherIds.includes(t.id));
      
      hook.setFilteredTeachers(filtered);
    } else {
      // No subject selected, reset filtered teachers
      hook.setFilteredTeachers([]);
    }
  }, [form.formData.subject_id, hook.subjectTeachersData, hook.teachers, hook]);

  return (
    <div className="space-y-4">
      {/* When editing: Show locked fields as read-only */}
      {isEdit ? (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-gray-700">
            <Lock className="w-4 h-4" />
            Thông tin không thể thay đổi
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {getFieldLabel('subject_id')}
              </label>
              <div className="px-3 py-2 bg-white rounded border border-gray-200 text-sm text-gray-700">
                {getFieldValue('subject_id', form.formData, item, hook)}
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {getFieldLabel('teacher_id')}
              </label>
              <div className="px-3 py-2 bg-white rounded border border-gray-200 text-sm text-gray-700">
                {getFieldValue('teacher_id', form.formData, item, hook)}
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {getFieldLabel('academic_year')}
              </label>
              <div className="px-3 py-2 bg-white rounded border border-gray-200 text-sm text-gray-700">
                {getFieldValue('academic_year', form.formData, item, hook)}
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {getFieldLabel('semester')}
              </label>
              <div className="px-3 py-2 bg-white rounded border border-gray-200 text-sm text-gray-700">
                {getFieldValue('semester', form.formData, item, hook)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* When creating: Show editable fields via CommonFormFields */
        <CommonFormFields
          hook={hook}
          form={form}
          isEdit={isEdit}
          item={item}
          filteredFields={['score_column_config', 'class_id']}
        />
      )}

      {/* Multi-select lớp học */}
      {classSelectionHook && (
        <div className="pt-4 mt-4 border-t border-gray-200">
          <label className="block mb-3 text-sm font-semibold text-gray-800">
            <Users className="inline-block w-4 h-4 mr-1 mb-0.5" />
            Lớp học liên quan
            {isEdit && (
              <span className="ml-2 text-xs font-normal text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200 inline-block">
                ✏️ Có thể thay đổi
              </span>
            )}
          </label>
          <p className="mb-3 text-xs text-gray-600">
            {isEdit 
              ? 'Cập nhật các lớp học được gán cho giáo viên - môn học này' 
              : 'Chọn các lớp học được gán cho giáo viên - môn học này (có thể chọn nhiều lớp)'}
          </p>
          
          {/* Get academic year - prefer form data, fallback to item (for edit mode) */}
          {(() => {
            const academicYear = form.formData.academic_year || (isEdit && item?.academic_year);
            
            // Show info if academic year not selected
            if (!academicYear) {
              return (
                <div className="mb-3 p-3 bg-blue-50 rounded text-xs text-blue-700 border border-blue-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Vui lòng chọn năm học trước để xem danh sách lớp học
                </div>
              );
            }
            
            // Filter classes by selected academic year
            if (!hook.classes || hook.classes.length === 0) {
              return (
                <div className="p-3 text-sm text-gray-600 text-center bg-gray-50 rounded-md border border-gray-200">
                  Không có lớp học nào. Vui lòng tạo lớp học trước.
                </div>
              );
            }
            
            const filteredClasses = hook.classes.filter(
              (c: any) => c.academic_year === academicYear
            );
            
            if (filteredClasses.length === 0) {
              return (
                <div className="p-3 text-sm text-gray-600 text-center bg-gray-50 rounded-md border border-gray-200">
                  Không có lớp học nào cho năm học {academicYear}
                </div>
              );
            }
            
            return (
              <>
                <div className="mb-3 p-2 bg-gray-100 rounded text-xs text-gray-600">
                  Lớp năm học {academicYear}: {filteredClasses.length} lớp
                </div>
                <div className="grid grid-cols-2 gap-2 p-3 overflow-y-auto rounded-md bg-gray-50 max-h-60 md:grid-cols-3 lg:grid-cols-4">
                  {filteredClasses.map((cls: any) => (
                    <label
                      key={cls.id}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={classSelectionHook.selectedClasses?.includes(cls.id) || false}
                        onChange={() => {
                          classSelectionHook.setSelectedClasses((prev: any[]) =>
                            prev.includes(cls.id)
                              ? prev.filter((id) => id !== cls.id)
                              : [...prev, cls.id]
                          );
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 truncate">
                        {cls.class_name}
                      </span>
                    </label>
                  ))}
                </div>
                {classSelectionHook.selectedClasses?.length > 0 && (
                  <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Đã chọn {classSelectionHook.selectedClasses.length} lớp học
                  </p>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};
