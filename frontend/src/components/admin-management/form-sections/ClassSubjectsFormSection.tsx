import React from 'react';
import { Users, AlertCircle, CheckCircle } from 'lucide-react';
import { CommonFormFields } from './CommonFormFields';

interface ClassSubjectsFormSectionProps {
  hook: any;
  form: any;
  classSelectionHook?: any;
  isEdit?: boolean;
  item?: any;
}

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
      {/* Common fields for class_subjects tab */}
      <CommonFormFields
        hook={hook}
        form={form}
        isEdit={isEdit}
        item={item}
        filteredFields={['score_column_config', 'class_id']}
      />

      {/* Multi-select lớp học */}
      {classSelectionHook && (
        <div className="pt-4 mt-4 border-t border-gray-200">
          <label className="block mb-3 text-sm font-semibold text-gray-800">
            <Users className="inline-block w-4 h-4 mr-1 mb-0.5" />
            Lớp học liên quan
          </label>
          <p className="mb-3 text-xs text-gray-600">
            Chọn các lớp học được gán cho giáo viên - môn học này (có thể chọn nhiều lớp)
          </p>
          
          {/* Show info if academic year not selected */}
          {!form.formData.academic_year && (
            <div className="mb-3 p-3 bg-blue-50 rounded text-xs text-blue-700 border border-blue-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Vui lòng chọn năm học trước để xem danh sách lớp học
            </div>
          )}
          
          {/* Filter classes by selected academic year */}
          {form.formData.academic_year && hook.classes && hook.classes.length > 0 && (
            <>
              {(() => {
                const filteredClasses = hook.classes.filter(
                  (c: any) => c.academic_year === form.formData.academic_year
                );
                return filteredClasses.length > 0 ? (
                  <>
                    <div className="mb-3 p-2 bg-gray-100 rounded text-xs text-gray-600">
                      Lớp năm học {form.formData.academic_year}: {filteredClasses.length} lớp
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
                ) : (
                  <div className="p-3 text-sm text-gray-600 text-center bg-gray-50 rounded-md border border-gray-200">
                    Không có lớp học nào cho năm học {form.formData.academic_year}
                  </div>
                );
              })()}
            </>
          )}

          {!form.formData.academic_year && (!hook.classes || hook.classes.length === 0) && (
            <div className="p-3 text-sm text-gray-600 text-center bg-gray-50 rounded-md border border-gray-200">
              Không có lớp học nào. Vui lòng tạo lớp học trước.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
