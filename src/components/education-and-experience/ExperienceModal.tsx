"use client";

import { useEffect, useState } from "react";
import { dirtyValuesChecker } from "@/lib/utils";
import { Experience } from "@/lib/types/schemas";
import { validateExperience, validationErrorsToObject } from "@/lib/utils/validation";
import { FormModal, BaseModal } from "@/components/ui/modals";
import { FormField, TextAreaField } from "@/components/forms";
import { Button } from "@/components/ui/button";

interface ExperienceModalProps {
  isOpen: boolean;
  initialData?: Experience | null;
  onSubmit: (values: Experience) => void;
  onClose: () => void;
}

export default function ExperienceModal({
  isOpen,
  initialData,
  onSubmit,
  onClose,
}: ExperienceModalProps) {
  const [formValues, setFormValues] = useState<Experience>({
    company_name: "",
    designation: "",
    from_date: "",
    to_date: "",
    description: "",
    employee_id: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormValues(initialData);
    }
  }, [initialData]);

  const [errors, setErrors] = useState<Partial<Experience>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const result = validateExperience(formValues);
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
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormValues((prev: Experience) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = validateExperience(formValues);

    if (!result.success) {
      const fieldErrors = validationErrorsToObject(result.errors);
      setErrors(fieldErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      await onSubmit(result.data);
      setErrors({});
      onClose();
    } catch (error) {
      console.error("Error submitting experience:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (initialData) {
      setIsDirty(dirtyValuesChecker(initialData, formValues));
    }
  }, [initialData, formValues]);

  const isDisabled = isSubmitting || (initialData ? !isDirty : false) || !isValid;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Experience" : "Add Experience"}
      size="md"
      preventBackdropClose={isSubmitting}
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <FormField
          label="Company Name"
          name="company_name"
          value={formValues.company_name}
          onChange={handleChange}
          placeholder="Enter Company Name"
          error={errors.company_name}
          required
        />

        <FormField
          label="Designation"
          name="designation"
          value={formValues.designation}
          onChange={handleChange}
          placeholder="Enter Designation"
          error={errors.designation}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="From Date"
            type="date"
            name="from_date"
            value={formValues.from_date}
            onChange={handleChange}
            error={errors.from_date}
            required
          />

          <FormField
            label="To Date"
            type="date"
            name="to_date"
            value={formValues.to_date}
            onChange={handleChange}
            error={errors.to_date}
          />
        </div>

        <TextAreaField
          label="Description"
          name="description"
          value={formValues.description}
          onChange={handleChange}
          placeholder="Enter Experience Description"
          rows={4}
          error={errors.description}
        />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 sm:gap-4 pt-4 border-t border-border-primary">
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
            {isSubmitting ? "Saving..." : "Save Experience"}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}
