"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { captureSupabaseError } from "@/lib/sentry";
import type { Company } from "@/lib/types/schemas";
import { filterEmployeesBySearch } from "@/lib/utils/user-search";
import { Plus, TrashSimple, ShieldCheck, X, Check, User, Buildings, Calendar, Lightning as Power, Warning as Warning, Star as Crown, CaretDown, MagnifyingGlass } from "@phosphor-icons/react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, StatCard, EmptyState, InlineDeleteConfirm, InlineSpinner, SearchBar } from "@/components/ui";
import { SelectField, TextAreaField } from "@/components/forms";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  designation: string | null;
}

interface Superadmin {
  id?: number;
  user_id: string;
  is_active: boolean;
  granted_at?: string;
  notes?: string;
  employee?: Employee;
}

export default function SuperadminUsersPage() {
  const [superadmins, setSuperadmins] = useState<Superadmin[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [notes, setNotes] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [superadminsResult, companiesResult] = await Promise.all([
        supabase
          .from("superadmins")
          .select("*, employee:employees!superadmins_user_id_fkey1(id, first_name, last_name, email, designation)")
          .order("granted_at", { ascending: false }),
        supabase.from("companies").select("*").order("name"),
      ]);

      if (superadminsResult.data) setSuperadmins(superadminsResult.data);
      if (companiesResult.data) setCompanies(companiesResult.data);
    } catch (error) {
      captureSupabaseError(error as { code?: string; message?: string }, "fetchSuperadmins");
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch employees when company is selected
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!selectedCompany) {
        setEmployees([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("employees")
          .select("id, first_name, last_name, email, designation")
          .eq("company_id", selectedCompany)
          .in("job_status", ['Active', 'Probation']) // Only active employees can become superadmins
          .order("first_name");

        if (error) throw error;
        
        // FunnelSimple out employees who are already superadmins
        const superadminUserIds = superadmins.map(sa => sa.user_id);
        const availableEmployees = (data || []).filter(
          emp => !superadminUserIds.includes(emp.id)
        );
        
        setEmployees(availableEmployees);
      } catch (error) {
        captureSupabaseError(error as { code?: string; message?: string }, "fetchEmployeesForSuperadmin", { companyId: selectedCompany });
        toast.error("Failed to fetch employees");
      }
    };

    fetchEmployees();
  }, [selectedCompany, superadmins]);

  const handleAddSuperadmin = async () => {
    if (!selectedEmployee) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("superadmins").insert([
        {
          user_id: selectedEmployee.id,
          is_active: true,
          notes: notes || null,
        },
      ]);

      if (error) throw error;

      toast.success("Superadmin added successfully");
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      captureSupabaseError(error as { code?: string; message?: string }, "addSuperadmin", { userId: selectedEmployee?.id });
      toast.error("Failed to add superadmin");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSuperadmin = async (id: number) => {
    try {
      const { error } = await supabase.from("superadmins").delete().eq("id", id);
      if (error) throw error;
      toast.success("Superadmin removed successfully");
      setDeleteConfirm(null);
      fetchData();
    } catch (error) {
      captureSupabaseError(error as { code?: string; message?: string }, "removeSuperadmin", { superadminId: id });
      toast.error("Failed to remove superadmin");
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("superadmins")
        .update({ is_active: !currentStatus })
        .eq("id", id);
      if (error) throw error;
      
      setSuperadmins(prev => prev.map(sa => 
        sa.id === id ? { ...sa, is_active: !currentStatus } : sa
      ));
      toast.success(`Superadmin ${!currentStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      captureSupabaseError(error as { code?: string; message?: string }, "toggleSuperadminStatus", { superadminId: id });
      toast.error("Failed to update superadmin status");
    }
  };

  const resetForm = () => {
    setSelectedCompany(null);
    setSelectedEmployee(null);
    setSearchTerm("");
    setNotes("");
    setEmployees([]);
  };

  // FunnelSimple employees based on search term using unified search utility
  const filteredEmployees = filterEmployeesBySearch(
    employees.map(emp => ({
      id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`,
      email: emp.email,
      designation: emp.designation || undefined,
    })),
    searchTerm
  );

  const filteredSuperadmins = superadmins.filter(sa => {
    if (filterActive === "active") return sa.is_active;
    if (filterActive === "inactive") return !sa.is_active;
    return true;
  });

  const stats = {
    total: superadmins.length,
    active: superadmins.filter(sa => sa.is_active).length,
    inactive: superadmins.filter(sa => !sa.is_active).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Superadmin Users"
        description="Manage users with superadmin privileges"
        icon={ShieldCheck}
        iconColor="text-amber-600"
        action={{
          label: "Add Superadmin",
          onClick: () => {
            resetForm();
            setShowModal(true);
          },
          icon: Plus
        }}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setFilterActive("all")}
          className={`bg-surface-primary rounded-xl p-4 shadow-sm border transition-all ${filterActive === "all" ? "border-warning/50 ring-2 ring-warning/20" : "border-border-primary hover:border-border-primary"}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/20 rounded-lg">
              <ShieldCheck size={20} className="text-warning" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold text-foreground-primary">{stats.total}</p>
              <p className="text-xs text-foreground-tertiary">Total Superadmins</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => setFilterActive("active")}
          className={`bg-surface-primary rounded-xl p-4 shadow-sm border transition-all ${filterActive === "active" ? "border-success/50 ring-2 ring-success/20" : "border-border-primary hover:border-border-primary"}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/20 rounded-lg">
              <Power size={20} className="text-success" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold text-foreground-primary">{stats.active}</p>
              <p className="text-xs text-foreground-tertiary">Active</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => setFilterActive("inactive")}
          className={`bg-surface-primary rounded-xl p-4 shadow-sm border transition-all ${filterActive === "inactive" ? "border-border-secondary ring-2 ring-border-primary" : "border-border-primary hover:border-border-primary"}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-background-tertiary dark:bg-surface-secondary rounded-lg">
              <Power size={20} className="text-foreground-tertiary" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold text-foreground-primary">{stats.inactive}</p>
              <p className="text-xs text-foreground-tertiary">Inactive</p>
            </div>
          </div>
        </button>
      </div>

      {/* Superadmins List */}
      {loading ? (
        <div className="bg-surface-primary rounded-xl shadow-sm border border-border-primary p-12">
          <div className="flex flex-col items-center justify-center text-foreground-tertiary">
            <InlineSpinner size="xl" color="amber" className="mb-4" />
            <p>Loading superadmins...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredSuperadmins.map((superadmin) => (
              <motion.div
                key={superadmin.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`bg-surface-primary rounded-xl shadow-sm border overflow-hidden transition-all ${
                  superadmin.is_active ? "border-border-primary hover:border-warning/30" : "border-border-primary opacity-75"
                }`}
              >
                <div className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`p-3 rounded-xl ${superadmin.is_active ? "bg-warning/20" : "bg-background-tertiary dark:bg-surface-secondary"}`}>
                      <Crown size={24} className={superadmin.is_active ? "text-warning" : "text-foreground-tertiary"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground-primary">
                          {superadmin.employee
                            ? `${superadmin.employee.first_name} ${superadmin.employee.last_name}`
                            : "Unknown User"}
                        </h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          superadmin.is_active 
                            ? "bg-success/20 text-success" 
                            : "bg-background-tertiary dark:bg-surface-secondary text-foreground-secondary"
                        }`}>
                          {superadmin.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-foreground-tertiary">
                        {superadmin.employee?.email && (
                          <span className="flex items-center gap-1">
                            <User size={14} className="text-foreground-tertiary" />
                            {superadmin.employee.email}
                          </span>
                        )}
                        {superadmin.employee?.designation && (
                          <span className="flex items-center gap-1">
                            <Buildings size={14} className="text-foreground-tertiary" />
                            {superadmin.employee.designation}
                          </span>
                        )}
                        {superadmin.granted_at && (
                          <span className="flex items-center gap-1">
                            <Calendar size={14} className="text-foreground-tertiary" />
                            Granted {new Date(superadmin.granted_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {superadmin.notes && (
                        <p className="mt-2 text-sm text-foreground-secondary bg-background-secondary rounded-lg p-2">
                          {superadmin.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(superadmin.id!, superadmin.is_active)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${
                        superadmin.is_active
                          ? "bg-background-tertiary dark:bg-surface-secondary text-foreground-secondary hover:bg-surface-hover"
                          : "bg-success/20 text-success hover:bg-success/30"
                      }`}
                    >
                      <Power size={16} />
                      {superadmin.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <InlineDeleteConfirm
                      isConfirming={deleteConfirm === superadmin.id}
                      onConfirm={() => handleRemoveSuperadmin(superadmin.id!)}
                      onCancel={() => setDeleteConfirm(null)}
                      onDelete={() => setDeleteConfirm(superadmin.id!)}
                      size={18}
                      colorScheme="amber"
                      title="Remove superadmin"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {filteredSuperadmins.length === 0 && !loading && (
        <EmptyState
          icon={ShieldCheck}
          title={filterActive !== "all" 
            ? `No ${filterActive} superadmins found`
            : "No superadmins found"}
          description="Grant superadmin privileges to employees who need system-wide access"
          action={{
            label: "Add Superadmin",
            onClick: () => {
              resetForm();
              setShowModal(true);
            }
          }}
        />
      )}

      {/* Add Superadmin Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowModal(false);
              resetForm();
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-primary rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            >
              <div className="p-6 border-b bg-linear-to-r from-warning/10 to-warning/5 dark:from-warning/20 dark:to-warning/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-warning/20 rounded-xl">
                      <ShieldCheck size={24} className="text-warning" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground-primary">Add Superadmin</h2>
                      <p className="text-sm text-foreground-tertiary">Grant superadmin privileges to an employee</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="p-2 hover:bg-surface-primary/50 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Step 1: Select Company */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground-secondary mb-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-warning/20 text-warning rounded-full text-xs font-bold">1</span>
                    Select Company
                  </label>
                  <SelectField
                    value={selectedCompany?.toString() || ""}
                    onChange={(e) => {
                      setSelectedCompany(e.target.value ? parseInt(e.target.value) : null);
                      setSelectedEmployee(null);
                      setSearchTerm("");
                    }}
                    options={[
                      { value: "", label: "Select a company" },
                      ...companies.map((company) => ({
                        value: company.id.toString(),
                        label: company.name
                      }))
                    ]}
                  />
                </div>

                {/* Step 2: Search and Select Employee */}
                <div className={selectedCompany ? "" : "opacity-50 pointer-events-none"}>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground-secondary mb-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-warning/20 text-warning rounded-full text-xs font-bold">2</span>
                    Search and Select Employee
                  </label>
                  
                  {selectedEmployee ? (
                    <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-warning/20 rounded-lg">
                          <User size={20} className="text-warning" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground-primary">
                            {selectedEmployee.first_name} {selectedEmployee.last_name}
                          </p>
                          <p className="text-sm text-foreground-secondary">{selectedEmployee.email}</p>
                          {selectedEmployee.designation && (
                            <p className="text-sm text-foreground-tertiary">{selectedEmployee.designation}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedEmployee(null)}
                        className="p-2 hover:bg-warning/20 rounded-lg transition-colors"
                      >
                        <X size={20} className="text-foreground-tertiary" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <SearchBar
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Search by name, email, or designation..."
                        containerClassName="mb-3"
                      />

                      {searchTerm && (
                        <div className="max-h-60 overflow-y-auto border border-border-primary rounded-xl divide-y divide-border-primary">
                          {filteredEmployees.length > 0 ? (
                            filteredEmployees.map((emp) => {
                              const employee = employees.find(e => e.id === emp.id)!;
                              return (
                                <button
                                  key={employee.id}
                                  onClick={() => {
                                    setSelectedEmployee(employee);
                                    setSearchTerm("");
                                  }}
                                  className="w-full text-left p-4 hover:bg-background-secondary transition-colors flex items-center gap-3"
                                >
                                  <div className="p-2 bg-background-tertiary rounded-lg">
                                    <User size={18} className="text-foreground-secondary" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-foreground-primary">
                                      {employee.first_name} {employee.last_name}
                                    </p>
                                    <p className="text-sm text-foreground-secondary">{employee.email}</p>
                                    {employee.designation && (
                                      <p className="text-sm text-foreground-tertiary">{employee.designation}</p>
                                    )}
                                  </div>
                                </button>
                              );
                            })
                          ) : (
                            <div className="p-6 text-center text-foreground-tertiary">
                              <User size={32} className="mx-auto text-foreground-tertiary mb-2" />
                              <p>No employees found</p>
                            </div>
                          )}
                        </div>
                      )}

                      {!searchTerm && selectedCompany && (
                        <p className="text-sm text-foreground-tertiary text-center py-4">
                          Start typing to search for employees
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Step 3: Notes */}
                <div className={selectedEmployee ? "" : "opacity-50 pointer-events-none"}>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground-secondary mb-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-background-tertiary dark:bg-surface-secondary text-foreground-secondary rounded-full text-xs font-bold">3</span>
                    Notes (Optional)
                  </label>
                  <TextAreaField
                    label=""
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Add any notes about this superadmin grant..."
                  />
                </div>

                {/* Warning */}
                <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-start gap-3">
                  <Warning size={20} className="text-warning shrink-0 mt-0.5" />
                  <div className="text-sm text-warning">
                    <p className="font-medium">Important</p>
                    <p className="mt-1">Superadmin privileges grant full access to all companies and system settings. Only grant to trusted employees.</p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t bg-background-secondary flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2.5 border border-border-secondary rounded-xl hover:bg-background-tertiary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSuperadmin}
                  disabled={saving || !selectedEmployee}
                  className="px-6 py-2.5 bg-linear-to-r from-warning to-warning/80 text-white rounded-xl hover:from-warning/90 hover:to-warning/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <InlineSpinner size="sm" color="white" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      Add Superadmin
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
