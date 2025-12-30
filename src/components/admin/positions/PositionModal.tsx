"use client";

import { Position } from "@/lib/types/schemas";
import { validatePosition } from "@/lib/utils/validation";
import { FormModal } from "@/components/ui/modals";
import { FormField, SelectField, TextAreaField } from "@/components/forms";
import { Briefcase } from "@phosphor-icons/react";

interface PositionModalProps {
  initialData?: Position | null;
  onSubmit: (values: Position) => void;
  onClose: () => void;
  isOpen: boolean;
  departments: { id: number; name: string }[];
  grades: { id: number; name: string }[];
  isLoading?: boolean;
}

export default function PositionModal({
  initialData,
  onSubmit,
  departments,
  grades,
  onClose,
  isOpen,
  isLoading = false,
}: PositionModalProps) {
  const initialValues: Position = initialData || {
    name: "",
    description: "",
    department_id: undefined,
    grade: undefined,
  };

  // Prepare options for select fields
  const departmentOptions = [
    { value: "", label: "Select Department" },
    ...departments.map(dept => ({
      value: dept.id.toString(),
      label: dept.name
    }))
  ];

  const gradeOptions = [
    { value: "", label: "Select Grade" },
    ...grades.map(grade => ({
      value: grade.id.toString(),
      label: grade.name
    }))
  ];

  return (
    <FormModal<Position>
      title={initialData ? "Edit Position" : "Create Position"}
      icon={<Briefcase size={24} weight="duotone" />}
      initialValues={initialValues}
      validationFn={validatePosition}
      onSubmit={onSubmit}
      onClose={onClose}
      isOpen={isOpen}
      isLoading={isLoading}
      submitButtonText={initialData ? "Update Position" : "Create Position"}
      size="md"
    >
      {({ values, errors, handleChange }) => (
        <>
          <FormField
            label="Position Name"
            name="name"
            icon={<Briefcase size={18} weight="duotone" />}
            value={values.name}
            onChange={handleChange}
            placeholder="Enter Position Name"
            error={errors.name}
            required
          />

          <SelectField
            label="Department"
            name="department_id"
            value={values.department_id?.toString() || ""}
            onChange={handleChange}
            options={departmentOptions}
            error={errors.department_id}
            required
          />

          <SelectField
            label="Grade"
            name="grade"
            value={values.grade?.toString() || ""}
            onChange={handleChange}
            options={gradeOptions}
            error={errors.grade}
            required
          />

          <TextAreaField
            label="Description"
            name="description"
            value={values.description || ""}
            onChange={handleChange}
            placeholder="Enter Position Description (Optional)"
            rows={3}
            error={errors.description}
          />
        </>
      )}
    </FormModal>
  );
}
