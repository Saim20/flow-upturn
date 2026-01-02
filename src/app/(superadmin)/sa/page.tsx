"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { captureSupabaseError } from "@/lib/sentry";
import { ChartBar, Buildings, Users, GlobeHemisphereWest, Factory, Warning as Warning, ArrowRight, Clock, CheckCircle, DeviceMobile, UsersThree, Plus, ClipboardText } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { StatCard, StatCardGrid, EmptyState } from "@/components/ui";

interface Stats {
  companies: number;
  countries: number;
  industries: number;
  superadmins: number;
  pendingApprovals: number;
  pendingDevices: number;
}

interface CompanyStats {
  id: number;
  name: string;
  created_at: string;
  employee_count: number;
  team_count: number;
  pending_devices: number;
}

export default function SuperadminDashboard() {
  const [stats, setStats] = useState<Stats>({
    companies: 0,
    countries: 0,
    industries: 0,
    superadmins: 0,
    pendingApprovals: 0,
    pendingDevices: 0,
  });
  const [companyStats, setCompanyStats] = useState<CompanyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState({
    database: { status: "loading" as "connected" | "error" | "loading", message: "Checking..." },
    auth: { status: "loading" as "connected" | "error" | "loading", message: "Checking..." },
  });

  useEffect(() => {
    fetchStats();
    fetchCompanyStats();
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    // Check database connection by trying a simple query
    try {
      const { error: dbError } = await supabase.from("companies").select("id", { count: "exact", head: true });
      setSystemStatus(prev => ({
        ...prev,
        database: dbError
          ? { status: "error", message: "Connection issue" }
          : { status: "connected", message: "Connected" }
      }));
    } catch {
      setSystemStatus(prev => ({
        ...prev,
        database: { status: "error", message: "Connection failed" }
      }));
    }

    // Check auth by getting current session
    try {
      const { error: authError } = await supabase.auth.getSession();
      setSystemStatus(prev => ({
        ...prev,
        auth: authError
          ? { status: "error", message: "Auth issue" }
          : { status: "connected", message: "Active" }
      }));
    } catch {
      setSystemStatus(prev => ({
        ...prev,
        auth: { status: "error", message: "Auth unavailable" }
      }));
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [
        companiesResult,
        countriesResult,
        industriesResult,
        superadminsResult,
        pendingResult,
        pendingDevicesResult,
      ] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("countries").select("id", { count: "exact", head: true }),
        supabase.from("industries").select("id", { count: "exact", head: true }),
        supabase.from("superadmins").select("id", { count: "exact", head: true }),
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("has_approval", "PENDING"),
        supabase.from("user_devices").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      setStats({
        companies: companiesResult.count || 0,
        countries: countriesResult.count || 0,
        industries: industriesResult.count || 0,
        superadmins: superadminsResult.count || 0,
        pendingApprovals: pendingResult.count || 0,
        pendingDevices: pendingDevicesResult.count || 0,
      });
    } catch (error) {
      captureSupabaseError(error as { code?: string; message?: string }, "fetchDashboardStats");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyStats = async () => {
    try {
      const { data: companies } = await supabase
        .from("companies")
        .select("id, name, created_at")
        .order("name", { ascending: true });

      if (companies) {
        // Fetch employee, team, and pending device counts for each company
        const companiesWithCounts = await Promise.all(
          companies.map(async (company) => {
            const [employeeResult, teamResult] = await Promise.all([
              supabase
                .from("employees")
                .select("id", { count: "exact", head: true })
                .eq("company_id", company.id),
              supabase
                .from("teams")
                .select("id", { count: "exact", head: true })
                .eq("company_id", company.id),
            ]);

            // Get pending devices for this company by joining through employees
            const { data: companyEmployees } = await supabase
              .from("employees")
              .select("id")
              .eq("company_id", company.id);

            let pendingDeviceCount = 0;
            if (companyEmployees && companyEmployees.length > 0) {
              const employeeIds = companyEmployees.map(e => e.id);
              const { count } = await supabase
                .from("user_devices")
                .select("id", { count: "exact", head: true })
                .eq("status", "pending")
                .in("user_id", employeeIds);
              pendingDeviceCount = count || 0;
            }

            return {
              ...company,
              employee_count: employeeResult.count || 0,
              team_count: teamResult.count || 0,
              pending_devices: pendingDeviceCount,
            };
          })
        );
        setCompanyStats(companiesWithCounts);
      }
    } catch (error) {
      captureSupabaseError(error as { code?: string; message?: string }, "fetchCompanyStats");
    }
  };

  const quickActions = [
    {
      label: "Create Company",
      description: "Launch the new company wizard",
      icon: Plus,
      href: "/sa/companies?action=create",
      color: "blue",
    },
    {
      label: "Manage Companies",
      description: "View and edit existing companies",
      icon: Buildings,
      href: "/sa/companies",
      color: "slate",
    },
    {
      label: "Manage Devices",
      description: "Approve or reject device access",
      icon: DeviceMobile,
      href: "/sa/devices",
      color: "emerald",
    },
    {
      label: "Manage Teams",
      description: "Configure team permissions",
      icon: Users,
      href: "/sa/teams",
      color: "violet",
    },
    {
      label: "Manage Countries",
      description: "Add or edit country data",
      icon: GlobeHemisphereWest,
      href: "/sa/countries",
      color: "amber",
    },
    {
      label: "Manage Industries",
      description: "Configure industry options",
      icon: Factory,
      href: "/sa/industries",
      color: "rose",
    },
    {
      label: "Superadmin Users",
      description: "Manage superadmin access",
      icon: ChartBar,
      href: "/sa/users",
      color: "slate",
    },
    {
      label: "Manage Templates",
      description: "Configure company initialization templates",
      icon: ClipboardText,
      href: "/sa/templates",
      color: "blue",
    },
  ];

  const colorClasses: Record<string, { bg: string; hover: string; text: string; border: string }> = {
    blue: { bg: "bg-primary-50 dark:bg-primary-950/30", hover: "hover:bg-primary-100 dark:hover:bg-primary-900/40", text: "text-primary-600 dark:text-primary-400", border: "border-primary-200 dark:border-primary-800" },
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/30", hover: "hover:bg-emerald-100 dark:hover:bg-emerald-900/40", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
    violet: { bg: "bg-purple-50 dark:bg-purple-950/30", hover: "hover:bg-purple-100 dark:hover:bg-purple-900/40", text: "text-purple-600 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800" },
    amber: { bg: "bg-amber-50 dark:bg-amber-950/30", hover: "hover:bg-amber-100 dark:hover:bg-amber-900/40", text: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800" },
    rose: { bg: "bg-rose-50 dark:bg-rose-950/30", hover: "hover:bg-rose-100 dark:hover:bg-rose-900/40", text: "text-rose-600 dark:text-rose-400", border: "border-rose-200 dark:border-rose-800" },
    slate: { bg: "bg-background-tertiary dark:bg-surface-secondary", hover: "hover:bg-surface-hover", text: "text-foreground-secondary", border: "border-border-primary" },
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground-primary">Dashboard</h1>
          <p className="text-foreground-secondary mt-1">Platform overview and management</p>
        </div>

        {(stats.pendingApprovals > 0 || stats.pendingDevices > 0) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4 flex-wrap"
          >
            {stats.pendingApprovals > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-warning/10 border border-warning/30 rounded-lg">
                <Warning size={20} className="text-warning" />
                <span className="text-sm font-medium text-warning">
                  {stats.pendingApprovals} pending employee approval{stats.pendingApprovals !== 1 ? "s" : ""}
                </span>
              </div>
            )}
            {stats.pendingDevices > 0 && (
              <Link href="/sa/devices" className="flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-lg hover:bg-primary-500/20 transition-colors">
                <DeviceMobile size={20} className="text-primary-500" />
                <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                  {stats.pendingDevices} pending device{stats.pendingDevices !== 1 ? "s" : ""}
                </span>
              </Link>
            )}
          </motion.div>
        )}
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-surface-primary rounded-xl shadow-sm border border-border-primary p-5 animate-pulse">
              <div className="h-10 w-10 bg-background-tertiary dark:bg-surface-secondary rounded-lg mb-3"></div>
              <div className="h-4 bg-background-tertiary dark:bg-surface-secondary rounded w-16 mb-2"></div>
              <div className="h-7 bg-background-tertiary dark:bg-surface-secondary rounded w-12"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Link href="/sa/companies">
            <StatCard
              icon={Buildings}
              value={stats.companies}
              label="Companies"
              color="blue"
            />
          </Link>
          <Link href="/sa/devices">
            <StatCard
              icon={DeviceMobile}
              value={stats.pendingDevices}
              label="Pending Devices"
              color="purple"
            />
          </Link>
          <Link href="/sa/countries">
            <StatCard
              icon={GlobeHemisphereWest}
              value={stats.countries}
              label="Countries"
              color="amber"
            />
          </Link>
          <Link href="/sa/industries">
            <StatCard
              icon={Factory}
              value={stats.industries}
              label="Industries"
              color="red"
            />
          </Link>
          <Link href="/sa/users">
            <StatCard
              icon={ChartBar}
              value={stats.superadmins}
              label="Superadmins"
              color="gray"
            />
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-surface-primary rounded-xl shadow-sm border border-border-primary overflow-hidden">
          <div className="p-5 border-b border-border-primary">
            <h2 className="text-lg font-semibold text-foreground-primary">Quick Actions</h2>
            <p className="text-sm text-foreground-tertiary mt-0.5">Common management tasks</p>
          </div>
          <div className="p-5 grid sm:grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const colors = colorClasses[action.color];
              return (
                <Link key={action.href} href={action.href}>
                  <div className={`p-4 rounded-xl border ${colors.border} ${colors.bg} ${colors.hover} transition-all group flex items-start gap-3`}>
                    <div className={`p-2 rounded-lg bg-surface-primary shadow-sm ${colors.text}`}>
                      <Icon size={22} weight="duotone" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground-primary group-hover:text-foreground-secondary flex items-center gap-2">
                        {action.label}
                        <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-sm text-foreground-tertiary mt-0.5 line-clamp-1">{action.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Companies */}
        <div className="bg-surface-primary rounded-xl shadow-sm border border-border-primary overflow-hidden">
          <div className="p-5 border-b border-border-primary flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground-primary">Company Statistics</h2>
              <p className="text-sm text-foreground-tertiary mt-0.5">Employees, teams & pending devices</p>
            </div>
            <Link href="/sa/companies" className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
              Manage
            </Link>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 bg-background-tertiary dark:bg-surface-secondary rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-background-tertiary dark:bg-surface-secondary rounded w-24 mb-1"></div>
                    <div className="h-3 bg-background-tertiary dark:bg-surface-secondary rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : companyStats.length > 0 ? (
            <div className="divide-y divide-border-primary max-h-100 overflow-y-auto">
              {companyStats.map((company) => (
                <div key={company.id} className="p-4 hover:bg-surface-hover transition-colors flex items-center gap-3">
                  <div className="w-10 h-10 bg-linear-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {company.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground-primary truncate">{company.name}</div>
                    <div className="text-xs text-foreground-tertiary flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {company.employee_count} employee{company.employee_count !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <UsersThree size={12} />
                        {company.team_count} team{company.team_count !== 1 ? "s" : ""}
                      </span>
                      {company.pending_devices > 0 && (
                        <span className="flex items-center gap-1 text-warning">
                          <DeviceMobile size={12} />
                          {company.pending_devices} pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8">
              <EmptyState
                icon={Buildings}
                title="No companies yet"
                description="Companies will appear here once created"
              />
            </div>
          )}
        </div>
      </div>

      {/* System Status */}
      <div className="bg-surface-primary rounded-xl shadow-sm border border-border-primary overflow-hidden">
        <div className="p-5 border-b border-border-primary">
          <h2 className="text-lg font-semibold text-foreground-primary">System Status</h2>
        </div>
        <div className="p-5 grid sm:grid-cols-2 gap-4">
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${systemStatus.database.status === "connected"
            ? "bg-success/10 border-success/30"
            : systemStatus.database.status === "error"
              ? "bg-error/10 border-error/30"
              : "bg-background-tertiary border-border-primary"
            }`}>
            <CheckCircle
              size={24}
              weight="fill"
              className={
                systemStatus.database.status === "connected"
                  ? "text-success"
                  : systemStatus.database.status === "error"
                    ? "text-error"
                    : "text-foreground-tertiary animate-pulse"
              }
            />
            <div>
              <p className={`font-medium ${systemStatus.database.status === "connected"
                ? "text-success"
                : systemStatus.database.status === "error"
                  ? "text-error"
                  : "text-foreground-secondary"
                }`}>Database</p>
              <p className={`text-sm ${systemStatus.database.status === "connected"
                ? "text-success/80"
                : systemStatus.database.status === "error"
                  ? "text-error/80"
                  : "text-foreground-tertiary"
                }`}>{systemStatus.database.message}</p>
            </div>
          </div>
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${systemStatus.auth.status === "connected"
            ? "bg-success/10 border-success/30"
            : systemStatus.auth.status === "error"
              ? "bg-error/10 border-error/30"
              : "bg-background-tertiary border-border-primary"
            }`}>
            <CheckCircle
              size={24}
              weight="fill"
              className={
                systemStatus.auth.status === "connected"
                  ? "text-success"
                  : systemStatus.auth.status === "error"
                    ? "text-error"
                    : "text-foreground-tertiary animate-pulse"
              }
            />
            <div>
              <p className={`font-medium ${systemStatus.auth.status === "connected"
                ? "text-success"
                : systemStatus.auth.status === "error"
                  ? "text-error"
                  : "text-foreground-secondary"
                }`}>Authentication</p>
              <p className={`text-sm ${systemStatus.auth.status === "connected"
                ? "text-success/80"
                : systemStatus.auth.status === "error"
                  ? "text-error/80"
                  : "text-foreground-tertiary"
                }`}>{systemStatus.auth.message}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
