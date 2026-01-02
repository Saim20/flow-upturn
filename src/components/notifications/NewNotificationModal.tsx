"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Eye, TrashSimple, WarningCircle, Calendar, Briefcase, User, Clock, Bell } from "@phosphor-icons/react";
import { Notification } from "@/hooks/useNotifications";
import { formatRelativeTime } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { fadeIn, fadeInUp } from "@/components/ui/animations";

interface NewNotificationModalProps {
  notification: Notification | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
}

const iconMap = {
  'alert-circle': WarningCircle,
  'calendar': Calendar,
  'briefcase': Briefcase,
  'user': User,
  'clock': Clock,
  'bell': Bell,
};

const colorMap = {
  'red': 'text-error bg-error/10 dark:bg-error/20',
  'blue': 'text-primary-500 bg-primary-50 dark:bg-primary-950/30',
  'green': 'text-success bg-success/10 dark:bg-success/20',
  'purple': 'text-purple-500 bg-purple-50 dark:bg-purple-900/30',
  'orange': 'text-warning bg-warning/10 dark:bg-warning/20',
  'gray': 'text-foreground-tertiary bg-background-secondary dark:bg-background-tertiary',
};

const priorityColors = {
  'urgent': 'border-error bg-error/10',
  'high': 'border-warning bg-warning/10',
  'normal': 'border-primary-500 bg-primary-50 dark:bg-primary-950/30',
  'low': 'border-border-secondary bg-surface-secondary',
};

const priorityLabels = {
  'urgent': 'Urgent',
  'high': 'High Priority',
  'normal': 'Normal',
  'low': 'Low Priority',
};

export default function NewNotificationModal({
  notification,
  isOpen,
  onClose,
  onMarkAsRead,
  onDelete,
}: NewNotificationModalProps) {
  const router = useRouter();

  if (!notification) return null;

  const iconName = (notification.type?.icon || 'bell') as keyof typeof iconMap;
  const IconComponent = iconMap[iconName] || Bell;
  const colorName = (notification.type?.color || 'blue') as keyof typeof colorMap;
  const colorClass = colorMap[colorName] || colorMap.blue;

  const handleView = () => {
    if (notification.action_url) {
      onMarkAsRead(notification.id!);
      onClose();
      router.push(notification.action_url);
    }
  };

  const handleMarkAsRead = () => {
    onMarkAsRead(notification.id!);
    onClose();
  };

  const handleDelete = () => {
    onDelete(notification.id!);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] backdrop-blur-sm p-4"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={handleBackdropClick}
        >
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="bg-surface-primary dark:bg-surface-primary rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`px-6 py-4 border-l-4 ${priorityColors[notification.priority]}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2.5 rounded-lg ${colorClass}`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground-primary dark:text-foreground-primary text-base">
                        {notification.title}
                      </h3>
                      {!notification.is_read && (
                        <span className="inline-block w-2 h-2 bg-primary-500 rounded-full shrink-0"></span>
                      )}
                    </div>
                    <p className="text-xs text-foreground-secondary dark:text-foreground-secondary">
                      {priorityLabels[notification.priority]} · {formatRelativeTime(notification.created_at!)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-foreground-tertiary dark:text-foreground-tertiary hover:text-foreground-secondary dark:hover:text-foreground-secondary hover:bg-surface-hover dark:hover:bg-surface-hover p-1.5 rounded-lg transition-colors shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <p className="text-foreground-primary dark:text-foreground-primary leading-relaxed whitespace-pre-wrap text-sm">
                {notification.message}
              </p>
              
              {notification.context && (
                <div className="mt-4 text-xs text-foreground-secondary dark:text-foreground-secondary bg-background-secondary dark:bg-background-secondary px-3 py-2.5 rounded-lg border border-border-primary dark:border-border-primary">
                  <span className="font-medium">Context:</span> {notification.context}
                </div>
              )}
            </div>

            {/* Footer with Actions */}
            <div className="px-6 py-4 bg-background-secondary dark:bg-background-secondary border-t border-border-primary dark:border-border-primary flex flex-wrap gap-3">
              {notification.action_url && (
                <button
                  onClick={handleView}
                  className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm shadow-sm"
                >
                  <Eye className="h-4 w-4" />
                  View
                </button>
              )}
              
              {!notification.is_read && (
                <button
                  onClick={handleMarkAsRead}
                  className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 bg-success text-white rounded-lg hover:bg-success/90 transition-colors font-medium text-sm shadow-sm"
                >
                  <Check className="h-4 w-4" />
                  Mark as Read
                </button>
              )}
              
              <button
                onClick={handleDelete}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-error/10 text-error rounded-lg hover:bg-error/20 transition-colors font-medium text-sm border border-error/30"
              >
                <TrashSimple className="h-4 w-4" />
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
