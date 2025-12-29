"use client";

import React, { useEffect, useState, ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, CaretLeft, CaretDown, WarningCircle, Check, X, FileText, ChatCircle, User, Flag } from "@phosphor-icons/react";
import InlineSpinner from "@/components/ui/InlineSpinner";
import { supabase } from "@/lib/supabase/client";
import { ComplaintRecord } from "@/lib/types/schemas";
import { useEmployees } from "@/hooks/useEmployees";
import { useComplaintTypes } from "@/hooks/useConfigTypes";
import { toast } from "sonner";
import { getEmployeeInfo } from "@/lib/utils/auth";
import { uploadManyFiles } from "@/lib/utils/files";
import { useNotifications } from "@/hooks/useNotifications";
import { SelectField, TextAreaField } from "@/components/forms";

const initialComplaintRecord = {
  complaint_type_id: undefined,
  complainer_id: "",
  requested_to: "",
  description: "",
  status: "Submitted",
  anonymous: false,
  against_whom: "",
  attachments: [],
};

export type ComplaintState = ComplaintRecord;

interface ComplaintCreatePageProps {
  onClose: () => void;
  setActiveTab: (tab: string) => void;
}

export default function ComplaintCreatePage({ onClose, setActiveTab }: ComplaintCreatePageProps) {
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [complaintState, setComplaintState] = useState<ComplaintState>(initialComplaintRecord);
  const [attachments, setAttachments] = useState<File[]>([]);
  const { complaintTypes, fetchComplaintTypes } = useComplaintTypes();
  const { employees, fetchEmployees } = useEmployees();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const { createNotification } = useNotifications()

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // mark field as touched
    setTouched((prev) => ({ ...prev, [name]: true }));

    if (name === "complaint_type_id") {
      setComplaintState((prev: ComplaintState) => ({
        ...prev,
        [name]: value ? Number(value) : undefined,
      }));
    } else {
      setComplaintState((prev: ComplaintState) => ({ ...prev, [name]: value }));
    }
  };

  const removeFile = (name: string) => {
    setAttachments((prev) => prev.filter((file) => file.name !== name));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const user = await getEmployeeInfo();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const { uploadedFilePaths, error: uploadError, publicUrls } = await uploadManyFiles(
        attachments,
        "complaints"
      );

      if (uploadError) throw uploadError;

      const formattedComplaintState = {
        ...complaintState,
        attachments: uploadedFilePaths,
        attachment_download_urls: publicUrls,
        anonymous: isAnonymous,
        complainer_id: user.id, // Always store complainer_id for history tracking, anonymous flag controls visibility
        company_id: user.company_id,
        requested_to: user.supervisor_id,
      };

      const { error } = await supabase
        .from("complaint_records")
        .insert(formattedComplaintState);

      if (error) throw error;

      toast.success("Complaint created successfully!");
      setComplaintState(initialComplaintRecord);
      setAttachments([]);
      setTouched({});
      onClose();

      setActiveTab("history")

      const recipients = [user.supervisor_id].filter(Boolean) as string[];

      const complaintAuthor = formattedComplaintState.anonymous ? "" : `by ${user.name}`;

      createNotification({
        title: "New Complaint Filed",
        message: `A new complaint has been filed ${complaintAuthor}`,
        priority: "normal",
        type_id: 6,
        recipient_id: recipients,
        action_url: "/ops/complaint",
        company_id: user.company_id,
        department_id: user.department_id,
      });
    } catch (error: any) {
      console.error("Error creating Complaint:", error);
      toast.error(`Error creating Complaint: ${error.message || "Please try again"}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    setComplaintState((prev) => ({
      ...prev,
      anonymous: isAnonymous,
    }));
  }, [isAnonymous]);

  useEffect(() => {
    // Validate form
    const newErrors: Record<string, string> = {};
    let valid = true;

    if (!complaintState.complaint_type_id && complaintState.complaint_type_id !== 0) {
      newErrors.complaint_type_id = "Please select a category";
      valid = false;
    }

    if (!complaintState.against_whom) {
      newErrors.against_whom = "Please select a person";
      valid = false;
    }

    if (!complaintState.description) {
      newErrors.description = "Description is required";
      valid = false;
    }

    setErrors(newErrors);
    setIsValid(valid);
  }, [complaintState]);

  useEffect(() => {
    fetchComplaintTypes();
    fetchEmployees();
  }, [fetchComplaintTypes, fetchEmployees]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 sm:p-6 space-y-6"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-700">Create Complaint</h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900 transition-colors"
        >
          <CaretLeft size={16} />
          <span>Back</span>
        </motion.button>
      </div>

      <div
        className="flex items-center cursor-pointer gap-2 bg-background-secondary dark:bg-background-tertiary p-3 rounded-lg border border-border-primary"
        onClick={() => setIsAnonymous(!isAnonymous)}
      >
        <div
          className={`w-12 h-6 rounded-full relative ${
            isAnonymous ? "bg-primary-500" : "bg-border-secondary dark:bg-surface-hover"
          } transition-colors duration-300`}
        >
          <motion.div
            className="w-5 h-5 bg-surface-primary rounded-full absolute top-0.5"
            animate={{
              left: isAnonymous ? "calc(100% - 1.25rem - 0.125rem)" : "0.125rem",
            }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </div>
        <span className="text-sm font-medium text-foreground-secondary">
          Anonymous Complaint
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-surface-primary shadow-sm rounded-lg p-6 border border-border-primary"
      >
        <div className="space-y-4">
          {/* Category */}
          <SelectField
            name="complaint_type_id"
            label="Category"
            value={complaintState.complaint_type_id}
            onChange={handleInputChange}
            options={[
              { value: "", label: "Select category" },
              ...complaintTypes.filter((type) => type.id !== undefined).map((type) => ({ value: type.id!, label: type.name }))
            ]}
            error={touched.complaint_type_id ? errors.complaint_type_id : undefined}
          />

          {/* Complaint Against */}
          <SelectField
            name="against_whom"
            label="Complaint Against"
            value={complaintState.against_whom}
            onChange={handleInputChange}
            options={[
              { value: "", label: "Select a person" },
              ...employees.map((emp) => ({ value: emp.id, label: emp.name }))
            ]}
            error={touched.against_whom ? errors.against_whom : undefined}
          />

          {/* Description */}
          <TextAreaField
            name="description"
            label="Description"
            value={complaintState.description}
            onChange={handleInputChange}
            rows={4}
            placeholder="Describe your complaint..."
            error={touched.description ? errors.description : undefined}
          />

          {/* Attachments */}
          <div>
            <label className="text-sm font-medium text-foreground-secondary mb-1 flex items-center">
              <Upload size={16} className="mr-2" />
              Attachment
            </label>
            <div className="bg-background-secondary dark:bg-background-tertiary border border-dashed border-border-secondary rounded-lg p-6 text-center">
              <Upload className="mx-auto mb-4 text-foreground-tertiary h-10 w-10" />
              <p className="text-sm text-foreground-tertiary mb-4">
                Drag and drop files here, or
              </p>
              <label
                htmlFor="file_upload"
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm rounded-lg cursor-pointer hover:bg-primary-700 transition-colors"
              >
                <Upload size={16} className="mr-2" />
                Browse Files
              </label>
              <input
                type="file"
                id="file_upload"
                name="attachments"
                className="hidden"
                accept=".pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .txt"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setAttachments((prev) => [
                    ...prev,
                    ...files.filter(
                      (file) => !prev.some((f) => f.name === file.name)
                    ),
                  ]);
                }}
              />

              <AnimatePresence>
                {attachments.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-wrap gap-2 mt-4 justify-center"
                  >
                    {attachments.map((file, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2 bg-surface-primary border border-border-primary px-3 py-2 rounded-lg text-sm"
                      >
                        <FileText size={14} className="text-blue-500" />
                        <span className="truncate max-w-xs">{file.name}</span>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          type="button"
                          className="text-foreground-tertiary hover:text-error"
                          onClick={() => removeFile(file.name)}
                        >
                          <X size={16} />
                        </motion.button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4 pt-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={!isValid || isSubmitting}
            className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <InlineSpinner size="sm" color="white" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Check size={18} />
                <span>Submit</span>
              </>
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
}
