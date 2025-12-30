"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "@phosphor-icons/react";
import { fadeIn, fadeInUp } from "../animations";
import { BaseModalProps } from "./types";

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-xl", 
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export default function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  icon,
  size = "md",
  showCloseButton = true,
  preventBackdropClose = false,
  className = "",
}: BaseModalProps) {
  const [mounted, setMounted] = useState(false);

  // Wait for client-side mount before using portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
      document.body.setAttribute("data-modal-open", "true");
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
      document.body.removeAttribute("data-modal-open");
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !preventBackdropClose) {
      onClose();
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/70 dark:bg-black/80 flex items-center justify-center z-50 overflow-y-auto py-4 sm:py-8 backdrop-blur-sm"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={handleBackdropClick}
        >
          <motion.div
            className={`w-full ${sizeClasses[size]} mx-auto px-4 sm:px-0`}
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <div
              className={`bg-surface-primary rounded-xl w-full max-h-[calc(100vh-2rem)] overflow-y-auto shadow-2xl ${className}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border-primary">
                <div className="flex items-center gap-3">
                  {icon && <div className="text-foreground-secondary">{icon}</div>}
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground-primary">
                    {title}
                  </h2>
                </div>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-surface-hover rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                    aria-label="Close modal"
                  >
                    <X size={20} weight="bold" className="text-foreground-secondary" />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-5 sm:p-6">
                {children}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Use portal to render modal at document body level, escaping any parent overflow/z-index issues
  if (!mounted) {
    return null;
  }

  return createPortal(modalContent, document.body);
}
