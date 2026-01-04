"use client";

import { ReactNode } from "react";

export interface BadgeProps {
  children: ReactNode;
  variant?: "success" | "warning" | "error" | "info" | "default" | "primary";
  size?: "xs" | "sm" | "md";
  className?: string;
  dot?: boolean;
  icon?: ReactNode;
}

const variantClasses = {
  success: "bg-success/10 text-success border-success/30 dark:bg-success/20",
  warning: "bg-warning/10 text-warning border-warning/30 dark:bg-warning/20",
  error: "bg-error/10 text-error border-error/30 dark:bg-error/20",
  info: "bg-info/10 text-info border-info/30 dark:bg-info/20",
  default: "bg-surface-secondary text-foreground-secondary border-border-primary",
  primary: "bg-primary-100 text-primary-800 border-primary-200 dark:bg-primary-900/30 dark:text-primary-400 dark:border-primary-800",
};

const dotVariantClasses = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  info: "bg-info",
  default: "bg-foreground-tertiary",
  primary: "bg-primary-500",
};

const sizeClasses = {
  xs: "text-xs px-1.5 py-0.5",
  sm: "text-xs px-2 py-1",
  md: "text-sm px-3 py-1.5",
};

export function Badge({
  children,
  variant = "default",
  size = "sm",
  className = "",
  dot = false,
  icon,
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotVariantClasses[variant]}`} />
      )}
      {icon}
      {children}
    </span>
  );
}

// Status Badge with auto-detection
export interface StatusBadgeProps {
  status: string;
  variant?: "success" | "warning" | "error" | "info" | "default";
  size?: "xs" | "sm" | "md";
  className?: string;
}

export function StatusBadge({ status, variant, size = "sm", className = "" }: StatusBadgeProps) {
  const getAutoVariant = (statusText: string): "success" | "warning" | "error" | "info" | "default" => {
    const lower = statusText.toLowerCase();
    
    if (lower.includes("completed") || lower.includes("approved") || lower.includes("success") || lower.includes("active") || lower.includes("paid") || lower.includes("resolved")) {
      return "success";
    }
    if (lower.includes("pending") || lower.includes("draft") || lower.includes("waiting") || lower.includes("in progress") || lower.includes("processing")) {
      return "warning";
    }
    if (lower.includes("rejected") || lower.includes("failed") || lower.includes("error") || lower.includes("cancelled") || lower.includes("not started") || lower.includes("overdue")) {
      return "error";
    }
    if (lower.includes("ongoing") || lower.includes("scheduled") || lower.includes("upcoming")) {
      return "info";
    }
    
    return "default";
  };

  const finalVariant = variant || getAutoVariant(status);

  return (
    <Badge variant={finalVariant} size={size} className={className}>
      {status}
    </Badge>
  );
}

// Priority Badge
export interface PriorityBadgeProps {
  priority: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const getPriorityVariant = (priority: string): "error" | "warning" | "info" | "default" | "primary" => {
  const lower = priority.toLowerCase();
  if (lower === "urgent") return "error";
  if (lower === "high") return "warning";
  if (lower === "medium" || lower === "normal") return "primary";
  if (lower === "low") return "default";
  return "default";
};

export function PriorityBadge({ priority, size = "sm", className = "" }: PriorityBadgeProps) {
  const label = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
  
  return (
    <Badge variant={getPriorityVariant(priority)} size={size} className={className}>
      {label}
    </Badge>
  );
}

// Role Badge - Kept for display purposes (shows team names, not legacy roles)
export interface RoleBadgeProps {
  role: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}

export function RoleBadge({ role, size = "sm", className = "" }: RoleBadgeProps) {
  const getRoleVariant = (roleText: string): "success" | "warning" | "info" | "default" | "primary" | "error" => {
    const lower = roleText.toLowerCase();
    
    // For team names or legacy role display only
    if (lower.includes("admin") || lower.includes("superadmin")) {
      return "error";
    }
    if (lower.includes("manager") || lower.includes("lead")) {
      return "warning";
    }
    if (lower.includes("employee") || lower.includes("member")) {
      return "info";
    }
    
    return "default";
  };

  return (
    <Badge variant={getRoleVariant(role)} size={size} className={className}>
      {role}
    </Badge>
  );
}

// Count Badge (for notifications, etc.)
export interface CountBadgeProps {
  count: number;
  max?: number;
  variant?: "success" | "warning" | "error" | "info" | "default" | "primary";
  size?: "xs" | "sm";
  className?: string;
}

export function CountBadge({ 
  count, 
  max = 99, 
  variant = "error", 
  size = "xs",
  className = "" 
}: CountBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count;

  return (
    <Badge variant={variant} size={size} className={`min-w-5 justify-center ${className}`}>
      {displayCount}
    </Badge>
  );
}

export default Badge;
