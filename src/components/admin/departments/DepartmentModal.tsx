"use client";

import { useEffect, useState } from "react";
import { dirtyValuesChecker } from "@/lib/utils";
import { Department } from "@/lib/types/schemas";
import {
  validateDepartment,
  validationErrorsToObject,
} from "@/lib/utils/validation";
import { BaseModal } from "@/components/ui/modals";
import {
  FormField,
  SelectField,
  TextAreaField,
  SingleEmployeeSelector,
} from "@/components/forms";
import { ModalActionButtons } from "@/components/ui";
import { getCompanyInfo } from "@/lib/utils/auth";
import { Employee } from "@/lib/types/schemas";

interface DepartmentModalProps {
  isOpen: boolean;
  initialData?: Department | null;
  onSubmit: (values: Department) => void;
  onClose: () => void;
  isLoading?: boolean;
  employees?: Employee[];
  divisions: any[];
}

export default function DepartmentModal({
  isOpen,
  initialData,
  onSubmit,
  onClose,
  employees = [],
  divisions = [],
}: DepartmentModalProps) {
  const [formValues, setFormValues] = useState<Department>({
    id: initialData?.id,
    name: initialData?.name ?? "",
    head_id: initialData?.head_id ?? "",
    description: initialData?.description ?? "",
    division_id: initialData?.division_id ?? undefined,
  });

  const [errors, setErrors] = useState<Partial<Department>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isValid, setIsValid] = useState(false);

  const [hasDivision, setHasDivision] = useState<boolean>(false);

  const initHasDivision = async () => {
    const company = await getCompanyInfo();
    setHasDivision(company.has_division || false);
  };

  useEffect(() => {
    initHasDivision();
  }, []);

  useEffect(() => {
    const result = validateDepartment(formValues, hasDivision);
    if (result.success) {
      setIsValid(true);
      setErrors({});
    } else {
      setIsValid(false);
      const newErrors = validationErrorsToObject(result.errors);
      setErrors(newErrors);
    }
  }, [formValues, hasDivision]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    if (name === "division_id") {
      const numValue = Number(value);
      setFormValues((prev) => ({
        ...prev,
        [name]: value === "" || isNaN(numValue) ? undefined : numValue,
      }));
    } else {
      setFormValues((prev) => ({ ...prev, [name]: value }));
    }

    // mark the field as touched
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleHeadChange = (value: string) => {
    setFormValues((prev) => ({ ...prev, head_id: value }));
    setTouched((prev) => ({ ...prev, head_id: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = validateDepartment(formValues, hasDivision);
    if (!result.success) {
      const fieldErrors = validationErrorsToObject(result.errors);
      setErrors(fieldErrors);
      setTouched(
        Object.keys(fieldErrors).reduce(
          (acc, key) => ({ ...acc, [key]: true }),
          {} as Record<string, boolean>
        )
      );
      setIsSubmitting(false);
      return;
    }

    try {
      await onSubmit(formValues);
      onClose();
    } catch (error) {
      console.error("Error submitting department:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (initialData) {
      setIsDirty(dirtyValuesChecker(initialData, formValues));
    }
  }, [initialData, formValues]);

  const isDisabled =
    isSubmitting || (initialData ? !isDirty : false) || !isValid;

  const divisionOptions = divisions.map((division) => ({
    value: division.id.toString(),
    label: division.name,
  }));

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Department" : "Create Department"}
      size="sm"
      preventBackdropClose={isSubmitting}
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <FormField
          label="Department Name"
          name="name"
          value={formValues.name}
          onChange={handleChange}
          placeholder="Enter Department Name"
          error={touched.name ? (errors.name as string) : undefined}
          required
        />

        <SingleEmployeeSelector
          label="Department Head"
          value={formValues.head_id || ""}
          onChange={handleHeadChange}
          employees={employees}
          placeholder="Search and select department head..."
          error={touched.head_id && errors.head_id ? String(errors.head_id) : undefined}
          required
        />

        <TextAreaField
          label="Description"
          name="description"
          value={formValues.description}
          onChange={handleChange}
          placeholder="Enter department description"
          error={touched.description ? (errors.description as string) : undefined}
          rows={3}
        />

        {hasDivision && (
          <SelectField
            label="Division"
            name="division_id"
            value={formValues.division_id?.toString() ?? ""}
            onChange={handleChange}
            options={divisionOptions}
            placeholder="Select Division"
            error={
              touched.division_id && errors.division_id ? String(errors.division_id) : undefined
            }
            required
          />
        )}

        <ModalActionButtons
          onCancel={onClose}
          isSubmitting={isSubmitting}
          isDisabled={isDisabled}
          submitText={initialData ? "Update Department" : "Create Department"}
        />
      </form>
    </BaseModal>
  );
}
