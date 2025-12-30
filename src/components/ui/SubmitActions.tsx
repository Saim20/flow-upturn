"use client";

import { FloppyDisk, X } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import LoadingSpinner from "./LoadingSpinner";

interface SubmitActionsProps {
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
  onCancel: () => void;
  submitText?: string;
  cancelText?: string;
  className?: string;
  disabled?: boolean;
}

export default function SubmitActions({
  isSubmitting,
  isDirty,
  isValid,
  onCancel,
  submitText = "Save Changes",
  cancelText = "Cancel",
  className = "",
  disabled = false,
}: SubmitActionsProps) {
  const canSubmit = isDirty && isValid && !isSubmitting && !disabled;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex justify-end gap-3 ${className}`}
    >
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 rounded-md bg-surface-primary border border-border-primary text-foreground-primary text-sm font-medium shadow-sm hover:bg-background-secondary dark:hover:bg-background-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 transition-colors"
      >
        <X className="h-4 w-4 inline mr-2" />
        {cancelText}
      </button>

      <div className="relative">
        <button
          type="submit"
          disabled={!canSubmit}
          className={`px-4 py-2 rounded-md text-white text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 flex items-center transition-all duration-200 ${
            canSubmit
              ? "bg-primary-600 hover:bg-primary-700 cursor-pointer"
              : "bg-foreground-tertiary cursor-not-allowed"
          }`}
          title={
            !isDirty
              ? "No changes to save"
              : !isValid
              ? "Please fix validation errors"
              : disabled
              ? "Action disabled"
              : isSubmitting
              ? "Saving..."
              : "Save your changes"
          }
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner className="h-4 w-4 mr-2" />
              Saving...
            </>
          ) : (
            <>
              <FloppyDisk className="h-4 w-4 mr-2" />
              {submitText}
            </>
          )}
        </button>

        {/* Tooltip for disabled state */}
        {!canSubmit && !isSubmitting && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-background-primary bg-foreground-primary rounded-lg opacity-0 hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            {!isDirty
              ? "No changes to save"
              : !isValid
              ? "Please fix validation errors"
              : disabled
              ? "Action disabled"
              : ""}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-foreground-primary"></div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
