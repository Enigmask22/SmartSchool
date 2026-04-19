import React from 'react';
import { BookOpen } from 'lucide-react';
import { CommonFormFields } from './CommonFormFields';

interface TeachersFormSectionProps {
  hook: any;
  form: any;
  teacherSubjectHook: any;
  isEdit?: boolean;
  item?: any;
}

export const TeachersFormSection: React.FC<TeachersFormSectionProps> = ({
  hook,
  form,
  teacherSubjectHook,
  isEdit = false,
  item = null,
}) => {
  return (
    <div className="space-y-4">
      {/* Common fields for teachers tab */}
      <CommonFormFields
        hook={hook}
        form={form}
        isEdit={isEdit}
        item={item}
        filteredFields={['score_column_config']}
      />

      {/* Multi-select môn học */}
      {teacherSubjectHook && (
        <div className="pt-4 mt-4 border-t border-gray-200">
          <label className="block mb-3 text-sm font-semibold text-gray-800">
            <BookOpen className="inline-block w-4 h-4 mr-1 mb-0.5" />
            Môn học phụ trách
          </label>
          <p className="mb-3 text-xs text-gray-600">
            Chọn các môn học mà giáo viên này sẽ giảng dạy (có thể chọn nhiều môn)
          </p>
          <div className="grid grid-cols-2 gap-2 p-3 overflow-y-auto rounded-md bg-gray-50 max-h-80">
            {hook.subjects.map((subject: any) => (
              <label key={subject.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded overflow-hidden">
                <input
                  type="checkbox"
                  checked={teacherSubjectHook.selectedSubjects.includes(subject.id)}
                  onChange={() => {
                    teacherSubjectHook.setSelectedSubjects((prev: any[]) =>
                      prev.includes(subject.id)
                        ? prev.filter((id) => id !== subject.id)
                        : [...prev, subject.id]
                    );
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
                />
                <span className="text-sm text-gray-700 truncate">{subject.subject_name}</span>
              </label>
            ))}
          </div>
          {teacherSubjectHook.selectedSubjects.length > 0 && (
            <p className="mt-2 text-xs text-green-600">
              ✓ Đã chọn {teacherSubjectHook.selectedSubjects.length} môn học
            </p>
          )}
        </div>
      )}
    </div>
  );
};
