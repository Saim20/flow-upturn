"use client";

import { useEffect, useState } from "react";
import { dirtyValuesChecker } from "@/lib/utils";
import { schoolingTypes } from "@/lib/types";
import { validateSchooling, validationErrorsToObject } from "@/lib/utils/validation";
import { useFileUpload } from "@/hooks/useFileUpload";
import { FormModal, BaseModal } from "@/components/ui/modals";
import { FormField, SelectField, FileUploadField } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Education } from "@/hooks/useProfile";

interface EducationModalProps {
  isOpen: boolean;
  initialData?: Education | null;
  onSubmit: (values: Education) => void;
  onClose: () => void;
}

export default function EducationModal({
  isOpen,
  initialData,
  onSubmit,
  onClose,
}: EducationModalProps) {
  const [formValues, setFormValues] = useState<Education>({
    type: "High School",
    name: "",
    institute: "",
    from_date: "",
    to_date: "",
    result: "",
    attachments: [],
    employee_id: "",
  });
  
  const { uploading, uploadFiles } = useFileUpload();

  useEffect(() => {
    if (initialData) {
      setFormValues(initialData);
      setExistingAttachments(initialData.attachments || []);
      setAttachments([]);
    }
  }, [initialData]);

  const [errors, setErrors] = useState<Partial<Education>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);

  useEffect(() => {
    const result = validateSchooling(formValues);
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
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = validateSchooling(formValues);

    if (!result.success) {
      const fieldErrors = validationErrorsToObject(result.errors);
      setErrors(fieldErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      if (attachments.length > 0) {
        const uploadResult = await uploadFiles(attachments, "education-certificates");
  
        if (!uploadResult.success) {
          throw new Error("Failed to upload files");
        }
  
        await onSubmit({
          ...result.data,
          attachments: [...existingAttachments, ...(uploadResult.fileUrls || [])],
        });
      } else {
        await onSubmit(result.data);
      }
      
      setErrors({});
      onClose();
    } catch (error) {
      console.error("Error during form submission:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeExistingAttachment = (url: string) => {
    setExistingAttachments((prev) => prev.filter((f) => f !== url));
  };

  useEffect(() => {
    if (initialData) {
      setIsDirty(dirtyValuesChecker(initialData, formValues));
    }
    if (
      attachments.length > 0 ||
      existingAttachments.length !== (initialData?.attachments?.length || 0)
    ) {
      setIsDirty(true);
    }
  }, [initialData, formValues, attachments, existingAttachments]);

  const isDisabled = isSubmitting || 
                    uploading || 
                    (initialData ? !isDirty : false) || 
                    !isValid;

  const educationTypeOptions = schoolingTypes.map(type => ({
    value: type,
    label: type
  }));

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Education" : "Add Education"}
      size="md"
      preventBackdropClose={isSubmitting || uploading}
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <SelectField
          label="Education Type"
          name="type"
          value={formValues.type}
          onChange={handleChange}
          options={educationTypeOptions}
          error={errors.type}
          required
        />

        <FormField
          label="Degree/Education Name"
          name="name"
          value={formValues.name}
          onChange={handleChange}
          placeholder="Enter Degree/Education Name"
          error={errors.name}
          required
        />

        <FormField
          label="Institute"
          name="institute"
          value={formValues.institute}
          onChange={handleChange}
          placeholder="Enter Institute Name"
          error={errors.institute}
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
            required
          />
        </div>

        <FormField
          label="Result/Grade"
          name="result"
          value={formValues.result}
          onChange={handleChange}
          placeholder="Enter Result/Grade"
          error={errors.result}
        />

        <FileUploadField
          label="Certificates/Documents"
          files={attachments}
          existingFiles={existingAttachments}
          onFilesChange={setAttachments}
          onExistingFileRemove={removeExistingAttachment}
          accept="image/*,.pdf,.doc,.docx"
          multiple={true}
        />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 sm:gap-4 pt-4 border-t border-border-primary">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting || uploading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          
          <Button
            type="submit"
            variant="primary"
            disabled={isDisabled}
            isLoading={isSubmitting || uploading}
            className="w-full sm:w-auto"
          >
            {(isSubmitting || uploading) ? 
              (uploading ? "Uploading..." : "Saving...") : 
              "Save Education"
            }
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}
