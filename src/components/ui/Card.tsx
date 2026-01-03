"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
  variant?: "default" | "outlined" | "elevated";
  "data-testid"?: string;
  [key: `data-${string}`]: string | undefined;
}

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

interface StatusBadgeProps {
  status: string;
  variant?: "success" | "warning" | "error" | "info" | "pending";
  size?: "sm" | "md";
}

interface PriorityBadgeProps {
  priority: "urgent" | "high" | "normal" | "low";
  size?: "sm" | "md";
}

const paddingClasses = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

const variantClasses = {
  default: "bg-surface-primary border border-border-primary",
  outlined: "bg-surface-primary border-2 border-border-secondary",
  elevated: "bg-surface-primary border border-border-primary shadow-lg",
};

export function Card({
  children,
  className = "",
  hover = true,
  padding = "md",
  variant = "default",
  ...rest
}: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 1, y: -20 }}
      transition={{ duration: 0.2 }}
      className={`
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        rounded-lg
        transition-all duration-200
        ${hover ? "hover:shadow-md hover:border-border-secondary" : ""}
        ${className}
      `}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({ title, subtitle, icon, action, className = "" }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between mb-4 ${className}`}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {icon && (
          <div className="shrink-0 text-foreground-secondary">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-foreground-primary truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-foreground-secondary mt-1 line-clamp-2">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="shrink-0 ml-4">
          {action}
        </div>
      )}
    </div>
  );
}

export function CardContent({ children, className = "" }: CardContentProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div className={`mt-4 pt-4 border-t border-border-primary ${className}`}>
      {children}
    </div>
  );
}

export function StatusBadge({ status, variant, size = "sm" }: StatusBadgeProps) {
  const getVariantClasses = (status: string, variant?: string) => {
    if (variant) {
      const variantMap = {
        success: "bg-success/10 text-success border-success/30 dark:bg-success/20 dark:border-success/40",
        warning: "bg-warning/10 text-warning border-warning/30 dark:bg-warning/20 dark:border-warning/40",
        error: "bg-error/10 text-error border-error/30 dark:bg-error/20 dark:border-error/40",
        info: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
        pending: "bg-surface-secondary text-foreground-secondary border-border-primary",
      };
      return variantMap[variant as keyof typeof variantMap] || variantMap.info;
    }

    // Auto-detect based on status text
    const statusLower = status.toLowerCase();
    if (statusLower.includes("completed") || statusLower.includes("approved") || statusLower.includes("success")) {
      return "bg-success/10 text-success border-success/30 dark:bg-success/20 dark:border-success/40";
    }
    if (statusLower.includes("pending") || statusLower.includes("draft")) {
      return "bg-warning/10 text-warning border-warning/30 dark:bg-warning/20 dark:border-warning/40";
    }
    if (statusLower.includes("rejected") || statusLower.includes("failed") || statusLower.includes("error") || statusLower.includes("not started")) {
      return "bg-error/10 text-error border-error/30 dark:bg-error/20 dark:border-error/40";
    }
    if (statusLower.includes("in progress") || statusLower.includes("ongoing")) {
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    }
    return "bg-surface-secondary text-foreground-secondary border-border-primary";
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
  };

  return (
    <span className={`
      inline-flex items-center rounded-full border font-medium
      ${getVariantClasses(status, variant)}
      ${sizeClasses[size]}
    `}>
      {status}
    </span>
  );
}

export function PriorityBadge({ priority, size = "sm" }: PriorityBadgeProps) {
  const priorityClasses = {
    urgent: "bg-error/10 text-error border-error/30 dark:bg-error/20 dark:border-error/40",
    high: "bg-warning/10 text-warning border-warning/30 dark:bg-warning/20 dark:border-warning/40",
    normal: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    low: "bg-surface-secondary text-foreground-tertiary border-border-primary",
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
  };

  return (
    <span className={`
      inline-flex items-center rounded-full border font-medium
      ${priorityClasses[priority]}
      ${sizeClasses[size]}
    `}>
      {priority}
    </span>
  );
}

export function InfoRow({
  icon,
  label,
  value,
  className = ""
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <div className="text-foreground-tertiary shrink-0">
        {icon}
      </div>
      <span className="font-medium text-foreground-secondary shrink-0">
        {label}:
      </span>
      <span className="text-foreground-primary truncate">
        {value}
      </span>
    </div>
  );
}
