"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { captureSupabaseError } from "@/lib/sentry";
import type { Company, Country, Industry } from "@/lib/types/schemas";
import { Plus, Pencil, Buildings, Users, UsersThree, Factory, Globe, Lightning, CurrencyDollar as CurrencyDollar, SquaresFour as TreeStructure, List, SquaresFour as SquaresFour, Gear, CaretUp, CaretDown } from "@phosphor-icons/react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, SearchBar, StatCard, StatCardGrid, EmptyState, InlineDeleteConfirm, InlineSpinner } from "@/components/ui";
import SuperadminFormModal from "@/components/ui/modals/SuperadminFormModal";
import { FormField, SelectField, NumberField, DateField, CheckboxField } from "@/components/forms";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyStats, setCompanyStats] = useState<Record<number, { employees: number; teams: number }>>({});
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    industry_id: "",
    country_id: "",
    live_absent_enabled: false,
    payroll_generation_day: 1,
    fiscal_year_start: "",
    live_payroll_enabled: false,

    has_division: false,
    max_users: 50,
    pay_frequency: "monthly",
    file_size_limit_mb: 10,
    max_device_limit: 3,
  });
  const [codeError, setCodeError] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [companiesResult, countriesResult, industriesResult] = await Promise.all([
        supabase
          .from("companies")
          .select("*, industry:industries(id, name), country:countries(id, name)")
          .order("name"),
        supabase.from("countries").select("*").order("name"),
        supabase.from("industries").select("*").order("name"),
      ]);

      if (companiesResult.data) {
        setCompanies(companiesResult.data as Company[]);

        // Fetch stats for each company
        const stats: Record<number, { employees: number; teams: number }> = {};
        await Promise.all(
          companiesResult.data.map(async (company) => {
            const [employeesCount, teamsCount] = await Promise.all([
              supabase.from("employees").select("id", { count: "exact", head: true }).eq("company_id", company.id),
              supabase.from("teams").select("id", { count: "exact", head: true }).eq("company_id", company.id),
            ]);
            stats[company.id] = {
              employees: employeesCount.count || 0,
              teams: teamsCount.count || 0,
            };
          })
        );
        setCompanyStats(stats);
      }
      if (countriesResult.data) setCountries(countriesResult.data);
      if (industriesResult.data) setIndustries(industriesResult.data);
    } catch (error) {
      captureSupabaseError(error as { code?: string; message?: string }, "fetchCompanies");
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Handle action=create query param
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'create') {
      resetForm();
      setShowModal(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchData]);

  const validateCode = (code: string): string => {
    if (code.length < 9) {
      return "Code must be at least 9 characters";
    }
    if (!/[a-z]/.test(code)) {
      return "Code must contain a lowercase letter";
    }
    if (!/[A-Z]/.test(code)) {
      return "Code must contain an uppercase letter";
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(code)) {
      return "Code must contain a special character";
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateCode(formData.code);
    if (validationError) {
      setCodeError(validationError);
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        name: formData.name,
        code: formData.code,
        industry_id: formData.industry_id ? parseInt(formData.industry_id) : null,
        country_id: formData.country_id ? parseInt(formData.country_id) : null,
        live_absent_enabled: formData.live_absent_enabled,
        payroll_generation_day: formData.payroll_generation_day,
        fiscal_year_start: formData.fiscal_year_start || null,
        live_payroll_enabled: formData.live_payroll_enabled,

        has_division: formData.has_division,
        max_users: formData.max_users,
        pay_frequency: formData.pay_frequency,
        file_size_limit_mb: formData.file_size_limit_mb,
        max_device_limit: formData.max_device_limit,
      };

      if (editingCompany) {
        const { error } = await supabase
          .from("companies")
          .update(dataToSave)
          .eq("id", editingCompany.id);
        if (error) throw error;
        toast.success("Company updated successfully");
      } else {
        const { error } = await supabase.from("companies").insert([dataToSave]);
        if (error) throw error;
        toast.success("Company created successfully");
      }

      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      captureSupabaseError(error as { code?: string; message?: string }, editingCompany ? "updateCompany" : "createCompany");
      toast.error("Failed to save company");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
      toast.success("Company deleted successfully");
      setDeleteConfirm(null);
      fetchData();
    } catch (error) {
      captureSupabaseError(error as { code?: string; message?: string }, "deleteCompany", { companyId: id });
      toast.error("Failed to delete company");
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      code: company.code,
      industry_id: company.industry_id?.toString() || "",
      country_id: company.country_id?.toString() || "",
      live_absent_enabled: company.live_absent_enabled || false,
      payroll_generation_day: company.payroll_generation_day || 1,
      fiscal_year_start: company.fiscal_year_start || "",
      live_payroll_enabled: company.live_payroll_enabled || false,

      has_division: company.has_division || false,
      max_users: company.max_users || 50,
      pay_frequency: company.pay_frequency || "monthly",
      file_size_limit_mb: company.file_size_limit_mb || 10,
      max_device_limit: company.max_device_limit || 3,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingCompany(null);
    setFormData({
      name: "",
      code: "",
      industry_id: "",
      country_id: "",
      live_absent_enabled: false,
      payroll_generation_day: 1,
      fiscal_year_start: "",
      live_payroll_enabled: false,

      has_division: false,
      max_users: 50,
      pay_frequency: "monthly",
      file_size_limit_mb: 10,
      max_device_limit: 3,
    });
    setCodeError("");
  };

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleFeature = async (company: Company, feature: 'live_absent_enabled' | 'live_payroll_enabled' | 'has_division') => {
    try {
      const { error } = await supabase
        .from("companies")
        .update({ [feature]: !company[feature] })
        .eq("id", company.id);
      if (error) throw error;

      setCompanies(prev => prev.map(c =>
        c.id === company.id ? { ...c, [feature]: !c[feature] } : c
      ));
      toast.success("Setting updated");
    } catch (error) {
      captureSupabaseError(error as { code?: string; message?: string }, "toggleCompanyFeature", { companyId: company.id, feature });
      toast.error("Failed to update setting");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Companies"
        description="Manage all companies in the system"
        icon={Buildings}
        iconColor="text-primary-600"
        action={{
          label: "Add Company",
          onClick: () => {
            resetForm();
            setShowModal(true);
          },
          icon: Plus
        }}
      >
        <div className="flex items-center bg-background-tertiary rounded-lg p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-surface-primary shadow text-primary-600 dark:text-primary-400" : "text-foreground-tertiary hover:text-foreground-secondary"}`}
          >
            <SquaresFour size={20} />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-2 rounded-md transition-colors ${viewMode === "table" ? "bg-surface-primary shadow text-primary-600 dark:text-primary-400" : "text-foreground-tertiary hover:text-foreground-secondary"}`}
          >
            <List size={20} />
          </button>
        </div>
      </PageHeader>

      {/* Stats Summary */}
      <StatCardGrid columns={4}>
        <StatCard
          title="Total Companies"
          value={companies.length}
          icon={Buildings}
          iconColor="text-primary-600"
          iconBgColor="bg-blue-100"
        />
        <StatCard
          title="Total Employees"
          value={Object.values(companyStats).reduce((a, b) => a + b.employees, 0)}
          icon={Users}
          iconColor="text-success"
          iconBgColor="bg-success/10"
        />
        <StatCard
          title="Total Teams"
          value={Object.values(companyStats).reduce((a, b) => a + b.teams, 0)}
          icon={UsersThree}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
        />
        <StatCard
          title="Payroll Active"
          value={companies.filter(c => c.live_payroll_enabled).length}
          icon={Lightning}
          iconColor="text-warning"
          iconBgColor="bg-warning/10"
        />
      </StatCardGrid>

      {/* Search */}
      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search companies by name or code..."
      />

      {/* Companies Grid/Table */}
      {loading ? (
        <div className="bg-surface-primary rounded-xl shadow-sm border border-border-primary p-12">
          <div className="flex flex-col items-center justify-center text-foreground-tertiary">
            <InlineSpinner size="xl" color="blue" className="mb-4" />
            <p>Loading companies...</p>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredCompanies.map((company) => (
              <motion.div
                key={company.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-surface-primary rounded-xl shadow-sm border border-border-primary overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground-primary truncate">{company.name}</h3>
                      <p className="text-sm text-foreground-tertiary font-mono">{company.code}</p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleEdit(company)}
                        className="p-2 text-foreground-tertiary hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-lg transition-colors"
                      >
                        <Pencil size={18} />
                      </button>
                      <InlineDeleteConfirm
                        isConfirming={deleteConfirm === company.id}
                        onConfirm={() => handleDelete(company.id)}
                        onCancel={() => setDeleteConfirm(null)}
                        onDelete={() => setDeleteConfirm(company.id)}
                        size={18}
                        colorScheme="blue"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-foreground-secondary mb-4">
                    {company.industry && (
                      <span className="flex items-center gap-1">
                        <Factory size={14} className="text-foreground-tertiary" />
                        {company.industry.name}
                      </span>
                    )}
                    {company.country && (
                      <span className="flex items-center gap-1">
                        <Globe size={14} className="text-foreground-tertiary" />
                        {company.country.name}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 mb-4">
                    <div className="flex-1 bg-background-secondary rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-foreground-primary">{companyStats[company.id]?.employees || 0}</p>
                      <p className="text-xs text-foreground-tertiary">Employees</p>
                    </div>
                    <div className="flex-1 bg-background-secondary rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-foreground-primary">{companyStats[company.id]?.teams || 0}</p>
                      <p className="text-xs text-foreground-tertiary">Teams</p>
                    </div>
                  </div>

                  {/* Feature Toggles */}
                  <button
                    onClick={() => setExpandedCard(expandedCard === company.id ? null : company.id)}
                    className="w-full flex items-center justify-between text-sm text-foreground-tertiary hover:text-foreground-secondary transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      <Gear size={14} />
                      Settings
                    </span>
                    {expandedCard === company.id ? <CaretUp size={14} /> : <CaretDown size={14} />}
                  </button>

                  <AnimatePresence>
                    {expandedCard === company.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 space-y-2">
                          <label className="flex items-center justify-between p-2 bg-background-secondary rounded-lg cursor-pointer hover:bg-background-tertiary transition-colors">
                            <span className="text-sm flex items-center gap-2">
                              <Lightning size={16} className="text-success" />
                              Absent Tracking
                            </span>
                            <input
                              type="checkbox"
                              checked={company.live_absent_enabled}
                              onChange={() => toggleFeature(company, 'live_absent_enabled')}
                              className="rounded border-border-secondary text-primary-600 focus:ring-primary-500"
                            />
                          </label>
                          <label className="flex items-center justify-between p-2 bg-background-secondary rounded-lg cursor-pointer hover:bg-background-tertiary transition-colors">
                            <span className="text-sm flex items-center gap-2">
                              <CurrencyDollar size={16} className="text-primary-600 dark:text-primary-400" />
                              Live Payroll
                            </span>
                            <input
                              type="checkbox"
                              checked={company.live_payroll_enabled}
                              onChange={() => toggleFeature(company, 'live_payroll_enabled')}
                              className="rounded border-border-secondary text-primary-600 focus:ring-primary-500"
                            />
                          </label>
                          <label className="flex items-center justify-between p-2 bg-background-secondary rounded-lg cursor-pointer hover:bg-background-tertiary transition-colors">
                            <span className="text-sm flex items-center gap-2">
                              <TreeStructure size={16} className="text-purple-600 dark:text-purple-400" />
                              Has Divisions
                            </span>
                            <input
                              type="checkbox"
                              checked={company.has_division}
                              onChange={() => toggleFeature(company, 'has_division')}
                              className="rounded border-border-secondary text-primary-600 focus:ring-primary-500"
                            />
                          </label>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Active Features Bar */}
                <div className="px-5 py-2 bg-background-secondary border-t flex flex-wrap gap-1.5">
                  {company.live_absent_enabled && (
                    <span className="px-2 py-0.5 text-xs bg-success/20 text-success rounded-full">Absent</span>
                  )}
                  {company.live_payroll_enabled && (
                    <span className="px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full">Payroll</span>
                  )}
                  {company.has_division && (
                    <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">Divisions</span>
                  )}
                  {!company.live_absent_enabled && !company.live_payroll_enabled && !company.has_division && (
                    <span className="text-xs text-foreground-tertiary">No features enabled</span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-surface-primary rounded-xl shadow-sm border border-border-primary overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-secondary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">Industry</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">Country</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">Stats</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">Features</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-foreground-tertiary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary">
                {filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-background-secondary transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-foreground-primary">{company.name}</div>
                      <div className="text-sm text-foreground-tertiary font-mono">{company.code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground-secondary">
                      {company.industry?.name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground-secondary">
                      {company.country?.name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-3 text-sm">
                        <span className="flex items-center gap-1 text-foreground-secondary">
                          <Users size={14} className="text-foreground-tertiary" />
                          {companyStats[company.id]?.employees || 0}
                        </span>
                        <span className="flex items-center gap-1 text-foreground-secondary">
                          <UsersThree size={14} className="text-foreground-tertiary" />
                          {companyStats[company.id]?.teams || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {company.live_absent_enabled && (
                          <span className="px-2 py-0.5 text-xs bg-success/20 text-success rounded-full">Absent</span>
                        )}
                        {company.live_payroll_enabled && (
                          <span className="px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full">Payroll</span>
                        )}
                        {company.has_division && (
                          <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">Divisions</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(company)}
                          className="p-2 text-foreground-tertiary hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-lg transition-colors"
                        >
                          <Pencil size={18} />
                        </button>
                        <InlineDeleteConfirm
                          isConfirming={deleteConfirm === company.id}
                          onConfirm={() => handleDelete(company.id)}
                          onCancel={() => setDeleteConfirm(null)}
                          onDelete={() => setDeleteConfirm(company.id)}
                          size={18}
                          colorScheme="blue"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCompanies.length === 0 && (
            <EmptyState
              icon={Buildings}
              title="No companies found"
              description={searchTerm ? "Try adjusting your search criteria" : "Get started by creating your first company"}
            />
          )}
        </div>
      )}

      {filteredCompanies.length === 0 && !loading && viewMode === "grid" && (
        <EmptyState
          icon={Buildings}
          title="No companies found"
          description={searchTerm ? "Try adjusting your search criteria" : "Get started by creating your first company"}
          action={!searchTerm ? {
            label: "Add Company",
            onClick: () => {
              resetForm();
              setShowModal(true);
            }
          } : undefined}
        />
      )}

      {/* Modal */}
      <SuperadminFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        onSubmit={handleSubmit}
        title={editingCompany ? "Edit Company" : "Add Company"}
        subtitle={editingCompany ? "Update company details" : "Create a new company"}
        icon={Buildings}
        colorScheme="blue"
        size="lg"
        saving={saving}
        submitDisabled={!!codeError || !formData.name || !formData.code || !formData.industry_id || !formData.country_id}
        submitText={editingCompany ? "Update Company" : "Create Company"}
        isEditing={!!editingCompany}
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Company Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter company name"
          />

          <FormField
            label="Company Code"
            required
            value={formData.code}
            onChange={(e) => {
              const newCode = e.target.value;
              setFormData({ ...formData, code: newCode });
              if (newCode) {
                setCodeError(validateCode(newCode));
              } else {
                setCodeError("");
              }
            }}
            placeholder="e.g., MyCompany@2024"
            error={codeError || (!codeError && formData.code ? undefined : "9+ chars with uppercase, lowercase, and special character")}
          />

          <SelectField
            label="Industry"
            required
            value={formData.industry_id}
            onChange={(e) => setFormData({ ...formData, industry_id: e.target.value })}
            options={[
              { value: "", label: "Select Industry" },
              ...industries.map((industry) => ({
                value: industry.id.toString(),
                label: industry.name
              }))
            ]}
          />

          <SelectField
            label="Country"
            required
            value={formData.country_id}
            onChange={(e) => setFormData({ ...formData, country_id: e.target.value })}
            options={[
              { value: "", label: "Select Country" },
              ...countries.map((country) => ({
                value: country.id.toString(),
                label: country.name
              }))
            ]}
          />

          <NumberField
            name="payroll_generation_day"
            label="Payroll Generation Day"
            min={1}
            max={31}
            value={formData.payroll_generation_day}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setFormData({ ...formData, payroll_generation_day: isNaN(val) ? 0 : val });
            }}
          />

          <DateField
            name="fiscal_year_start"
            label="Fiscal Year Start"
            value={formData.fiscal_year_start}
            onChange={(e) => setFormData({ ...formData, fiscal_year_start: e.target.value })}
          />

          <NumberField
            name="max_users"
            label="Max Users"
            min={1}
            value={formData.max_users}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setFormData({ ...formData, max_users: isNaN(val) ? 0 : val });
            }}
          />

          <SelectField
            label="Pay Frequency"
            required
            value={formData.pay_frequency}
            onChange={(e) => setFormData({ ...formData, pay_frequency: e.target.value })}
            options={[
              { value: "monthly", label: "Monthly" },
              { value: "weekly", label: "Weekly" },
              { value: "bi-weekly", label: "Bi-Weekly" },
              { value: "daily", label: "Daily" }
            ]}
          />

          <NumberField
            name="file_size_limit_mb"
            label="File Size Limit (MB)"
            min={1}
            value={formData.file_size_limit_mb}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setFormData({ ...formData, file_size_limit_mb: isNaN(val) ? 0 : val });
            }}
          />

          <NumberField
            name="max_device_limit"
            label="Max Device Limit"
            min={1}
            value={formData.max_device_limit}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setFormData({ ...formData, max_device_limit: isNaN(val) ? 0 : val });
            }}
          />
        </div>

        <div className="bg-background-secondary rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-medium text-foreground-secondary mb-2">Feature Settings</h3>
          <label className="flex items-center justify-between p-3 bg-surface-primary rounded-lg cursor-pointer hover:bg-background-secondary transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-success/10 dark:bg-success/20 rounded-lg">
                <Lightning size={18} className="text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground-primary">Live Absent Tracking</p>
                <p className="text-xs text-foreground-tertiary">Track employee absences in real-time</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={formData.live_absent_enabled}
              onChange={(e) => setFormData({ ...formData, live_absent_enabled: e.target.checked })}
              className="rounded border-border-secondary text-primary-600 focus:ring-primary-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-surface-primary rounded-lg cursor-pointer hover:bg-background-secondary transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <CurrencyDollar size={18} className="text-primary-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground-primary">Live Payroll</p>
                <p className="text-xs text-foreground-tertiary">Enable live payroll processing</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={formData.live_payroll_enabled}
              onChange={(e) => setFormData({ ...formData, live_payroll_enabled: e.target.checked })}
              className="rounded border-border-secondary text-primary-600 focus:ring-primary-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-surface-primary rounded-lg cursor-pointer hover:bg-background-secondary transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                <TreeStructure size={18} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground-primary">Has Divisions</p>
                <p className="text-xs text-foreground-tertiary">Enable divisional structure</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={formData.has_division}
              onChange={(e) => setFormData({ ...formData, has_division: e.target.checked })}
              className="rounded border-border-secondary text-primary-600 focus:ring-primary-500"
            />
          </label>
        </div>
      </SuperadminFormModal>
    </div>
  );
}
