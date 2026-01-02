"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Eye, TrashSimple, PencilSimple } from "@phosphor-icons/react";
import LoadingSpinner from "./LoadingSpinner";

export interface EntityListItemProps {
  /** Icon to display at the start of the item */
  icon?: ReactNode;
  /** Primary text/name */
  name: string;
  /** Secondary text/subtitle */
  subtitle?: string;
  /** Tertiary info text */
  info?: string;
  /** Actions configuration */
  actions?: {
    onView?: () => void;
    viewLabel?: string;
    onEdit?: () => void;
    editLabel?: string;
    onDelete?: () => void;
    deleteLabel?: string;
    custom?: ReactNode;
  };
  /** Loading state for delete action */
  deleteLoading?: boolean;
  /** Any loading state */
  loading?: boolean;
  /** Click handler for the whole item */
  onClick?: () => void;
  /** Additional class names */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: {
    container: "p-2",
    icon: "w-6 h-6",
    iconSize: 14,
    text: "text-sm",
    button: "px-2 py-1 text-xs",
  },
  md: {
    container: "p-2 sm:p-3",
    icon: "w-7 h-7 sm:w-8 sm:h-8",
    iconSize: 16,
    text: "text-sm sm:text-base",
    button: "px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm",
  },
  lg: {
    container: "p-3 sm:p-4",
    icon: "w-8 h-8 sm:w-10 sm:h-10",
    iconSize: 18,
    text: "text-base",
    button: "px-3 py-1.5 text-sm",
  },
};

export function EntityListItem({
  icon,
  name,
  subtitle,
  info,
  actions,
  deleteLoading = false,
  loading = false,
  onClick,
  className = "",
  size = "md",
}: EntityListItemProps) {
  const sizes = sizeClasses[size];

  if (loading) {
    return (
      <div
        className={`
          bg-surface-primary rounded-lg border border-border-primary
          ${sizes.container}
          animate-pulse
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`${sizes.icon} bg-surface-secondary rounded-full`} />
          <div className="flex-1">
            <div className="h-4 bg-surface-secondary rounded w-32 mb-1" />
            {subtitle && <div className="h-3 bg-surface-secondary rounded w-24" />}
          </div>
        </div>
      </div>
    );
  }

  const hasActions = actions && (actions.onView || actions.onEdit || actions.onDelete || actions.custom);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onClick={onClick}
      className={`
        bg-surface-primary rounded-lg border border-border-primary
        ${sizes.container}
        flex flex-col sm:flex-row items-start sm:items-center justify-between
        shadow-sm hover:shadow-md transition-shadow duration-200
        ${onClick ? "cursor-pointer" : ""}
        ${className}
      `}
    >
      {/* Left side - Icon and text */}
      <div className="flex items-center mb-2 sm:mb-0 min-w-0 flex-1">
        {icon && (
          <div
            className={`
              ${sizes.icon}
              bg-background-secondary dark:bg-background-tertiary
              rounded-full flex items-center justify-center
              text-foreground-secondary mr-2 sm:mr-3 shrink-0
            `}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className={`font-medium text-foreground-primary ${sizes.text} block truncate`}>
            {name}
          </span>
          {subtitle && (
            <span className="text-xs text-foreground-tertiary block truncate">
              {subtitle}
            </span>
          )}
          {info && (
            <span className="text-xs text-foreground-tertiary block truncate">
              {info}
            </span>
          )}
        </div>
      </div>

      {/* Right side - Actions */}
      {hasActions && (
        <div className="flex gap-2 w-full sm:w-auto justify-end shrink-0">
          {/* Custom actions first */}
          {actions.custom}

          {/* View button */}
          {actions.onView && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                actions.onView?.();
              }}
              className={`
                ${sizes.button}
                rounded-md bg-background-secondary dark:bg-background-tertiary
                text-foreground-secondary flex items-center gap-1
                hover:bg-background-tertiary dark:hover:bg-surface-secondary
                transition-colors
              `}
            >
              <Eye size={sizes.iconSize - 2} />
              <span className="hidden xs:inline">{actions.viewLabel || "Details"}</span>
            </button>
          )}

          {/* Edit button */}
          {actions.onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                actions.onEdit?.();
              }}
              className={`
                ${sizes.button}
                rounded-md bg-primary-50 dark:bg-primary-950/30
                text-primary-600 dark:text-primary-400 flex items-center gap-1
                hover:bg-primary-100 dark:hover:bg-primary-900
                transition-colors
              `}
            >
              <PencilSimple size={sizes.iconSize - 2} />
              <span className="hidden xs:inline">{actions.editLabel || "Edit"}</span>
            </button>
          )}

          {/* Delete button */}
          {actions.onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                actions.onDelete?.();
              }}
              disabled={deleteLoading}
              className={`
                ${sizes.button}
                rounded-md bg-error/10 dark:bg-error/20
                text-error dark:text-error flex items-center gap-1
                hover:bg-error/20 dark:hover:bg-error/30
                transition-colors
                ${deleteLoading ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <TrashSimple size={sizes.iconSize - 2} />
              <span className="hidden xs:inline">
                {deleteLoading ? "Deleting..." : (actions.deleteLabel || "Delete")}
              </span>
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// List wrapper for EntityListItems
export interface EntityListProps {
  children: ReactNode;
  className?: string;
  gap?: "sm" | "md" | "lg";
}

const gapClasses = {
  sm: "space-y-2",
  md: "space-y-3",
  lg: "space-y-4",
};

export function EntityList({ children, className = "", gap = "md" }: EntityListProps) {
  return <div className={`${gapClasses[gap]} ${className}`}>{children}</div>;
}

export default EntityListItem;
