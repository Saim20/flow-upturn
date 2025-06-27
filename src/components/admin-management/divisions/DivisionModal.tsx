"use client";

import { useEffect, useState } from "react";
import { dirtyValuesChecker } from "@/lib/utils";
import { Division } from "@/lib/types/schemas";
import { validateDivision, validationErrorsToObject } from "@/lib/utils/validation";
import { BaseModal } from "@/components/ui/modals";
import { FormField, SelectField } from "@/components/forms";
import { Button } from "@/components/ui/button";

interface DivisionModalProps {
  isOpen: boolean;
  initialData?: Division | null;
  onSubmit: (values: Division) => void;
  onClose: () => void;
  employees: { id: string; name: string }[];
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

  // Prepare options for employee select
  const employeeOptions = [
    { value: "", label: "Select Employee" },
    ...employees.map(employee => ({
      value: employee.id,
      label: employee.name
    }))
  ];

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

        <SelectField
          label="Division Head"
          name="head_id"
          value={formValues.head_id}
          onChange={handleChange}
          options={employeeOptions}
          placeholder="Select Employee"
          error={errors.head_id as string}
        />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 sm:gap-4 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          
          <Button
            type="submit"
            variant="primary"
            disabled={isDisabled}
            isLoading={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? "Saving..." : (initialData ? "Update Division" : "Create Division")}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}
