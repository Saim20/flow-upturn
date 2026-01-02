"use client";

import React from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { PermissionModule, PERMISSION_MODULES } from "@/lib/constants";
import { PermissionsBadgeGroup } from "./PermissionBadge";
import { Info, X } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

interface ModulePermissionsBannerProps {
  /** The module to display permissions for */
  module: PermissionModule | string;
  /** Optional custom title */
  title?: string;
  /** Show as compact banner */
  compact?: boolean;
  /** Allow dismissing the banner */
  dismissible?: boolean;
}

/**
 * Banner component that displays the user's permissions for a specific module
 * Shows at the top of module pages to give users clear visibility of their access level
 * 
 * Usage:
 * ```tsx
 * <ModulePermissionsBanner module="tasks" />
 * ```
 */
export function ModulePermissionsBanner({
  module,
  title,
  compact = false,
  dismissible = false,
}: ModulePermissionsBannerProps) {
  const { permissions, permissionsLoading } = useAuth();
  const [isDismissed, setIsDismissed] = React.useState(false);

  if (permissionsLoading || isDismissed) {
    return null;
  }

  const modulePermissions = permissions[module] || {
    can_read: false,
    can_write: false,
    can_delete: false,
    can_approve: false,
    can_comment: false,
  };
  
  const hasAccess = modulePermissions.can_read || 
                    modulePermissions.can_write || 
                    modulePermissions.can_delete || 
                    modulePermissions.can_approve || 
                    modulePermissions.can_comment;

  // Don't show banner if user has no permissions at all
  if (!hasAccess) {
    return null;
  }

  const moduleName = title || module.charAt(0).toUpperCase() + module.slice(1);

  if (compact) {
    return (
      <AnimatePresence>
        {!isDismissed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="mb-4 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-primary-50/50 via-indigo-50/30 to-primary-50/50 dark:from-primary-900/10 dark:via-indigo-900/5 dark:to-primary-900/10 border border-primary-200/60 dark:border-primary-800/30 rounded-lg px-4 py-2.5 backdrop-blur-sm transition-all duration-200 hover:border-primary-300/80 dark:hover:border-primary-700/50">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Info size={16} weight="duotone" className="text-primary-600 dark:text-primary-400 shrink-0" />
                  <span className="text-xs font-medium text-primary-900 dark:text-primary-100 truncate">
                    {moduleName} Access:
                  </span>
                  <div className="flex-1 min-w-0">
                    <PermissionsBadgeGroup permissions={modulePermissions} size="sm" />
                  </div>
                </div>
                {dismissible && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsDismissed(true)}
                    className="p-1 text-primary-600/70 dark:text-primary-400/70 hover:text-primary-800 dark:hover:text-primary-300 hover:bg-primary-100/50 dark:hover:bg-primary-800/20 rounded-md transition-colors shrink-0"
                    aria-label="Dismiss permissions banner"
                  >
                    <X size={14} weight="bold" />
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="mb-6"
        >
          <div className="relative bg-gradient-to-br from-primary-50 via-indigo-50 to-primary-100/50 dark:from-primary-900/20 dark:via-indigo-900/15 dark:to-primary-900/25 border border-primary-200 dark:border-primary-800/40 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-sm">
            {/* Decorative gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary-100/20 dark:to-primary-900/10 rounded-xl pointer-events-none" />
            
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/40 rounded-lg">
                  <Info size={20} weight="duotone" className="text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-primary-950 dark:text-primary-50 mb-1 tracking-tight">
                    Your {moduleName} Permissions
                  </h3>
                  <p className="text-xs text-primary-700/80 dark:text-primary-300/70 leading-relaxed">
                    Actions you can perform in this module
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 sm:ml-auto">
                <PermissionsBadgeGroup permissions={modulePermissions} size="md" />
                {dismissible && (
                  <motion.button
                    whileHover={{ scale: 1.05, rotate: 90 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsDismissed(true)}
                    className="p-1.5 text-primary-600/70 dark:text-primary-400/70 hover:text-primary-800 dark:hover:text-primary-300 hover:bg-primary-100/50 dark:hover:bg-primary-800/20 rounded-lg transition-colors"
                    aria-label="Dismiss permissions banner"
                  >
                    <X size={16} weight="bold" />
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
