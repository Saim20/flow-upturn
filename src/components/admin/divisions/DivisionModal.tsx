"use client";

import { useEffect, useState } from "react";
import { dirtyValuesChecker } from "@/lib/utils";
import { Division } from "@/lib/types/schemas";
import { validateDivision, validationErrorsToObject } from "@/lib/utils/validation";
import { BaseModal } from "@/components/ui/modals";
import { FormField, SingleEmployeeSelector } from "@/components/forms";
import { ModalActionButtons } from "@/components/ui";
import { Employee } from "@/lib/types/schemas";

interface DivisionModalProps {
  isOpen: boolean;
  initialData?: Division | null;
  onSubmit: (values: Division) => void;
  onClose: () => void;
  employees: Employee[];
}

export default function DivisionModal({
  isOpen,
  initialData,
  onSubmit,
  onClose,
  employees,
}: DivisionModalProps) {
  const [formValues, setFormValues] = useState<Division>({
    id: initialData?.id,
    name: initialData?.name ?? "",
    head_id: initialData?.head_id ?? "",
  });

  const [errors, setErrors] = useState<Partial<Division>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const result = validateDivision(formValues);
    if (result.success) {
      setIsValid(true);
      setErrors({});
    } else {
      setIsValid(false);
      const newErrors = validationErrorsToObject(result.errors);
      setErrors(newErrors);
    }
  }, [formValues]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleHeadChange = (value: string) => {
    setFormValues((prev) => ({ ...prev, head_id: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = validateDivision(formValues);

    if (!result.success) {
      const fieldErrors = validationErrorsToObject(result.errors);
      setErrors(fieldErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      await onSubmit(formValues);
      onClose();
    } catch (error) {
      console.error("Error submitting division:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (initialData) {
      setIsDirty(dirtyValuesChecker(initialData, formValues));
    }
  }, [initialData, formValues]);

  const isDisabled = isSubmitting || 
                    (initialData ? !isDirty : false) || 
                    !isValid;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Division" : "Create Division"}
      size="sm"
      preventBackdropClose={isSubmitting}
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <FormField
          label="Division Name"
          name="name"
          value={formValues.name}
          onChange={handleChange}
          placeholder="Enter Division Name"
          error={errors.name as string}
          required
        />

        <SingleEmployeeSelector
          label="Division Head"
          value={formValues.head_id || ""}
          onChange={handleHeadChange}
          employees={employees}
          placeholder="Search and select division head..."
          error={errors.head_id ? String(errors.head_id) : undefined}
        />

        <ModalActionButtons
          onCancel={onClose}
          isSubmitting={isSubmitting}
          isDisabled={isDisabled}
          submitText={initialData ? "Update Division" : "Create Division"}
        />
      </form>
    </BaseModal>
  );
}
