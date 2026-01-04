// app/(dashboard)/onboarding/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion";
import { UserPlus, CircleNotch, Check, X, Warning, Users, User, ArrowsClockwise, DeviceMobile, ArrowRight } from "@phosphor-icons/react";
import { toast, Toaster } from "react-hot-toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useEmployees } from "@/hooks/useEmployees";
import { useOnboarding, PendingEmployee } from "@/hooks/useOnboarding";
import { useDepartments } from "@/hooks/useDepartments";
import { useDevices } from "@/hooks/useDevices";
import { ModulePermissionsBanner, PermissionGate, PermissionTooltip } from "@/components/permissions";
import { PERMISSION_MODULES } from "@/lib/constants";

const Button = ({
  children,
  className,
  ...props
}: HTMLMotionProps<"button">) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className={`text-white rounded-lg px-4 py-2 text-sm font-semibold ${className}`}
    {...props}
  >
    {children}
  </motion.button>
);

const Textarea = ({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={`w-full p-3 text-sm border border-border-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${className}`}
    {...props}
  />
);

export default function OnboardingApprovalPage() {
  const router = useRouter();
  const [rejectionReasons, setRejectionReasons] = useState<
    Record<string, string>
  >({});
  const { employees, fetchEmployees } = useEmployees();
  const { departments, fetchDepartments } = useDepartments();
  const {
    loading,
    error,
    pendingEmployees,
    fetchPendingEmployees,
    processOnboardingAction,
    subscribeToOnboardingUpdates,
  } = useOnboarding();
  const { pendingDevices, fetchPendingDevices } = useDevices();

  // Track initial data fetch
  const hasInitialized = useRef(false);

  // Initial data fetch - only run once
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    fetchPendingEmployees();
    fetchEmployees();
    fetchDepartments();
    fetchPendingDevices();

    // Set up polling for updates (replaces realtime)
    const unsubscribe = subscribeToOnboardingUpdates(() => {
      // Onboarding list polled and updated
    });

    return () => {
      unsubscribe();
    };
  }, [fetchPendingEmployees, fetchEmployees, fetchDepartments, fetchPendingDevices, subscribeToOnboardingUpdates]);

  // Memoized input change handler
  const handleInputChange = useCallback((id: string, value: string) => {
    setRejectionReasons((prev) => ({ ...prev, [id]: value }));
  }, []);

  // Memoized action handler
  const handleAction = useCallback(async (id: string, action: "ACCEPTED" | "REJECTED") => {
    const reason = rejectionReasons[id] || undefined;

    try {
      const result = await processOnboardingAction(id, action, reason);
      if (result.success) {
        toast.success(result.message);
        // Clear the rejection reason for this employee
        setRejectionReasons((prev) => {
          const { [id]: removed, ...rest } = prev;
          return rest;
        });
        // Refresh the list manually
        await fetchPendingEmployees();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to process request");
      console.error(error);
    }
  }, [rejectionReasons, processOnboardingAction, fetchPendingEmployees]);

  // Memoized refresh handler
  const handleRefresh = useCallback(async () => {
    try {
      await fetchPendingEmployees();
      toast.success("List refreshed!");
    } catch (error) {
      toast.error("Failed to refresh list");
    }
  }, [fetchPendingEmployees]);

  // Memoized animation variants
  const pageVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        when: "beforeChildren"
      }
    }
  }), []);

  const contentVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1
      }
    }
  }), []);

  const itemVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 260,
        damping: 20
      }
    }
  }), []);

  if (loading) {
    return (
      <LoadingSpinner
        color="purple"
        text="Loading onboarding requests..."
        icon={UserPlus}
      />
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={pageVariants}
      className="w-full p-4 sm:p-6 lg:p-8"
    >
      <Toaster position="top-right" />

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center mb-8"
        data-tutorial="onboarding-header"
      >
        <h1 className="text-2xl font-bold text-foreground-primary flex items-center">
          <UserPlus className="mr-2 h-7 w-7 text-primary-600" />
          Employee Onboarding
        </h1>
      </motion.div>

      {/* Permission Banner */}
      <ModulePermissionsBanner module={PERMISSION_MODULES.ONBOARDING} title="Onboarding" compact />

      {/* Device Approval Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div
          onClick={() => router.push('/ops/onboarding/devices')}
          className="bg-linear-to-br from-primary-500 to-primary-700 dark:from-primary-800 dark:to-primary-950 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 dark:bg-white/10 rounded-lg flex items-center justify-center">
                <DeviceMobile className="h-6 w-6 text-white" weight="duotone" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">
                  Device Approval Requests
                </h3>
                <p className="text-primary-50 dark:text-primary-200 text-sm">
                  Manage pending device access requests
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {pendingDevices.length > 0 && (
                <div className="bg-white/20 dark:bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <span className="text-white font-bold text-lg">
                    {pendingDevices.length}
                  </span>
                  <span className="text-primary-50 dark:text-primary-200 text-sm ml-2">
                    pending
                  </span>
                </div>
              )}
              <ArrowRight
                className="h-6 w-6 text-white group-hover:translate-x-1 transition-transform"
                weight="bold"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {pendingEmployees.length === 0 ? (
        <div className="mt-10 bg-surface-secondary rounded-xl border border-border-primary">
          <EmptyState
            icon={Users}
            title="No Pending Requests"
            description="There are currently no pending onboarding requests that require approval."
          />
        </div>
      ) : (
        <motion.div
          variants={contentVariants}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground-primary">New User Requests</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900 transition-colors"
                disabled={loading}
              >
                <ArrowsClockwise className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <div className="text-sm text-foreground-tertiary">
                {pendingEmployees.length} request{pendingEmployees.length !== 1 ? 's' : ''} pending
              </div>
            </div>
          </div>

          {pendingEmployees.map((emp: PendingEmployee) => (
            <motion.div
              key={emp.id}
              variants={itemVariants}
              layout
              whileHover={{
                y: -4,
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
              }}
              className="bg-surface-primary rounded-xl p-6 shadow-sm border border-border-primary space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-950 flex items-center justify-center text-primary-600 dark:text-primary-400">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground-primary">
                      {emp.first_name} {emp.last_name}
                    </h3>
                    <p className="text-sm text-foreground-tertiary">{emp.designation}</p>
                  </div>
                </div>
                <div className="text-xs font-medium text-white dark:text-foreground-primary bg-primary-500 dark:bg-primary-500/20 px-2 py-1 rounded-full">
                  New Request
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-foreground-tertiary">Department</span>
                    <span className="font-medium text-foreground-secondary">
                      {departments.find(d => d.id === emp.department_id)?.name || 'Not assigned'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-tertiary">Phone</span>
                    <span className="font-medium text-foreground-secondary">{emp.phone_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-tertiary">Email</span>
                    <span className="font-medium text-foreground-secondary">{emp.email}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-foreground-tertiary">Job Status</span>
                    <span className="font-medium text-foreground-secondary">{emp.job_status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-tertiary">Joining Date</span>
                    <span className="font-medium text-foreground-secondary">
                      {new Date(emp.hire_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-tertiary">Supervisor</span>
                    <span className="font-medium text-foreground-secondary">
                      {employees.length > 0 && employees.filter((e) => e.id === emp.supervisor_id)[0]?.name || 'Not assigned'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Device Information Section */}
              {emp.pending_device && (
                <div className="mt-2 p-3 bg-primary-50 dark:bg-primary-950/30 rounded-lg border border-primary-200 dark:border-primary-800">
                  <div className="flex items-center gap-2 mb-2">
                    <DeviceMobile className="h-4 w-4 text-primary-600" weight="duotone" />
                    <span className="text-sm font-medium text-foreground-primary">Pending Device</span>
                    <span className="text-xs text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/50 px-2 py-0.5 rounded-full">
                      Auto-approves on accept
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {emp.pending_device.browser && (
                      <div>
                        <span className="text-foreground-tertiary">Browser: </span>
                        <span className="font-medium text-foreground-secondary">{emp.pending_device.browser}</span>
                      </div>
                    )}
                    {emp.pending_device.os && (
                      <div>
                        <span className="text-foreground-tertiary">OS: </span>
                        <span className="font-medium text-foreground-secondary">{emp.pending_device.os}</span>
                      </div>
                    )}
                    {emp.pending_device.device_type && (
                      <div>
                        <span className="text-foreground-tertiary">Type: </span>
                        <span className="font-medium text-foreground-secondary capitalize">{emp.pending_device.device_type}</span>
                      </div>
                    )}
                    {emp.pending_device.model && emp.pending_device.model !== 'Desktop Computer' && (
                      <div>
                        <span className="text-foreground-tertiary">Model: </span>
                        <span className="font-medium text-foreground-secondary">{emp.pending_device.model}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Textarea
                placeholder="Reason for rejection (required if rejecting)"
                value={rejectionReasons[emp.id] || ""}
                onChange={(e) => handleInputChange(emp.id, e.target.value)}
              />

              <div className="flex gap-4 justify-end">
                <PermissionGate
                  module={PERMISSION_MODULES.ONBOARDING}
                  action="can_approve"
                  fallback={
                    <PermissionTooltip message="You don't have permission to approve onboarding requests">
                      <div className="flex gap-4">
                        <button
                          disabled
                          className="bg-background-tertiary text-foreground-tertiary rounded-lg px-4 py-2 text-sm font-semibold cursor-not-allowed opacity-60 flex items-center gap-2"
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </button>
                        <button
                          disabled
                          className="bg-background-tertiary text-foreground-tertiary rounded-lg px-4 py-2 text-sm font-semibold cursor-not-allowed opacity-60 flex items-center gap-2"
                        >
                          <Check className="h-4 w-4" />
                          Accept
                        </button>
                      </div>
                    </PermissionTooltip>
                  }
                >
                  <Button
                    className="bg-error hover:bg-error/90 flex items-center gap-2"
                    onClick={() => handleAction(emp.id, "REJECTED")}
                    disabled={loading}
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </Button>
                  <Button
                    className="bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white flex items-center gap-2"
                    onClick={() => handleAction(emp.id, "ACCEPTED")}
                    disabled={loading}
                  >
                    <Check className="h-4 w-4" />
                    Accept
                  </Button>
                </PermissionGate>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
