"use client";

import { useState, useEffect, ReactNode } from "react";
import BaseModal from "./BaseModal";
import { Button } from "@/components/ui/button";
import { validationErrorsToObject } from "@/lib/utils/validation";

interface FormModalProps<T> {
  title: string;
  icon?: ReactNode;
  initialValues: T;
  validationFn: (values: T) => { success: boolean; data?: T; errors?: any[] };
  onSubmit: (values: T) => void;
  onClose: () => void;
  isOpen: boolean;
  isLoading?: boolean;
  submitButtonText?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: ReactNode | ((props: {
    values: T;
    errors: Record<string, string>;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    setFieldValue: (field: keyof T, value: T[keyof T]) => void;
  }) => ReactNode);
}

export default function FormModal<T extends Record<string, any>>({
  title,
  icon,
  initialValues,
  validationFn,
  onSubmit,
  onClose,
  isOpen,
  isLoading = false,
  submitButtonText = "Submit",
  size = "md",
  children,
}: FormModalProps<T>) {
  const [formValues, setFormValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const result = validationFn(formValues);
    if (result.success) {
      setIsValid(true);
      setErrors({});
    } else {
      setIsValid(false);
      if (result.errors) {
        const newErrors = validationErrorsToObject(result.errors);
        setErrors(newErrors);
      }
    }
  }, [formValues, validationFn]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormValues((prev) => {
      // Handle number inputs
      if (type === 'number') {
        return {
          ...prev,
          [name]: value === '' ? undefined : Number(value),
        };
      }
      
      // Handle select fields that should be numbers (like department_id, grade)
      // Convert to number if the field ends with _id or is named 'grade'
      if ((name.endsWith('_id') || name === 'grade')) {
        const numValue = Number(value);
        return {
          ...prev,
          [name]: value === '' || isNaN(numValue) ? undefined : numValue,
        };
      }
      
      // Default string handling
      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const setFieldValue = (field: keyof T, value: T[keyof T]) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = validationFn(formValues);

    if (!result.success) {
      if (result.errors) {
        const fieldErrors = validationErrorsToObject(result.errors);
        setErrors(fieldErrors);
      }
      setIsSubmitting(false);
      return;
    }

    setErrors({});
    try {
      await onSubmit(result.data!);
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={icon}
      size={size}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {typeof children === 'function' 
            ? children({ values: formValues, errors, handleChange, setFieldValue })
            : children
          }
        </div>
        
        <div className="flex justify-end mt-8 gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={!!(isLoading || isSubmitting)}
            disabled={
              isLoading ||
              isSubmitting ||
              !isValid
            }
          >
            {submitButtonText}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}
