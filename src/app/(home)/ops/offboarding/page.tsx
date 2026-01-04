"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserMinus, User, MagnifyingGlass, ArrowsClockwise, Users, Check, X, Calendar, Briefcase, Building, Phone, Envelope, Warning, ArrowCounterClockwise } from "@phosphor-icons/react";
import { toast, Toaster } from "react-hot-toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  useOffboarding,
  OffboardingEmployee,
  OffboardingData,
} from "@/hooks/useOffboarding";
import { useDepartments } from "@/hooks/useDepartments";
import { fadeIn, fadeInUp, staggerContainer } from "@/components/ui/animations";
import { ModulePermissionsBanner, PermissionGate, PermissionTooltip } from "@/components/permissions";
import { PERMISSION_MODULES } from "@/lib/constants";

const Button = ({
  children,
  className,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) => (
  <motion.button
    whileHover={{ scale: disabled ? 1 : 1.05 }}
    whileTap={{ scale: disabled ? 1 : 0.95 }}
    className={`text-white rounded-lg px-4 py-2 text-sm font-semibold ${className}`}
    onClick={onClick}
    disabled={disabled}
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

interface OffboardingFormData {
  offboarding_date: string;
  reason: string;
  offboarding_type: "Resigned" | "Terminated";
  notes?: string;
}

export default function OffboardingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "offboarded">("active");
  const [selectedEmployee, setSelectedEmployee] =
    useState<OffboardingEmployee | null>(null);
  const [formData, setFormData] = useState<OffboardingFormData>({
    offboarding_date: new Date().toISOString().split("T")[0],
    reason: "",
    offboarding_type: "Resigned",
    notes: "",
  });

  const {
    loading,
    error,
    activeEmployees,
    offboardedEmployees,
    fetchActiveEmployees,
    fetchOffboardedEmployees,
    processOffboarding,
    reactivateEmployee,
  } = useOffboarding();

  const { departments, fetchDepartments } = useDepartments();

  // Track initial data fetch
  const hasInitialized = useRef(false);

  // Initial data fetch - only run once
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    fetchActiveEmployees();
    fetchOffboardedEmployees();
    fetchDepartments();
  }, [fetchActiveEmployees, fetchOffboardedEmployees, fetchDepartments]);

  // Memoized refresh handler
  const handleRefresh = useCallback(async () => {
    try {
      await fetchActiveEmployees();
      await fetchOffboardedEmployees();
      toast.success("List refreshed!");
    } catch (error) {
      toast.error("Failed to refresh list");
    }
  }, [fetchActiveEmployees, fetchOffboardedEmployees]);

  // Memoized offboarding handler
  const handleOffboarding = useCallback(async () => {
    if (!selectedEmployee) return;

    if (!formData.reason.trim()) {
      toast.error("Please provide a reason for offboarding");
      return;
    }

    try {
      const data: OffboardingData = {
        employee_id: selectedEmployee.id,
        offboarding_date: formData.offboarding_date,
        reason: formData.reason,
        offboarding_type: formData.offboarding_type,
        notes: formData.notes,
      };

      const result = await processOffboarding(data);
      if (result.success) {
        toast.success(result.message);
        setSelectedEmployee(null);
        setFormData({
          offboarding_date: new Date().toISOString().split("T")[0],
          reason: "",
          offboarding_type: "Resigned",
          notes: "",
        });
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to process offboarding");
      console.error(error);
    }
  }, [selectedEmployee, formData, processOffboarding]);

  // Memoized reactivate handler
  const handleReactivate = useCallback(async (employeeId: string) => {
    try {
      const result = await reactivateEmployee(employeeId);
      if (result.success) {
        toast.success(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to reactivate employee");
      console.error(error);
    }
  }, [reactivateEmployee]);

  // Memoized filtered employees
  const filteredActiveEmployees = useMemo(() => activeEmployees.filter((emp) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      emp.first_name.toLowerCase().includes(searchLower) ||
      emp.last_name.toLowerCase().includes(searchLower) ||
      emp.email.toLowerCase().includes(searchLower) ||
      emp.designation?.toLowerCase().includes(searchLower) ||
      emp.department_name?.toLowerCase().includes(searchLower)
    );
  }), [activeEmployees, searchQuery]);

  const filteredOffboardedEmployees = useMemo(() => offboardedEmployees.filter((emp) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      emp.first_name.toLowerCase().includes(searchLower) ||
      emp.last_name.toLowerCase().includes(searchLower) ||
      emp.email.toLowerCase().includes(searchLower) ||
      emp.designation?.toLowerCase().includes(searchLower) ||
      emp.department_name?.toLowerCase().includes(searchLower)
    );
  }), [offboardedEmployees, searchQuery]);

  const displayedEmployees = useMemo(() =>
    activeTab === "active"
      ? filteredActiveEmployees
      : filteredOffboardedEmployees,
    [activeTab, filteredActiveEmployees, filteredOffboardedEmployees]
  );

  // Memoized animation variants
  const pageVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        when: "beforeChildren",
      },
    },
  }), []);

  const itemVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 260,
        damping: 20,
      },
    },
  }), []);

  if (loading && activeEmployees.length === 0 && offboardedEmployees.length === 0) {
    return (
      <LoadingSpinner
        color="red"
        text="Loading employee data..."
        icon={UserMinus}
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

      {/* Header */}
      <motion.div variants={fadeInUp} className="flex items-center mb-8" data-tutorial="offboarding-header">
        <h1 className="text-2xl font-bold text-foreground-primary flex items-center">
          <UserMinus className="mr-2 h-7 w-7 text-error" />
          Employee Offboarding
        </h1>
      </motion.div>

      {/* Permission Banner */}
      <ModulePermissionsBanner module={PERMISSION_MODULES.OFFBOARDING} title="Offboarding" compact />

      {/* Search and Tabs */}
      <motion.div variants={fadeIn} className="bg-surface-primary rounded-xl shadow-sm mb-6">
        <div className="border-b border-border-primary px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("active")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "active"
                    ? "bg-error text-white"
                    : "bg-background-tertiary dark:bg-surface-secondary text-foreground-secondary hover:bg-surface-hover"
                  }`}
              >
                Active Employees ({activeEmployees.length})
              </button>
              <button
                onClick={() => setActiveTab("offboarded")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "offboarded"
                    ? "bg-error text-white"
                    : "bg-background-tertiary dark:bg-surface-secondary text-foreground-secondary hover:bg-surface-hover"
                  }`}
              >
                Offboarded ({offboardedEmployees.length})
              </button>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-error/10 text-error rounded-lg hover:bg-error/20 transition-colors dark:bg-error/20 dark:hover:bg-error/30"
              disabled={loading}
            >
              <ArrowsClockwise className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-6">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search employees by name, email, designation, or department"
          />
        </div>
      </motion.div>

      {/* Employee List */}
      {displayedEmployees.length === 0 ? (
        <div className="mt-10 bg-error/5 rounded-xl border border-error/20 dark:bg-error/10">
          <EmptyState
            icon={Users}
            title={`No ${activeTab === "active" ? "Active" : "Offboarded"} Employees Found`}
            description={searchQuery
              ? "Try adjusting your search criteria"
              : `There are no ${activeTab === "active" ? "active" : "offboarded"} employees to display.`}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Employee Cards */}
          <motion.div variants={staggerContainer} className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground-primary">
              {activeTab === "active" ? "Active" : "Offboarded"} Employees ({displayedEmployees.length})
            </h2>
            {displayedEmployees.map((emp: OffboardingEmployee) => (
              <motion.div
                key={emp.id}
                variants={itemVariants}
                layout
                whileHover={{
                  y: -4,
                  boxShadow:
                    "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                }}
                className={`bg-surface-primary rounded-xl p-4 shadow-sm border ${selectedEmployee?.id === emp.id
                    ? "border-error ring-2 ring-error/30"
                    : "border-border-primary"
                  } cursor-pointer transition-all`}
                onClick={() => activeTab === "active" && setSelectedEmployee(emp)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-error/10 flex items-center justify-center text-error dark:bg-error/20">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground-primary">
                        {emp.first_name} {emp.last_name}
                      </h3>
                      <p className="text-sm text-foreground-tertiary">{emp.designation}</p>
                    </div>
                  </div>
                  {activeTab === "offboarded" && (
                    <div className={`text-xs font-medium text-white px-2 py-1 rounded-full ${emp.job_status === "Resigned" ? "bg-warning" : "bg-error"
                      }`}>
                      {emp.job_status}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-foreground-secondary">
                    <Envelope className="h-4 w-4" />
                    <span>{emp.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground-secondary">
                    <Phone className="h-4 w-4" />
                    <span>{emp.phone_number}</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground-secondary">
                    <Building className="h-4 w-4" />
                    <span>{emp.department_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground-secondary">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Joined:{" "}
                      {new Date(emp.hire_date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {activeTab === "offboarded" && (
                  <div className="mt-3 pt-3 border-t border-border-primary">
                    <PermissionGate
                      module={PERMISSION_MODULES.OFFBOARDING}
                      action="can_write"
                      fallback={
                        <PermissionTooltip message="You don't have permission to reactivate employees">
                          <button
                            disabled
                            className="w-full bg-gray-300 text-foreground-tertiary rounded-lg px-4 py-2 text-sm font-semibold cursor-not-allowed opacity-60 flex items-center justify-center gap-2"
                          >
                            <ArrowCounterClockwise className="h-4 w-4" />
                            Reactivate Employee
                          </button>
                        </PermissionTooltip>
                      }
                    >
                      <Button
                        className="w-full bg-success hover:bg-success/90 flex items-center justify-center gap-2"
                        onClick={() => handleReactivate(emp.id)}
                        disabled={loading}
                      >
                        <ArrowCounterClockwise className="h-4 w-4" />
                        Reactivate Employee
                      </Button>
                    </PermissionGate>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* Offboarding Form */}
          {activeTab === "active" && (
            <motion.div variants={fadeInUp} className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground-primary">
                Offboarding Details
              </h2>
              {selectedEmployee ? (
                <div className="bg-surface-primary rounded-xl p-6 shadow-sm border border-border-primary space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-border-primary">
                    <div className="shrink-0 w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-error dark:bg-error/20">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground-primary">
                        {selectedEmployee.first_name} {selectedEmployee.last_name}
                      </h3>
                      <p className="text-sm text-foreground-tertiary">
                        {selectedEmployee.designation}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground-secondary mb-2">
                      Offboarding Type
                    </label>
                    <select
                      value={formData.offboarding_type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          offboarding_type: e.target.value as
                            | "Resigned"
                            | "Terminated",
                        })
                      }
                      className="w-full rounded-lg border border-border-secondary bg-surface-primary px-3 py-2 text-foreground-secondary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="Resigned">Resignation</option>
                      <option value="Terminated">Termination</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground-secondary mb-2">
                      Offboarding Date
                    </label>
                    <input
                      type="date"
                      value={formData.offboarding_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          offboarding_date: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-border-secondary bg-surface-primary px-3 py-2 text-foreground-secondary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground-secondary mb-2">
                      Reason for Offboarding *
                    </label>
                    <Textarea
                      placeholder="Please provide the reason for offboarding"
                      value={formData.reason}
                      onChange={(e) =>
                        setFormData({ ...formData, reason: e.target.value })
                      }
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground-secondary mb-2">
                      Additional Notes
                    </label>
                    <Textarea
                      placeholder="Any additional notes or comments"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button
                      className="flex-1 bg-foreground-tertiary hover:bg-surface-hover flex items-center justify-center gap-2"
                      onClick={() => setSelectedEmployee(null)}
                      disabled={loading}
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <PermissionGate
                      module={PERMISSION_MODULES.OFFBOARDING}
                      action="can_write"
                      fallback={
                        <PermissionTooltip message="You don't have permission to offboard employees">
                          <div className="flex-1">
                            <button
                              disabled
                              className="w-full bg-gray-300 text-foreground-tertiary rounded-lg px-4 py-2 text-sm font-semibold cursor-not-allowed opacity-60 flex items-center justify-center gap-2"
                            >
                              <Check className="h-4 w-4" />
                              Confirm Offboarding
                            </button>
                          </div>
                        </PermissionTooltip>
                      }
                    >
                      <Button
                        className="flex-1 bg-error hover:bg-error/90 flex items-center justify-center gap-2"
                        onClick={handleOffboarding}
                        disabled={loading}
                      >
                        <Check className="h-4 w-4" />
                        Confirm Offboarding
                      </Button>
                    </PermissionGate>
                  </div>
                </div>
              ) : (
                <div className="bg-surface-primary rounded-xl p-10 shadow-sm border border-border-primary flex flex-col items-center justify-center text-center">
                  <Warning className="h-12 w-12 text-foreground-tertiary mb-3" />
                  <h3 className="text-lg font-medium text-foreground-secondary mb-2">
                    No Employee Selected
                  </h3>
                  <p className="text-foreground-secondary max-w-sm">
                    Select an employee from the list to begin the offboarding
                    process
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}
