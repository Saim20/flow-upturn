"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Bell, User, MagnifyingGlass, SignOut, UserCircle, ShieldWarning, Moon, Sun, Bug } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import NewNotificationModal from "@/components/notifications/NewNotificationModal";
import { useTheme } from "@/contexts/ThemeContext";
import ReportProblemModal from "@/components/ui/ReportProblemModal";
import GlobalSearch from "@/components/search/GlobalSearch";

// Get module info from pathname for report problem context
function getModuleInfo(pathname: string): { moduleName: string; moduleCategory: string } {
  const segments = pathname.split("/").filter(Boolean);
  
  if (segments[0] === "ops") {
    const moduleName = segments[1] 
      ? segments[1].split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
      : "Operations";
    return { moduleName, moduleCategory: "Operations" };
  }
  
  if (segments[0] === "admin") {
    if (segments[1] === "logs" && segments[2]) {
      const moduleName = segments[2].split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") + " Log";
      return { moduleName, moduleCategory: "Admin Logs" };
    }
    if (segments[1] === "config" && segments[2]) {
      const moduleName = segments[2].split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      return { moduleName, moduleCategory: "Admin Config" };
    }
    if (segments[1]) {
      const moduleName = segments[1].split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      return { moduleName, moduleCategory: "Admin" };
    }
    return { moduleName: "Admin", moduleCategory: "Admin" };
  }
  
  return { moduleName: "General", moduleCategory: "General" };
}

// Routes where the report problem button should appear
const REPORT_ENABLED_ROUTES = ["/ops", "/admin"];

export default function TopBar() {
  const { employeeInfo, isApproved } = useAuth();
  const { mode, toggleMode } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [newNotificationModal, setNewNotificationModal] = useState(false);
  const [reportProblemModalOpen, setReportProblemModalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [latestNotification, setLatestNotification] = useState<Notification | null>(null);
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null!);
  const router = useRouter();
  const pathname = usePathname();
  
  // Get module info for report problem context
  const { moduleName, moduleCategory } = getModuleInfo(pathname);
  const showReportProblem = REPORT_ENABLED_ROUTES.some(route => pathname.startsWith(route));
  
  // Notification hook - realtime handles all updates
  const { 
    unreadCount, 
    notifications,
    markAsRead,
    deleteNotification 
  } = useNotifications();

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Watch for new notifications and show modal
  useEffect(() => {
    console.log('[TopBar] Checking for new notifications...', {
      notificationsLength: notifications.length,
      previousUnreadCount,
      currentUnreadCount: notifications.filter(n => !n.is_read).length
    });

    if (notifications.length > 0 && previousUnreadCount > 0) {
      const currentUnreadCount = notifications.filter(n => !n.is_read).length;
      
      console.log('[TopBar] Comparing counts:', { currentUnreadCount, previousUnreadCount });
      
      // If unread count increased, show the newest unread notification
      if (currentUnreadCount > previousUnreadCount) {
        const newestUnread = notifications.find(n => !n.is_read);
        console.log('[TopBar] New unread notification detected!', newestUnread);
        if (newestUnread) {
          setLatestNotification(newestUnread);
          setNewNotificationModal(true);
        }
      }
      
      setPreviousUnreadCount(currentUnreadCount);
    } else if (notifications.length > 0) {
      // Initialize previous count
      const initialCount = notifications.filter(n => !n.is_read).length;
      console.log('[TopBar] Initializing previous count:', initialCount);
      setPreviousUnreadCount(initialCount);
    }
  }, [notifications, previousUnreadCount]);

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  const basePath = `/${pathname.split('/')[1]}`;
  const isAuthorized = isApproved || basePath === "/account";

  const handleMarkAsRead = async (id: number) => {
    await markAsRead(id);
  };

  const handleDeleteNotification = async (id: number) => {
    await deleteNotification(id);
  };

  if (!isAuthorized) return null;

  return (
    <>
    <header className="bg-background-secondary border-b border-border-primary shadow-sm sticky top-0 z-40 h-16">
      <div className="pr-4 md:pr-6 h-full flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center">
          {!isApproved && (
            <div className="flex items-center text-warning">
              <ShieldWarning className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium hidden md:inline">Restricted access</span>
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-1 md:space-x-3">
          {isApproved && (
            <>
              {/* Search button */}
              <button 
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-primary hover:bg-surface-hover text-foreground-tertiary transition-colors"
                title="Search (Ctrl+K)"
              >
                <MagnifyingGlass className="h-4 w-4" />
                <span className="hidden md:inline text-sm">Search...</span>
                <div className="hidden lg:inline-flex items-center gap-0.5">
                  <kbd className="px-1.5 py-0.5 text-[11px] font-medium bg-surface-secondary rounded border border-border-primary shadow-sm">Ctrl</kbd>
                  <span className="text-[10px] text-foreground-tertiary">+</span>
                  <kbd className="px-1.5 py-0.5 text-[11px] font-medium bg-surface-secondary rounded border border-border-primary shadow-sm">K</kbd>
                </div>
              </button>
              
              <div className="relative">
                <button 
                  onClick={toggleMode}
                  className="p-2 rounded-full hover:bg-surface-hover text-foreground-tertiary transition-colors"
                  title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                >
                  {mode === 'light' ? (
                    <Moon className="h-5 w-5" />
                  ) : (
                    <Sun className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Report Problem Button */}
              {showReportProblem && (
                <div className="relative">
                  <button 
                    onClick={() => setReportProblemModalOpen(true)}
                    className="p-2 rounded-full hover:bg-error/10 dark:hover:bg-error/20 text-error transition-colors"
                    title="Report a problem"
                  >
                    <Bug className="h-5 w-5" />
                  </button>
                </div>
              )}
              
              <div className="relative">
                <button 
                  ref={notificationButtonRef}
                  onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                  className="p-2 rounded-full hover:bg-surface-hover text-foreground-tertiary transition-colors relative"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-error text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Notification dropdown - renders via Portal */}
              <NotificationDropdown
                isOpen={notificationDropdownOpen}
                onClose={() => setNotificationDropdownOpen(false)}
                triggerRef={notificationButtonRef}
              />
            </>
          )}

          <div className="relative" ref={userMenuRef}>
            <button 
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center px-2 py-1 rounded-full hover:bg-surface-hover transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden border border-primary-200">
                <User className="h-5 w-5 text-primary-600" />
              </div>
              <span className="ml-2 text-sm font-medium text-foreground-secondary hidden md:inline-block">
                {employeeInfo?.name || 'Profile'}
              </span>
            </button>

            {/* User dropdown */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-surface-primary rounded-md shadow-lg py-1 z-1100 border border-border-primary">
                <div className="px-4 py-2 border-b border-border-primary">
                  <p className="text-sm font-medium text-foreground-primary">{employeeInfo?.name || 'User'}</p>
                  <p className="text-xs text-foreground-tertiary">{employeeInfo?.designation || 'Employee'}</p>
                  {!isApproved && (
                    <p className="text-xs mt-1 text-warning">Pending approval</p>
                  )}
                </div>

                <Link 
                  href="/profile" 
                  className="px-4 py-2 text-sm text-foreground-secondary hover:bg-surface-hover flex items-center"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <UserCircle className="h-4 w-4 mr-2" />
                  My Account
                </Link>

                {/* <Link 
                  href="/account/settings" 
                  className=" px-4 py-2 text-sm text-foreground-secondary hover:bg-background-tertiary dark:bg-surface-secondary flex items-center"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Gear className="h-4 w-4 mr-2" />
                  Settings
                </Link> */}

                <div className="border-t border-border-primary mt-1">
                  <button 
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error/10 dark:hover:bg-error/20 flex items-center"
                  >
                    <SignOut className="h-4 w-4 mr-2" />
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>

    {/* New Notification Modal */}
    <NewNotificationModal
      notification={latestNotification}
      isOpen={newNotificationModal}
      onClose={() => setNewNotificationModal(false)}
      onMarkAsRead={handleMarkAsRead}
      onDelete={handleDeleteNotification}
    />

    {/* Report Problem Modal */}
    <ReportProblemModal
      isOpen={reportProblemModalOpen}
      onClose={() => setReportProblemModalOpen(false)}
      moduleName={moduleName}
      moduleCategory={moduleCategory}
    />

    {/* Global Search Modal */}
    <GlobalSearch
      isOpen={searchOpen}
      onClose={() => setSearchOpen(false)}
    />
    </>
  );
}
