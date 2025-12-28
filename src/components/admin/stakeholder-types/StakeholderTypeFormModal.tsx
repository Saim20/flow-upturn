"use client";

import { StakeholderTypeFormData } from "@/hooks/useStakeholderTypes";
import { validateStakeholderType } from "@/lib/validation/schemas/stakeholders";
import { Tag } from "@phosphor-icons/react";
import { FormModal } from "@/components/ui/modals";
import { FormField, TextAreaField, ToggleField } from "@/components/forms";

interface StakeholderTypeFormModalProps {
  type: any;
  onClose: () => void;
  onSubmit: (data: StakeholderTypeFormData) => void;
  isOpen: boolean;
  isLoading: boolean;
}

export default function StakeholderTypeFormModal({
  type,
  onClose,
  onSubmit,
  isOpen,
  isLoading,
}: StakeholderTypeFormModalProps) {
  const initialValues: StakeholderTypeFormData = {
    name: type?.name || "",
    description: type?.description || "",
    is_active: type?.is_active !== undefined ? type.is_active : true,
  };

  return (
    <FormModal<StakeholderTypeFormData>
      title={type ? "Edit Stakeholder Type" : "Add Stakeholder Type"}
      icon={<Tag size={24} weight="duotone" />}
      initialValues={initialValues}
      validationFn={validateStakeholderType}
      onSubmit={onSubmit}
      onClose={onClose}
      isOpen={isOpen}
      isLoading={isLoading}
      submitButtonText={type ? "Update Type" : "Create Type"}
    >
      {({ values, errors, handleChange }) => (
        <div className="space-y-4">
          <FormField
            name="name"
            label="Type Name"
            icon={<Tag size={18} weight="duotone" />}
            placeholder="e.g., Client, Vendor, Partner"
            value={values.name}
            error={errors.name}
            onChange={handleChange}
            required
          />

          <TextAreaField
            name="description"
            label="Description"
            value={values.description || ""}
            onChange={handleChange}
            error={errors.description}
            rows={3}
            placeholder="Optional description of this stakeholder type"
          />

          <ToggleField
            label="Active"
            checked={values.is_active}
            onChange={(checked) =>
              handleChange({
                target: { name: "is_active", value: checked },
              } as any)
            }
          />
        </div>
      )}
    </FormModal>
  );
}
