"use client";

import React, { useEffect, useState, ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Calendar, Clock, CaretDown, Package, WarningCircle, Check, X, FileText } from "@phosphor-icons/react";
import InlineSpinner from "@/components/ui/InlineSpinner";
import { toast } from "sonner";
import BaseModal from "@/components/ui/modals/BaseModal";
import { useRequisitionInventories, useRequisitionTypes } from "@/hooks/useConfigTypes";
import { supabase } from "@/lib/supabase/client";
import { getCompanyId, getEmployeeInfo } from "@/lib/utils/auth";
import { uploadManyFiles } from "@/lib/utils/files";
import { useNotifications } from "@/hooks/useNotifications";

interface RequisitionCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface CreateFormState {
  requisition_category_id: number | undefined;
  item_id: number | undefined;
  quantity: number | undefined;
  is_one_off: boolean;
  from_time: string;
  to_time: string;
  date: string;
  description: string;
}

const initialFormState: CreateFormState = {
  requisition_category_id: undefined,
  item_id: undefined,
  quantity: undefined,
  is_one_off: false,
  from_time: "",
  to_time: "",
  date: "",
  description: "",
};

export default function RequisitionCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: RequisitionCreateModalProps) {
  const [isOneOff, setIsOneOff] = useState(false);
  const [formState, setFormState] = useState<CreateFormState>(initialFormState);
  const [attachments, setAttachments] = useState<File[]>([]);
  const { requisitionTypes, fetchRequisitionTypes } = useRequisitionTypes();
  const { requisitionInventories, fetchRequisitionInventories } = useRequisitionInventories();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);

  const { createNotification } = useNotifications();

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setTouchedFields((prev) => ({ ...prev, [name]: true }));

    if (
      name === "quantity" ||
      name === "requisition_category_id" ||
      name === "item_id"
    ) {
      setFormState((prev) => ({ ...prev, [name]: value ? Number(value) : undefined }));
    } else {
      setFormState((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFieldBlur = (fieldName: string) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));
  };

  const removeFile = (name: string) => {
    setAttachments((prev) => prev.filter((file) => file.name !== name));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setTouchedFields({
      requisition_category_id: true,
      item_id: true,
      quantity: true,
      date: true,
      from_time: true,
      to_time: true,
    });

    if (!isValid) {
      toast.error("Please fix the form errors before submitting");
      return;
    }

    setIsSubmitting(true);
    try {
      const company_id = await getCompanyId();
      const user = await getEmployeeInfo();
      if (!user) return;

      let uploadedFilePaths: string[] = [];
      let publicUrls: string[] = [];

      // Upload attachments if any
      if (attachments.length > 0) {
        const uploadResult = await uploadManyFiles(attachments, "requisition");
        if (uploadResult.error) throw uploadResult.error;
        uploadedFilePaths = uploadResult.uploadedFilePaths;
        publicUrls = uploadResult.publicUrls;
      }

      const formattedRequisitionState = {
        ...formState,
        is_one_off: isOneOff,
        attachments: uploadedFilePaths,
        attachment_download_urls: publicUrls,
        employee_id: user.id,
        company_id,
        status: "Pending",
        asset_owner: requisitionInventories.find(
          (inv) => inv.id === formState.item_id
        )?.asset_owner,
      };

      const { data, error } = await supabase
        .from("requisition_records")
        .insert(formattedRequisitionState);

      if (error) throw error;

      toast.success("Requisition created successfully!");
      
      // Reset form
      setFormState(initialFormState);
      setAttachments([]);
      setTouchedFields({});
      setIsOneOff(false);

      // Notify relevant parties
      const recipients = [user.supervisor_id, formattedRequisitionState.asset_owner].filter(Boolean) as string[];
      createNotification({
        title: "New Requisition Created",
        message: `A new requisition has been created by ${user.name}.`,
        priority: 'normal',
        type_id: 6,
        recipient_id: recipients,
        action_url: '/ops/requisition',
        company_id: user.company_id,
        department_id: user.department_id
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error creating Requisition:", error);
      toast.error("Error creating Requisition. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    setFormState((prev) => ({
      ...prev,
      is_one_off: isOneOff,
    }));
  }, [isOneOff]);

  useEffect(() => {
    const newErrors: Record<string, string> = {};
    let valid = true;

    if (!formState.requisition_category_id) {
      newErrors.requisition_category_id = "Please select a category";
      valid = false;
    }

    if (!formState.item_id) {
      newErrors.item_id = "Please select an item";
      valid = false;
    }

    if (!formState.quantity || formState.quantity <= 0) {
      newErrors.quantity = "Please enter a valid quantity";
      valid = false;
    }

    if (!formState.date) {
      newErrors.date = "Please select a date";
      valid = false;
    }

    if (!isOneOff) {
      if (!formState.from_time) {
        newErrors.from_time = "Please specify the start time";
        valid = false;
      }

      if (!formState.to_time) {
        newErrors.to_time = "Please specify the end time";
        valid = false;
      }
    }

    setErrors(newErrors);
    setIsValid(valid);
  }, [formState, isOneOff]);

  useEffect(() => {
    if (isOpen) {
      fetchRequisitionTypes();
      fetchRequisitionInventories();
    }
  }, [isOpen, fetchRequisitionTypes, fetchRequisitionInventories]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormState(initialFormState);
      setAttachments([]);
      setTouchedFields({});
      setIsOneOff(false);
    }
  }, [isOpen]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Requisition"
      icon={<Package className="text-blue-600" size={24} />}
      size="lg"
    >
      <div className="space-y-6">
        <div
          className="flex items-center cursor-pointer gap-2 bg-background-secondary dark:bg-background-tertiary p-3 rounded-lg border border-border-primary"
          onClick={() => setIsOneOff(!isOneOff)}
        >
          <div
            className={`w-12 h-6 rounded-full relative ${
              isOneOff ? "bg-primary-500" : "bg-border-secondary dark:bg-surface-hover"
            } transition-colors duration-300`}
          >
            <motion.div
              className="w-5 h-5 bg-surface-primary rounded-full absolute top-0.5"
              animate={{
                left: isOneOff ? "calc(100% - 1.25rem - 0.125rem)" : "0.125rem",
              }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </div>
          <span className="text-sm font-medium text-foreground-secondary">
            One-Off Request
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground-secondary mb-1 flex items-center">
              <Package size={16} className="mr-2" />
              Category
            </label>
            <div className="relative">
              <select
                name="requisition_category_id"
                value={formState.requisition_category_id ?? ""}
                onChange={handleInputChange}
                onBlur={() => handleFieldBlur("requisition_category_id")}
                className="w-full appearance-none rounded-md border-border-secondary bg-background-secondary dark:bg-background-tertiary focus:border-primary-500 focus:ring focus:ring-primary-200 transition-colors p-2 pr-8"
              >
                <option value="">Select category</option>
                {requisitionTypes.length > 0 &&
                  requisitionTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
              </select>
              <CaretDown
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-foreground-tertiary pointer-events-none"
                size={16}
              />
              {touchedFields.requisition_category_id &&
                errors.requisition_category_id && (
                  <p className="mt-1 text-error text-sm flex items-center">
                    <WarningCircle size={14} className="mr-1" />
                    {errors.requisition_category_id}
                  </p>
                )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-1">
              Item
            </label>
            <div className="relative">
              <select
                name="item_id"
                value={formState.item_id ?? ""}
                onChange={handleInputChange}
                onBlur={() => handleFieldBlur("item_id")}
                className="w-full appearance-none rounded-md border-border-secondary bg-background-secondary dark:bg-background-tertiary focus:border-primary-500 focus:ring focus:ring-primary-200 transition-colors p-2 pr-8"
              >
                <option value="">Select item</option>
                {requisitionInventories.length > 0 &&
                  requisitionInventories
                    .filter(
                      (inv) =>
                        inv.requisition_category_id ===
                        formState.requisition_category_id
                    )
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
              </select>
              <CaretDown
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-foreground-tertiary pointer-events-none"
                size={16}
              />
              {touchedFields.item_id && errors.item_id && (
                <p className="mt-1 text-error text-sm flex items-center">
                  <WarningCircle size={14} className="mr-1" />
                  {errors.item_id}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-1">
              Quantity
            </label>
            <input
              type="number"
              name="quantity"
              value={formState.quantity ?? ""}
              onChange={handleInputChange}
              onBlur={() => handleFieldBlur("quantity")}
              className="w-full rounded-md border-border-secondary bg-background-secondary dark:bg-background-tertiary focus:border-primary-500 focus:ring focus:ring-primary-200 transition-colors p-2"
            />
            {touchedFields.quantity && errors.quantity && (
              <p className="mt-1 text-error text-sm flex items-center">
                <WarningCircle size={14} className="mr-1" />
                {errors.quantity}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="text-sm font-medium text-foreground-secondary mb-1 flex items-center">
                <Calendar size={16} className="mr-2" />
                Date
              </label>
              <div className="relative bg-background-secondary dark:bg-background-tertiary border border-border-secondary rounded-md flex items-center overflow-hidden focus-within:ring-2 focus-within:ring-primary-300 focus-within:border-primary-500">
                <Calendar size={16} className="ml-3 text-foreground-tertiary" />
                <input
                  type="date"
                  name="date"
                  value={formState.date}
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur("date")}
                  className="w-full p-2 outline-none bg-transparent"
                />
              </div>
              {touchedFields.date && errors.date && (
                <p className="mt-1 text-error text-sm flex items-center">
                  <WarningCircle size={14} className="mr-1" />
                  {errors.date}
                </p>
              )}
            </div>

            {!isOneOff && (
              <>
                <div>
                  <label className="text-sm font-medium text-foreground-secondary mb-1 flex items-center">
                    <Clock size={16} className="mr-2" />
                    From
                  </label>
                  <div className="relative bg-background-secondary dark:bg-background-tertiary border border-border-secondary rounded-md flex items-center overflow-hidden focus-within:ring-2 focus-within:ring-blue-300 focus-within:border-blue-500">
                    <Clock size={16} className="ml-3 text-foreground-tertiary" />
                    <input
                      type="time"
                      name="from_time"
                      value={formState.from_time}
                      onChange={handleInputChange}
                      onBlur={() => handleFieldBlur("from_time")}
                      className="w-full p-2 outline-none bg-transparent"
                    />
                  </div>
                  {touchedFields.from_time && errors.from_time && (
                    <p className="mt-1 text-error text-sm flex items-center">
                      <WarningCircle size={14} className="mr-1" />
                      {errors.from_time}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground-secondary mb-1 flex items-center">
                    <Clock size={16} className="mr-2" />
                    To
                  </label>
                  <div className="relative bg-background-secondary dark:bg-background-tertiary border border-border-secondary rounded-md flex items-center overflow-hidden focus-within:ring-2 focus-within:ring-blue-300 focus-within:border-blue-500">
                    <Clock size={16} className="ml-3 text-foreground-tertiary" />
                    <input
                      type="time"
                      name="to_time"
                      value={formState.to_time}
                      onChange={handleInputChange}
                      onBlur={() => handleFieldBlur("to_time")}
                      className="w-full p-2 outline-none bg-transparent"
                    />
                  </div>
                  {touchedFields.to_time && errors.to_time && (
                    <p className="mt-1 text-error text-sm flex items-center">
                      <WarningCircle size={14} className="mr-1" />
                      {errors.to_time}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-1">
              Description
            </label>
            <input
              type="text"
              name="description"
              maxLength={35}
              value={formState.description}
              onChange={handleInputChange}
              placeholder="Max 35 characters"
              className="w-full rounded-md border-border-secondary bg-background-secondary dark:bg-background-tertiary focus:border-primary-500 focus:ring focus:ring-primary-200 transition-colors p-2"
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="text-sm font-medium text-foreground-secondary mb-1 flex items-center">
              <Upload size={16} className="mr-2" />
              Attachments
            </label>
            <div className="bg-background-secondary dark:bg-background-tertiary border border-dashed border-border-secondary rounded-lg p-4 text-center">
              <label
                htmlFor="create_file_upload"
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm rounded-lg cursor-pointer hover:bg-primary-700 transition-colors"
              >
                <Upload size={16} className="mr-2" />
                Browse Files
              </label>
              <input
                type="file"
                id="create_file_upload"
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
                        <button
                          type="button"
                          className="text-foreground-tertiary hover:text-error"
                          onClick={() => removeFile(file.name)}
                        >
                          <X size={16} />
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 bg-background-tertiary dark:bg-surface-secondary text-foreground-secondary px-6 py-2 rounded-lg hover:bg-surface-hover transition-colors"
            >
              Cancel
            </motion.button>

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
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Check size={18} />
                  <span>Create</span>
                </>
              )}
            </motion.button>
          </div>
        </form>
      </div>
    </BaseModal>
  );
}
