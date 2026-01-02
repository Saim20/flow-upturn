"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Check, Clock, WarningCircle, Calendar, Briefcase, User, TrashSimple, Checks, ArrowSquareOut } from "@phosphor-icons/react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { formatRelativeTime } from "@/lib/utils";
import { Z_INDEX } from "@/lib/theme";
import Portal from "@/components/ui/Portal";
import Link from "next/link";
import { cn } from "@/components/ui/class";

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
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
  'red': 'text-error',
  'blue': 'text-primary-500',
  'green': 'text-success',
  'purple': 'text-purple-500',
  'orange': 'text-warning',
  'gray': 'text-foreground-tertiary',
};

const priorityColors = {
  'urgent': 'border-l-error bg-error/10 dark:bg-error/20',
  'high': 'border-l-warning bg-warning/10 dark:bg-warning/20',
  'normal': 'border-l-primary-500 bg-primary-50 dark:bg-primary-950/30',
  'low': 'border-l-border-secondary bg-background-secondary',
};

export default function NotificationDropdown({
  isOpen,
  onClose,
  triggerRef
}: NotificationDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });

  const {
    notifications, // Use real-time notifications from hook
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();

  // Calculate position relative to trigger
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

      setPosition({
        top: triggerRect.bottom + scrollTop + 8, // 8px gap
        right: window.innerWidth - triggerRect.right - scrollLeft,
      });
    }
  }, [isOpen, triggerRef]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose, triggerRef]);

  const handleMarkAsRead = async (notificationId: number) => {
    await markAsRead(notificationId);
    // No need to update local state - real-time will handle it
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    // No need to update local state - real-time will handle it
  };

  const handleDeleteNotification = async (notificationId: number) => {
    await deleteNotification(notificationId);
    // No need to update local state - real-time will handle it
  };

  const unreadNotifications = notifications.filter(n => !n.is_read);

  // Calculate if we're on mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isOpen) return null;

  return (
    <Portal>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobile && isOpen && (
          <motion.div
            key="notification-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 sm:hidden"
            style={{ zIndex: Z_INDEX.DROPDOWN - 1 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="notification-dropdown"
            ref={dropdownRef}
            initial={{ opacity: 0, y: isMobile ? 20 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isMobile ? 20 : -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed bg-surface-primary rounded-lg shadow-xl border border-border-primary overflow-hidden",
              // Desktop: positioned relative to trigger
              !isMobile && "w-96 max-h-112",
              // Mobile: full width modal at top
              isMobile && "inset-x-4 top-20 max-h-[70vh]"
            )}
            style={{
              ...(!isMobile ? { top: position.top, right: position.right } : {}),
              zIndex: Z_INDEX.DROPDOWN,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-foreground-secondary dark:text-foreground-secondary" />
              <h3 className="font-semibold text-foreground-primary dark:text-foreground-primary">Notifications</h3>
              {unreadNotifications.length > 0 && (
                <span className="bg-error text-white text-xs rounded-full px-2 py-0.5">
                  {unreadNotifications.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadNotifications.length > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 p-1 rounded"
                  title="Mark all as read"
                >
                  <Checks className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="text-foreground-tertiary dark:text-foreground-tertiary hover:bg-surface-hover dark:hover:bg-surface-hover p-1 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-foreground-secondary dark:text-foreground-secondary">
                <Bell className="h-8 w-8 mx-auto mb-2 text-foreground-tertiary dark:text-foreground-tertiary" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border-primary dark:divide-border-primary">
                {notifications.map((notification, index) => (
                  <NotificationItem
                    key={notification.id ?? `notification-${index}`}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDeleteNotification}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border-primary px-4 py-2">
              <Link
                href="/notifications"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium"
                onClick={onClose}
              >
                View all notifications
              </Link>
            </div>
          )}
        </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete
}: NotificationItemProps) {
  const IconComponent = iconMap[notification.type?.icon as keyof typeof iconMap] || Bell;
  const iconColor = colorMap[notification.type?.color as keyof typeof colorMap] || 'text-foreground-tertiary';
  const priorityStyle = priorityColors[notification.priority];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 border-l-4 ${priorityStyle} ${!notification.is_read ? 'bg-primary-50 dark:bg-primary-950/30' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className={`shrink-0 ${iconColor}`}>
          <IconComponent className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className={`text-sm font-medium ${!notification.is_read ? 'text-foreground-primary dark:text-foreground-primary' : 'text-foreground-secondary dark:text-foreground-secondary'}`}>
                {notification.title}
              </p>
              <p className={`text-sm mt-1 ${!notification.is_read ? 'text-foreground-secondary dark:text-foreground-secondary' : 'text-foreground-tertiary dark:text-foreground-tertiary'}`}>
                {notification.message}
              </p>

              <div className="flex items-center gap-3 mt-2 text-xs text-foreground-tertiary dark:text-foreground-tertiary">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(notification.created_at || '')}
                </span>
                {notification.context && (
                  <span className="px-2 py-1 bg-background-tertiary dark:bg-background-tertiary rounded-full">
                    {notification.context.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>

            {!notification.is_read && (
              <div className="w-2 h-2 bg-primary-500 rounded-full shrink-0 mt-1"></div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            {!notification.is_read && (
              <button
                onClick={() => onMarkAsRead(notification.id!)}
                className="text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/20 p-1 rounded text-xs flex items-center gap-1"
                title="Mark as read"
              >
                <Check className="h-3 w-3" />
                Mark read
              </button>
            )}

            {notification.action_url && (
              <Link
                href={notification.action_url}
                className="text-success hover:bg-success/10 p-1 rounded text-xs flex items-center gap-1"
                title="View details"
              >
                <ArrowSquareOut className="h-3 w-3" />
                View
              </Link>
            )}

            <button
              onClick={() => onDelete(notification.id!)}
              className="text-error hover:bg-error/10 p-1 rounded text-xs flex items-center gap-1"
              title="Delete"
            >
              <TrashSimple className="h-3 w-3" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}