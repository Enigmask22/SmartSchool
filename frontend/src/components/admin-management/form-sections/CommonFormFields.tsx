import React from 'react';
import { FormFieldRenderer } from './FormFieldRenderer';

interface CommonFormFieldsProps {
  hook: any;
  form: any;
  isEdit?: boolean;
  item?: any;
  filteredFields?: string[];
}

export const CommonFormFields: React.FC<CommonFormFieldsProps> = ({
  hook,
  form,
  isEdit = false,
  item = null,
  filteredFields = [],
}) => {
  // Get list of common fields that should appear in all tabs
  const commonFields = (hook.currentConfig?.fields || []).filter(
    (field: string) => !filteredFields.includes(field)
  );

  return (
    <>
      {commonFields.map((field: string) => (
        <FormFieldRenderer
          key={field}
          field={field}
          formData={form.formData}
          item={item}
          isEdit={isEdit}
          onChangeHandler={form.handleChange}
          activeTab={hook.activeTab}
          showPassword={form.showPassword}
          onTogglePassword={() => form.setShowPassword(!form.showPassword)}
          onGeneratePassword={form.handleGeneratePassword}
          teachers={hook.teachers}
          subjects={hook.subjects}
          classes={hook.classes}
          users={hook.users}
          homeroomTeachers={hook.homeroomTeachers}
          filteredTeachers={hook.filteredTeachers}
          academicYears={hook.academicYears}
        />
      ))}
    </>
  );
};
