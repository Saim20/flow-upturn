"use client";

import { useEffect, useState } from "react";
import { Grade } from "@/lib/types/schemas";
import { validateGrade, validationErrorsToObject } from "@/lib/utils/validation";
import { dirtyValuesChecker } from "@/lib/utils";
import { BaseModal } from "@/components/ui/modals";
import { FormField } from "@/components/forms";
import { Button } from "@/components/ui/button";

type FormValues = Grade;

interface GradeModalProps {
  isOpen: boolean;
  initialData?: Grade | null;
  onSubmit: (values: FormValues) => void;
  onClose: () => void;
}

export default function GradeModal({
  isOpen,
  initialData,
  onSubmit,
  onClose,
}: GradeModalProps) {
  const [formValues, setFormValues] = useState<FormValues>({
    id: initialData?.id,
    name: initialData?.name ?? "",
  });
  const [errors, setErrors] = useState<Partial<FormValues>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const result = validateGrade(formValues);
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
    const result = validateGrade(formValues);

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
      console.error("Error submitting grade:", error);
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
      title={initialData ? "Edit Grade" : "Create Grade"}
      size="sm"
      preventBackdropClose={isSubmitting}
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <FormField
          label="Grade Name"
          name="name"
          value={formValues.name}
          onChange={handleChange}
          placeholder="Enter Grade Name"
          error={errors.name as string}
          required
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
            {isSubmitting ? "Saving..." : (initialData ? "Update Grade" : "Create Grade")}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}
