import React, { useEffect } from 'react';
import { FormModal } from '@/components/ui/modals';
import { FormField, SelectField, NumberField, SingleEmployeeSelector } from '@/components/forms';
import { validateClaimType, type ClaimTypeData } from '@/lib/validation';
import { useEmployees } from '@/hooks/useEmployees';
import { usePositions } from '@/hooks/usePositions';
import { Receipt, UserPlus, CurrencyDollar } from "@phosphor-icons/react";

interface ClaimTypeUpdateModalProps {
  isOpen: boolean;
  initialData: ClaimTypeData;
  onSubmit: (data: ClaimTypeData) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export const ClaimTypeUpdateModal: React.FC<ClaimTypeUpdateModalProps> = ({
  isOpen,
  initialData,
  onSubmit,
  onClose,
  isLoading = false,
}) => {
  const { employees: allSettlers, loading: loadingEmployees, fetchEmployees } = useEmployees();
  const { positions: allPositions, fetchPositions } = usePositions();

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      fetchPositions();
    }
  }, [isOpen, fetchEmployees, fetchPositions]);

  if (!isOpen) return null;

  return (
    <FormModal<ClaimTypeData>
      title="Update Settlement Item"
      icon={<Receipt size={24} weight="duotone" className="text-foreground-secondary" />}
      initialValues={initialData}
      validationFn={validateClaimType}
      onSubmit={onSubmit}
      onClose={onClose}
      isOpen={isOpen}
      isLoading={isLoading}
      submitButtonText="Update Settlement Item"
      size="md"
    >
      {({ values, handleChange, errors, setFieldValue }) => (
        <>
          <FormField
            name="settlement_item"
            label="Settlement Item"
            value={values.settlement_item}
            onChange={handleChange}
            error={errors.settlement_item}
            required
            placeholder="Enter settlement item name"
            icon={<Receipt size={18} weight="duotone" className="text-foreground-tertiary" />}
          />

          <NumberField
            name="allowance"
            label="Allowance"
            value={values.allowance}
            onChange={handleChange}
            error={errors.allowance}
            required
            min={1}
            placeholder="Enter allowance amount"
            icon={<CurrencyDollar size={18} weight="duotone" className="text-foreground-tertiary" />}
          />

          <SingleEmployeeSelector
            label="Settler"
            value={values.settler_id || ''}
            onChange={(value) => setFieldValue('settler_id', value)}
            employees={allSettlers}
            placeholder="Search and select settler..."
            error={errors.settler_id}
            required
          />

          <SelectField
            name="settlement_level_id"
            label="Settlement Level (Optional)"
            value={values.settlement_level_id ? String(values.settlement_level_id) : ''}
            onChange={handleChange}
            error={errors.settlement_level_id}
            placeholder="Select Settlement Level"
            options={[
              { value: '', label: 'None' },
              ...allPositions.map(position => ({
                value: String(position.id),
                label: position.name
              }))
            ]}
          />
        </>
      )}
    </FormModal>
  );
};

export default ClaimTypeUpdateModal;
