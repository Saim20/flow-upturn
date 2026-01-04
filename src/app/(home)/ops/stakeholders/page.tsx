"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStakeholders } from "@/hooks/useStakeholders";
import { useAuth } from "@/lib/auth/auth-context";
import { ModulePermissionsBanner, PermissionTooltip } from "@/components/permissions";
import { PERMISSION_MODULES } from "@/lib/constants";
import {
  Plus,
  Eye,
  CheckCircle,
  Clock,
  Download,
  Building,
  User,
  PencilSimple,
  UsersIcon
} from "@phosphor-icons/react";
import Pagination from "@/components/ui/Pagination";
import { exportStakeholdersToCSV } from "@/lib/utils/csv-export";
import { toast } from "sonner";
import { PageHeader, SearchBar, StatCard, StatCardGrid, EmptyState, InlineSpinner } from "@/components/ui";
import { SelectField } from "@/components/forms";
import { Stakeholder } from "@/lib/types/schemas";

export default function OpsStakeholdersPage() {
  const router = useRouter();
  const { canWrite, canRead, employeeInfo } = useAuth();
  const {
    stakeholders,
    leads,
    completedStakeholders,
    loading,
    error,
    searchStakeholders,
  } = useStakeholders();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "Lead" | "Permanent" | "Rejected">("all");
  const [filterKam, setFilterKam] = useState<"all" | "mine">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchResult, setSearchResult] = useState<{
    totalCount: number;
    totalPages: number;
    currentPage: number;
  } | null>(null);

  const pageSize = 25;

  // Track initial load to prevent re-fetching
  const hasInitialized = useRef(false);
  const prevSearchParams = useRef<{ 
    searchTerm: string; 
    currentPage: number; 
    filterStatus: "all" | "Lead" | "Permanent" | "Rejected" 
  }>({ searchTerm: "", currentPage: 1, filterStatus: "all" });

  // Check if current user is a KAM for any stakeholder
  const isKamForAny = useMemo(() => 
    stakeholders.some((s) => s.kam_id === employeeInfo?.id),
    [stakeholders, employeeInfo?.id]
  );

  // Only fetch when search params actually change
  useEffect(() => {
    const paramsChanged = 
      prevSearchParams.current.searchTerm !== searchTerm ||
      prevSearchParams.current.currentPage !== currentPage ||
      prevSearchParams.current.filterStatus !== filterStatus;
    
    if (!paramsChanged && hasInitialized.current) return;
    
    hasInitialized.current = true;
    prevSearchParams.current = { searchTerm, currentPage, filterStatus };

    const loadStakeholders = async () => {
      const result = await searchStakeholders({
        searchQuery: searchTerm,
        page: currentPage,
        pageSize,
        filterStatus,
        includeAllCompany: true,
      });
      setSearchResult(result);
    };

    loadStakeholders();
  }, [searchTerm, currentPage, filterStatus, searchStakeholders]);

  // Memoize filtered stakeholders
  const filteredStakeholders = useMemo(() => 
    filterKam === "mine" && employeeInfo?.id
      ? stakeholders.filter(s => s.kam_id === employeeInfo.id)
      : stakeholders,
    [filterKam, employeeInfo?.id, stakeholders]
  );

  // Memoize stats
  const stats = useMemo(() => {
    const myStakeholders = stakeholders.filter(s => s.kam_id === employeeInfo?.id);
    return {
      myStakeholders,
      myLeads: myStakeholders.filter(s => s.status === "Lead"),
      myPermanent: myStakeholders.filter(s => s.status === "Permanent"),
    };
  }, [stakeholders, employeeInfo?.id]);

  const handleSearch = useCallback((query: string) => {
    setSearchTerm(query);
    setCurrentPage(1);
  }, []);

  const handleFilterChange = useCallback((status: "all" | "Lead" | "Permanent" | "Rejected") => {
    setFilterStatus(status);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const getStepStatusColor = useCallback((status: string) => {
    switch (status) {
      case "Lead":
        return "bg-warning/10 text-warning dark:bg-warning/20";
      case "Permanent":
        return "bg-success/10 text-success dark:bg-success/20";
      case "Rejected":
        return "bg-error/10 text-error dark:bg-error/20";
      default:
        return "bg-info/10 text-info dark:bg-info/20";
    }
  }, []);

  // Memoize the permission check function
  const canEditStakeholder = useCallback((stakeholder: Stakeholder) => {
    if (stakeholder.kam_id === employeeInfo?.id) return true;
    if (canWrite(PERMISSION_MODULES.STAKEHOLDERS)) return true;
    return false;
  }, [employeeInfo?.id, canWrite]);

  const handleExportCSV = useCallback(() => {
    const dataToExport = filterKam === "mine" ? filteredStakeholders : stakeholders;
    if (dataToExport.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      exportStakeholdersToCSV(dataToExport, {
        includeAddress: true,
        includeContactPersons: true,
        includeStatus: true,
        includeProcess: true,
        includeKAM: true,
        includeType: true,
      });
      toast.success(`Exported ${dataToExport.length} stakeholder(s) to CSV`);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("Failed to export data");
    }
  }, [filterKam, filteredStakeholders, stakeholders]);

  // Memoize navigation handler
  const handleViewStakeholder = useCallback((stakeholderId: number) => {
    router.push(`/ops/stakeholders/${stakeholderId}`);
  }, [router]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div data-tutorial="stakeholders-header">
        <PageHeader
          title="Stakeholders"
          description="View and manage your stakeholder relationships"
          icon={Building}
          iconColor="text-primary-600"
          action={canWrite(PERMISSION_MODULES.STAKEHOLDERS) ? {
            label: "Create Lead",
            onClick: () => router.push("/ops/stakeholders/new"),
            icon: Plus
          } : undefined}
        >
          <button
            onClick={handleExportCSV}
            disabled={loading || filteredStakeholders.length === 0}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm bg-success text-white rounded-lg hover:bg-success/90 active:bg-success/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} className="sm:w-4.5 sm:h-4.5" />
            <span>Export</span>
          </button>
        </PageHeader>
      </div>

      {/* Permission Banner */}
      <ModulePermissionsBanner module={PERMISSION_MODULES.STAKEHOLDERS} title="Stakeholders" compact />

      {/* Stats */}
      <StatCardGrid columns={4}>
        <StatCard
          title="Total Stakeholders"
          value={searchResult?.totalCount || 0}
          icon={Building}
          iconColor="text-primary-600"
          iconBgColor="bg-primary-100 dark:bg-primary-900/30"
        />
        <StatCard
          title="Active Leads"
          value={leads.length}
          icon={Clock}
          iconColor="text-warning"
          iconBgColor="bg-warning/10 dark:bg-warning/20"
        />
        <StatCard
          title="Permanent"
          value={completedStakeholders.length}
          icon={CheckCircle}
          iconColor="text-success"
          iconBgColor="bg-success/10 dark:bg-success/20"
        />
        <StatCard
          title="My Stakeholders"
          value={stats.myStakeholders.length}
          icon={User}
          iconColor="text-primary-600"
          iconBgColor="bg-primary-100 dark:bg-primary-900/30"
        />
      </StatCardGrid>

      {/* Filters */}
      <div className="bg-surface-primary rounded-lg border border-border-primary p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          {/* Search */}
          <SearchBar
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search stakeholders..."
            withContainer={false}
          />

          {/* Filter Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Status Filter */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 flex-1">
              <button
                onClick={() => handleFilterChange("all")}
                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filterStatus === "all"
                  ? "bg-primary-600 text-white"
                  : "bg-background-tertiary dark:bg-surface-secondary text-foreground-secondary hover:bg-surface-hover"
                  }`}
              >
                All ({searchResult?.totalCount || 0})
              </button>
              <button
                onClick={() => handleFilterChange("Lead")}
                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filterStatus === "Lead"
                  ? "bg-primary-600 text-white"
                  : "bg-background-tertiary dark:bg-surface-secondary text-foreground-secondary hover:bg-surface-hover"
                  }`}
              >
                Leads ({leads.length})
              </button>
              <button
                onClick={() => handleFilterChange("Permanent")}
                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filterStatus === "Permanent"
                  ? "bg-primary-600 text-white"
                  : "bg-background-tertiary dark:bg-surface-secondary text-foreground-secondary hover:bg-surface-hover"
                  }`}
              >
                Permanent ({completedStakeholders.length})
              </button>
              <button
                onClick={() => handleFilterChange("Rejected")}
                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filterStatus === "Rejected"
                  ? "bg-primary-600 text-white"
                  : "bg-background-tertiary dark:bg-surface-secondary text-foreground-secondary hover:bg-surface-hover"
                  }`}
              >
                Rejected
              </button>
            </div>

            {/* KAM Filter */}
            <SelectField
              name="kamFilter"
              value={filterKam}
              onChange={(e) => {
                setFilterKam(e.target.value as "all" | "mine");
                setCurrentPage(1);
              }}
              options={[
                { value: "all", label: "All Stakeholders" },
                { value: "mine", label: `My Stakeholders (${stats.myStakeholders.length})` },
              ]}
              containerClassName="w-full sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-error/10 border border-error/30 text-error dark:bg-error/20 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && stakeholders.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <InlineSpinner size="lg" color="blue" />
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredStakeholders.length === 0 && (
        <EmptyState
          icon={Building}
          title="No stakeholders found"
          description={
            searchTerm || filterKam === "mine"
              ? "Try adjusting your search or filters"
              : "No stakeholders have been created yet"
          }
        />
      )}

      {/* Stakeholder List */}
      {!loading && filteredStakeholders.length > 0 && (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-surface-primary rounded-lg border border-border-primary overflow-hidden">
            <table className="w-full">
              <thead className="bg-background-secondary dark:bg-background-tertiary border-b border-border-primary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">
                    KAM
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">
                    Process
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">
                    Current Step
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-foreground-tertiary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary">
                {filteredStakeholders.map((stakeholder) => (
                  <tr
                    key={stakeholder.id}
                    className="hover:bg-background-secondary dark:hover:bg-background-tertiary transition-colors cursor-pointer"
                    onClick={() => handleViewStakeholder(stakeholder.id!)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div>
                          <div className="font-medium text-foreground-primary">{stakeholder.name}</div>
                          {stakeholder.address && (
                            <div className="text-sm text-foreground-tertiary line-clamp-1">
                              {stakeholder.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground-primary">
                      {stakeholder.stakeholder_type ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                          {stakeholder.stakeholder_type.name}
                        </span>
                      ) : (
                        <span className="text-foreground-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {stakeholder.kam ? (
                        <div className="flex items-center gap-2">
                          <span className={`text-foreground-primary ${stakeholder.kam_id === employeeInfo?.id ? 'font-semibold' : ''}`}>
                            {stakeholder.kam.name}
                          </span>
                          {stakeholder.kam_id === employeeInfo?.id && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                              You
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-foreground-tertiary">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground-primary">
                      {stakeholder.process?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      {stakeholder.status === 'Permanent' || stakeholder.is_completed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success dark:bg-success/20">
                          <CheckCircle size={14} />
                          Complete
                        </span>
                      ) : stakeholder.status === 'Rejected' ? (
                        <span className="text-sm text-foreground-tertiary">—</span>
                      ) : stakeholder.current_step ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-info/10 text-info dark:bg-info/20">
                            Step {stakeholder.current_step.step_order}: {stakeholder.current_step.name}
                          </span>
                          {(() => {
                            // Find step data for current step and extract status
                            const currentStepData = stakeholder.step_data?.find(
                              (sd) => sd.step_id === stakeholder.current_step_id
                            );
                            const stepStatus = currentStepData?.data?.["__step_status"];

                            if (stepStatus && stakeholder.current_step?.status_field?.enabled) {
                              const statusOption = stakeholder.current_step.status_field.options?.find(
                                opt => opt.value === stepStatus
                              );
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success dark:bg-success/20">
                                  {statusOption?.label || stepStatus}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      ) : (
                        <span className="text-sm text-foreground-tertiary">Not started</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStepStatusColor(
                          stakeholder.status
                        )}`}
                      >
                        {stakeholder.status === 'Lead' && <Clock size={14} />}
                        {stakeholder.status === 'Permanent' && <CheckCircle size={14} />}
                        {stakeholder.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground-tertiary">
                      {stakeholder.created_at
                        ? new Date(stakeholder.created_at).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewStakeholder(stakeholder.id!);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950 rounded transition-colors"
                        >
                          <Eye size={16} />
                          View
                        </button>
                        {canEditStakeholder(stakeholder) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/ops/stakeholders/${stakeholder.id}/edit`);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 text-sm text-foreground-secondary hover:bg-surface-hover rounded transition-colors"
                          >
                            <PencilSimple size={16} />
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {searchResult && searchResult.totalPages > 1 && (
              <Pagination
                currentPage={searchResult.currentPage}
                totalPages={searchResult.totalPages}
                totalCount={searchResult.totalCount}
                pageSize={pageSize}
                onPageChange={handlePageChange}
              />
            )}
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-2.5">
            {filteredStakeholders.map((stakeholder) => (
              <div
                key={stakeholder.id}
                onClick={() => handleViewStakeholder(stakeholder.id!)}
                className="bg-surface-primary rounded-lg border border-border-primary p-3 space-y-2.5 active:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground-primary truncate">{stakeholder.name}</h3>
                    {stakeholder.address && (
                      <p className="text-xs text-foreground-tertiary mt-0.5 line-clamp-1">{stakeholder.address}</p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 leading-tight ${getStepStatusColor(
                      stakeholder.status
                    )}`}
                  >
                    {stakeholder.status === 'Lead' && <Clock size={10} />}
                    {stakeholder.status === 'Permanent' && <CheckCircle size={10} />}
                    {stakeholder.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground-tertiary text-[10px] uppercase tracking-wide mb-0.5">Type</p>
                      {stakeholder.stakeholder_type ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                          {stakeholder.stakeholder_type.name}
                        </span>
                      ) : (
                        <p className="text-foreground-tertiary">—</p>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground-tertiary text-[10px] uppercase tracking-wide mb-0.5">KAM</p>
                      {stakeholder.kam ? (
                        <div className="flex items-center gap-1">
                          <span className={`text-foreground-primary truncate ${stakeholder.kam_id === employeeInfo?.id ? 'font-semibold' : ''}`}>
                            {stakeholder.kam.name}
                          </span>
                          {stakeholder.kam_id === employeeInfo?.id && (
                            <span className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                              You
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-foreground-tertiary">Unassigned</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-foreground-tertiary text-[10px] uppercase tracking-wide mb-0.5">Process</p>
                    <p className="text-foreground-primary truncate">{stakeholder.process?.name || "N/A"}</p>
                  </div>

                  <div>
                    <p className="text-foreground-tertiary text-[10px] uppercase tracking-wide mb-0.5">Current Step</p>
                    {stakeholder.status === 'Permanent' || stakeholder.is_completed ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-success/10 text-success dark:bg-success/20">
                        <CheckCircle size={10} />
                        Complete
                      </span>
                    ) : stakeholder.status === 'Rejected' ? (
                      <p className="text-foreground-tertiary">—</p>
                    ) : stakeholder.current_step ? (
                      <div className="flex flex-wrap gap-1">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-info/10 text-info dark:bg-info/20">
                          Step {stakeholder.current_step.step_order}: {stakeholder.current_step.name}
                        </span>
                        {(() => {
                          const currentStepData = stakeholder.step_data?.find(
                            (sd) => sd.step_id === stakeholder.current_step_id
                          );
                          const stepStatus = currentStepData?.data?.["__step_status"];

                          if (stepStatus && stakeholder.current_step?.status_field?.enabled) {
                            const statusOption = stakeholder.current_step.status_field.options?.find(
                              opt => opt.value === stepStatus
                            );
                            return (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-success/10 text-success dark:bg-success/20">
                                {statusOption?.label || stepStatus}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    ) : (
                      <p className="text-foreground-tertiary">Not started</p>
                    )}
                  </div>

                  <div>
                    <p className="text-foreground-tertiary text-[10px] uppercase tracking-wide mb-0.5">Created</p>
                    <p className="text-foreground-primary">
                      {stakeholder.created_at
                        ? new Date(stakeholder.created_at).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewStakeholder(stakeholder.id!);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-primary-600 bg-primary-50 dark:bg-primary-950 rounded-lg active:bg-primary-100 dark:active:bg-primary-900 transition-colors font-medium"
                  >
                    <Eye size={14} />
                    View
                  </button>
                  {canEditStakeholder(stakeholder) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/ops/stakeholders/${stakeholder.id}/edit`);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-foreground-secondary bg-surface-secondary rounded-lg active:bg-surface-hover transition-colors font-medium"
                    >
                      <PencilSimple size={14} />
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Mobile Pagination */}
            {searchResult && searchResult.totalPages > 1 && (
              <div className="pt-1">
                <Pagination
                  currentPage={searchResult.currentPage}
                  totalPages={searchResult.totalPages}
                  totalCount={searchResult.totalCount}
                  pageSize={pageSize}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
