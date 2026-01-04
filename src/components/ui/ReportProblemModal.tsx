"use client";

import { useState, useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bug, PaperPlaneTilt, CheckCircle } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth/auth-context";
import { fadeIn, fadeInUp } from "./animations";
import { InlineSpinner } from "@/components/ui";
import { FormField, TextAreaField } from "@/components/forms";

interface ReportProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleName?: string; // e.g., "Task", "Project", "Attendance"
  moduleCategory?: string; // e.g., "Operations", "Admin Logs"
}

type FeedbackType = "bug" | "improvement" | "question" | "other";

const feedbackTypes: { value: FeedbackType; label: string; description: string }[] = [
  { value: "bug", label: "Bug Report", description: "Something isn't working correctly" },
  { value: "improvement", label: "Feature Request", description: "Suggest an improvement" },
  { value: "question", label: "Question", description: "Need help understanding something" },
  { value: "other", label: "Other", description: "General feedback" },
];

export default function ReportProblemModal({
  isOpen,
  onClose,
  moduleName,
  moduleCategory,
}: ReportProblemModalProps) {
  const { employeeInfo, user } = useAuth();
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFeedbackType("bug");
      setTitle("");
      setDescription("");
      setIsSuccess(false);
      setError(null);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isSubmitting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      setError("Please fill in both the title and description.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Get current URL for context
      const currentUrl = typeof window !== "undefined" ? window.location.href : "";
      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";

      // Build context message
      const contextParts = [
        `Type: ${feedbackTypes.find(t => t.value === feedbackType)?.label || feedbackType}`,
        moduleName && `Module: ${moduleName}`,
        moduleCategory && `Category: ${moduleCategory}`,
        `Path: ${currentPath}`,
        `Company ID: ${employeeInfo?.company_id || "N/A"}`,
        `User Designation: ${employeeInfo?.designation || "N/A"}`,
      ].filter(Boolean).join("\n");

      // Send feedback to Sentry using captureFeedback
      const eventId = Sentry.captureMessage(`[${feedbackType.toUpperCase()}] ${title}`, {
        level: feedbackType === "bug" ? "error" : "info",
        tags: {
          feedback_type: feedbackType,
          module_name: moduleName || "unknown",
          module_category: moduleCategory || "unknown",
        },
        extra: {
          user_description: description,
          current_url: currentUrl,
          current_path: currentPath,
          company_id: employeeInfo?.company_id,
          employee_name: employeeInfo?.name,
          employee_designation: employeeInfo?.designation,
          department_id: employeeInfo?.department_id,
        },
      });

      // Send user feedback linked to the event
      Sentry.captureFeedback({
        name: employeeInfo?.name || "Anonymous User",
        email: user?.email || employeeInfo?.email || "no-email@example.com",
        message: `${title}\n\n${description}\n\n---\nContext:\n${contextParts}`,
        associatedEventId: eventId,
      });

      setIsSuccess(true);
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      setError("Failed to submit your feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 overflow-y-auto py-4 sm:py-8 backdrop-blur-sm"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={handleBackdropClick}
        >
          <motion.div
            className="w-full max-w-lg mx-auto px-4 sm:px-0"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <div className="bg-surface-primary dark:bg-surface-primary rounded-xl w-full max-h-[calc(100vh-2rem)] overflow-y-auto shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border-primary dark:border-border-primary">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-error/10 dark:bg-error/20 rounded-lg">
                    <Bug size={20} className="text-error" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground-primary dark:text-foreground-primary">
                      Report a Problem
                    </h2>
                    {(moduleName || moduleCategory) && (
                      <p className="text-sm text-foreground-secondary dark:text-foreground-secondary">
                        {[moduleCategory, moduleName].filter(Boolean).join(" • ")}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="p-2 hover:bg-surface-hover dark:hover:bg-surface-hover rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:opacity-50"
                  aria-label="Close modal"
                >
                  <X size={20} className="text-foreground-secondary dark:text-foreground-secondary" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 sm:p-6">
                {isSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-8 text-center"
                  >
                    <div className="p-3 bg-success/10 dark:bg-success/20 rounded-full mb-4">
                      <CheckCircle size={40} className="text-success" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground-primary dark:text-foreground-primary mb-2">
                      Thank you for your feedback!
                    </h3>
                    <p className="text-foreground-secondary dark:text-foreground-secondary">
                      Your report has been submitted and our team will review it.
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Feedback Type */}
                    <div>
                      <label className="block text-sm font-medium text-foreground-primary dark:text-foreground-primary mb-2">
                        What type of feedback?
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {feedbackTypes.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setFeedbackType(type.value)}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${
                              feedbackType === type.value
                                ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                                : "border-border-primary dark:border-border-primary hover:border-border-secondary hover:bg-surface-hover dark:hover:bg-surface-hover"
                            }`}
                          >
                            <span className={`block font-medium text-sm ${
                              feedbackType === type.value ? "text-primary-700 dark:text-primary-300" : "text-foreground-primary dark:text-foreground-primary"
                            }`}>
                              {type.label}
                            </span>
                            <span className="block text-xs text-foreground-tertiary dark:text-foreground-tertiary mt-0.5">
                              {type.description}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Title */}
                    <FormField
                      label="Title"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Brief summary of the issue"
                      disabled={isSubmitting}
                      maxLength={100}
                    />

                    {/* Description */}
                    <div>
                      <TextAreaField
                        label="Description"
                        required
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Please describe the issue in detail. What were you trying to do? What happened instead? Any steps to reproduce?"
                        rows={5}
                        disabled={isSubmitting}
                        maxLength={2000}
                      />
                      <p className="text-xs text-foreground-tertiary mt-1 text-right">
                        {description.length}/2000
                      </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm"
                      >
                        {error}
                      </motion.div>
                    )}

                    {/* Info Note */}
                    <div className="p-3 bg-surface-secondary border border-border-primary rounded-lg text-sm text-foreground-secondary">
                      <p>
                        <strong>Note:</strong> Your feedback will include your name, email, and current page context to help us investigate the issue.
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2.5 border border-border-primary dark:border-border-primary text-foreground-primary dark:text-foreground-primary font-medium rounded-lg hover:bg-surface-hover dark:hover:bg-surface-hover transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !title.trim() || !description.trim()}
                        className="flex-1 px-4 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <InlineSpinner size="sm" color="white" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <PaperPlaneTilt size={18} />
                            Submit Report
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
