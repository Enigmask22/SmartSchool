import React from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdminForm } from '@/hooks/admin-management/useAdminForm';
import { TeachersFormSection } from './form-sections/TeachersFormSection';
import { SubjectsFormSection } from './form-sections/SubjectsFormSection';
import { ClassSubjectsFormSection } from './form-sections/ClassSubjectsFormSection';
import { OtherTabsFormSection } from './form-sections/OtherTabsFormSection';

interface AdminManagementFormProps {
  hook: any;
  teacherSubjectHook?: any;
  scoreColumnHook?: any;
  classSelectionHook?: any;
  isEdit?: boolean;
  item?: any;
  onSubmit?: (formData: any) => void;
  onCancel?: () => void;
}

export const AdminManagementForm: React.FC<AdminManagementFormProps> = ({
  hook,
  teacherSubjectHook,
  scoreColumnHook,
  classSelectionHook,
  isEdit = false,
  item = null,
  onSubmit,
  onCancel,
}) => {
  const form = useAdminForm();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // For teachers tab, include selectedSubjects in the submission data
    let submitData = form.formData;
    if (hook.activeTab === 'teachers' && teacherSubjectHook) {
      submitData = {
        ...form.formData,
        _selectedSubjects: teacherSubjectHook.selectedSubjects,
      };
    }

    // For subjects tab, include score columns configuration
    if (hook.activeTab === 'subjects' && scoreColumnHook) {
      const scoreColumnConfig: Record<string, any> = {};
      scoreColumnHook.scoreColumns.forEach((col: any) => {
        scoreColumnConfig[col.key] = {
          label: col.label,
          he_so: col.he_so,
          data: col.data || null,
        };
      });
      submitData = {
        ...form.formData,
        score_column_config:
          Object.keys(scoreColumnConfig).length > 0
            ? scoreColumnConfig
            : null,
      };
    }

    // For class_subjects tab, include selected classes and recordIds for editing
    if (hook.activeTab === 'class_subjects' && classSelectionHook) {
      // Ensure all required fields are present (use item data as fallback)
      submitData = {
        subject_id: form.formData.subject_id ?? item?.subject_id,
        teacher_id: form.formData.teacher_id ?? item?.teacher_id,
        academic_year: form.formData.academic_year ?? item?.academic_year,
        semester: form.formData.semester ?? item?.semester,
        _selectedClasses: classSelectionHook.selectedClasses || [],
      };
      // For editing, also include recordIds so backend knows which records to update
      if (isEdit && item?.recordIds) {
        submitData._recordIds = item.recordIds;
      }
    }

    if (onSubmit) {
      onSubmit(submitData);
    } else if (isEdit) {
      hook.handleUpdate(item.id, submitData);
    } else {
      hook.handleCreate(submitData);
    }

    // Close form after submission
    form.resetForm();
    if (onCancel) onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Render tab-specific form sections */}
      {hook.activeTab === 'teachers' && (
        <TeachersFormSection
          hook={hook}
          form={form}
          teacherSubjectHook={teacherSubjectHook}
          isEdit={isEdit}
          item={item}
        />
      )}

      {hook.activeTab === 'subjects' && (
        <SubjectsFormSection
          hook={hook}
          form={form}
          scoreColumnHook={scoreColumnHook}
          isEdit={isEdit}
          item={item}
        />
      )}

      {hook.activeTab === 'class_subjects' && (
        <ClassSubjectsFormSection
          hook={hook}
          form={form}
          classSelectionHook={classSelectionHook}
          isEdit={isEdit}
          item={item}
        />
      )}

      {/* For any other tabs not specifically handled */}
      {hook.activeTab !== 'teachers' &&
        hook.activeTab !== 'subjects' &&
        hook.activeTab !== 'class_subjects' && (
          <OtherTabsFormSection
            hook={hook}
            form={form}
            isEdit={isEdit}
            item={item}
          />
        )}

      {/* Form submission buttons */}
      <div className="flex justify-end pt-6 mt-8 space-x-4 border-t border-border">
        <Button
          type="button"
          variant="outline"
          className="text-red-600 border-red-600 hover:text-red-700 hover:border-red-700 hover:bg-red-50"
          onClick={() => {
            form.resetForm();
            if (onCancel) onCancel();
          }}
        >
          <X className="w-4 h-4 mr-2" />
          Hủy
        </Button>
        <Button type="submit">
          <Save className="w-4 h-4 mr-2" />
          {isEdit ? 'Cập nhật' : 'Tạo mới'}
        </Button>
      </div>
    </form>
  );
}