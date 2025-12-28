"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { fadeInUp } from "./animations";
import LoadingSpinner from "./LoadingSpinner";
import { EmptyState } from "./EmptyState";
import { Plus, Icon } from "@phosphor-icons/react";
import { Button } from "./button";

export interface SectionProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  addButton?: {
    onClick: () => void;
    label?: string;
    icon?: ReactNode;
  };
  children: ReactNode;
  loading?: boolean;
  loadingText?: string;
  loadingIcon?: Icon;
  emptyState?: {
    show: boolean;
    icon?: ReactNode;
    title?: string;
    message: string;
    action?: {
      label: string;
      onClick: () => void;
      icon?: ReactNode;
    };
  };
  className?: string;
  contentClassName?: string;
  padding?: "sm" | "md" | "lg";
  variant?: "default" | "card";
  animate?: boolean;
}

const paddingClasses = {
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-6",
  lg: "p-6 sm:p-8",
};

export function Section({
  icon,
  title,
  description,
  action,
  addButton,
  children,
  loading = false,
  loadingText,
  loadingIcon,
  emptyState,
  className = "",
  contentClassName = "",
  padding = "md",
  variant = "card",
  animate = true,
}: SectionProps) {
  const containerClasses =
    variant === "card"
      ? `bg-surface-primary ${paddingClasses[padding]} rounded-lg border border-border-primary shadow-sm`
      : paddingClasses[padding];

  const renderContent = () => {
    if (loading) {
      return (
        <LoadingSpinner
          icon={loadingIcon}
          text={loadingText || `Loading ${title.toLowerCase()}...`}
          height="h-40"
          color="gray"
        />
      );
    }

    if (emptyState?.show) {
      return (
        <div className="p-4 sm:p-6 bg-background-secondary dark:bg-background-tertiary rounded-lg text-center text-foreground-tertiary">
          {emptyState.icon && (
            <div className="flex justify-center mb-3">
              <div className="text-foreground-tertiary">
                {emptyState.icon}
              </div>
            </div>
          )}
          {emptyState.title && (
            <p className="font-medium text-foreground-secondary mb-1">
              {emptyState.title}
            </p>
          )}
          <p>{emptyState.message}</p>
          {emptyState.action && (
            <Button
              variant="primary"
              size="sm"
              onClick={emptyState.action.onClick}
              className="mt-4"
            >
              {emptyState.action.icon}
              {emptyState.action.label}
            </Button>
          )}
          {/* Add Button for empty state - use addButton if no specific emptyState.action */}
          {!emptyState.action && addButton && (
            <button
              type="button"
              onClick={addButton.onClick}
              className="mt-4 inline-flex items-center gap-1.5 font-medium text-xs px-3 py-1.5 rounded bg-primary-600 hover:bg-primary-700 text-white shadow-sm dark:bg-primary-500 dark:hover:bg-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <Plus size={16} />
              {addButton.label || "Add"}
            </button>
          )}
        </div>
      );
    }

    return <div className={contentClassName}>{children}</div>;
  };

  const content = (
    <section className={`${containerClasses} ${className}`}>
      {/* Header */}
      <div className="border-b border-border-primary pb-4 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground-primary flex items-center">
              {icon && (
                <span className="w-5 h-5 mr-2 text-foreground-secondary flex items-center">
                  {icon}
                </span>
              )}
              {title}
            </h3>
            {description && (
              <p className="text-sm text-foreground-secondary mt-0.5">
                {description}
              </p>
            )}
          </div>
          {action}
        </div>
      </div>

      {/* Content */}
      {renderContent()}

      {/* Always render children for modals/portals even when showing empty state or loading */}
      {(loading || emptyState?.show) && <div className="hidden">{children}</div>}

      {/* Add Button - show at bottom when there are items and not loading */}
      {addButton && !loading && !emptyState?.show && (
        <div className="flex justify-center sm:justify-start mt-4">
          <button
            onClick={addButton.onClick}
            className="flex items-center justify-center text-white bg-primary-700 dark:bg-primary-600 rounded-full w-8 h-8 shadow-sm hover:bg-primary-800 dark:hover:bg-primary-700 transition-colors"
            title={addButton.label || "Add new"}
          >
            {addButton.icon || <Plus size={18} />}
          </button>
        </div>
      )}
    </section>
  );

  if (animate) {
    return (
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

// Simpler section header component for inline use
export interface SectionHeaderProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({
  icon,
  title,
  description,
  action,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`border-b border-border-primary pb-4 mb-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground-primary flex items-center">
            {icon && (
              <span className="w-5 h-5 mr-2 text-foreground-secondary flex items-center">
                {icon}
              </span>
            )}
            {title}
          </h3>
          {description && (
            <p className="text-sm text-foreground-secondary mt-0.5">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}

export default Section;
