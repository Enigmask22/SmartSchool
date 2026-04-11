import React from 'react';
import { CommonFormFields } from './CommonFormFields';

interface OtherTabsFormSectionProps {
  hook: any;
  form: any;
  isEdit?: boolean;
  item?: any;
}

export const OtherTabsFormSection: React.FC<OtherTabsFormSectionProps> = ({
  hook,
  form,
  isEdit = false,
  item = null,
}) => {
  return (
    <div className="space-y-4">
      {/* Common fields for all other tabs */}
      <CommonFormFields
        hook={hook}
        form={form}
        isEdit={isEdit}
        item={item}
        filteredFields={['score_column_config']}
      />
    </div>
  );
};
