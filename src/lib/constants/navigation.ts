/**
 * Navigation Constants
 * Shared navigation items for operations, admin pages, and global search
 */

import {
  ClipboardText, // Task
  ChartBar, // Project
  SignIn, // Attendance
  CalendarX, // Leave
  Bell, // Notice
  Clipboard, // Requisition
  CurrencyDollar, // Settlement/Transaction
  WarningCircle, // Complaint
  UserPlus, // Onboarding
  UserMinus, // Offboarding
  Users, // Teams/HRIS
  CreditCard, // Payroll
  Building, // Stakeholder
  Gear, // Basic Settings
  GearSix, // Advanced Settings
  GitBranch, // Stakeholder Process
  Download, // Data Export
  Briefcase, // Operations
  Icon,
} from "@phosphor-icons/react";

// ==============================================================================
// Navigation Item Types
// ==============================================================================

export interface NavigationItem {
  name: string;
  path: string;
  icon: Icon;
  description: string;
  iconColor: string;
  keywords?: string[];
}

export interface NavigationSection {
  title: string;
  description: string;
  items: NavigationItem[];
}

// ==============================================================================
// Icon Colors - Reusable color classes for navigation icons
// ==============================================================================

export const ICON_COLORS = {
  // Primary colors
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  
  // Accent colors
  teal: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  
  // Semantic colors
  success: "bg-success/10 text-success dark:bg-success/20",
  error: "bg-error/10 text-error dark:bg-error/20",
} as const;

// ==============================================================================
// Operations Navigation Items
// ==============================================================================

export const OPS_WORKFLOW_ITEMS: NavigationItem[] = [
  {
    name: "Task",
    path: "/ops/tasks",
    icon: ClipboardText,
    description: "Assign, track and manage day-to-day tasks",
    iconColor: ICON_COLORS.indigo,
    keywords: ["task", "todo", "work", "assign"],
  },
  {
    name: "Project",
    path: "/ops/project",
    icon: ChartBar,
    description: "Plan and execute complex projects with milestones",
    iconColor: ICON_COLORS.blue,
    keywords: ["project", "milestone", "plan"],
  },
];

export const OPS_SERVICES_ITEMS: NavigationItem[] = [
  {
    name: "Attendance",
    path: "/ops/attendance?tab=today",
    icon: SignIn,
    description: "Track and manage your daily attendance",
    iconColor: ICON_COLORS.success,
    keywords: ["attendance", "check-in", "check-out", "time"],
  },
  {
    name: "Leave",
    path: "/ops/leave?tab=apply",
    icon: CalendarX,
    description: "Apply and manage time off and leaves",
    iconColor: ICON_COLORS.blue,
    keywords: ["leave", "vacation", "time off", "holiday"],
  },
  {
    name: "Notice",
    path: "/ops/notice",
    icon: Bell,
    description: "Important company announcements and notices",
    iconColor: ICON_COLORS.amber,
    keywords: ["notice", "announcement", "news"],
  },
  {
    name: "Requisition",
    path: "/ops/requisition?tab=create",
    icon: Clipboard,
    description: "Request equipment, supplies and services",
    iconColor: ICON_COLORS.cyan,
    keywords: ["requisition", "request", "equipment", "supplies"],
  },
  {
    name: "Settlement",
    path: "/ops/settlement?tab=create",
    icon: CurrencyDollar,
    description: "Manage and track expense reimbursements",
    iconColor: ICON_COLORS.emerald,
    keywords: ["settlement", "expense", "reimbursement", "money"],
  },
  {
    name: "Complaint",
    path: "/ops/complaint",
    icon: WarningCircle,
    description: "Submit and track workplace issues and concerns",
    iconColor: ICON_COLORS.error,
    keywords: ["complaint", "issue", "concern", "problem"],
  },
  {
    name: "Payroll",
    path: "/ops/payroll",
    icon: CreditCard,
    description: "View payroll history and manage salary information",
    iconColor: ICON_COLORS.indigo,
    keywords: ["payroll", "salary", "payment", "wage"],
  },
  {
    name: "Stakeholders",
    path: "/ops/stakeholders",
    icon: Building,
    description: "View and manage stakeholder relationships",
    iconColor: ICON_COLORS.purple,
    keywords: ["stakeholder", "client", "vendor", "partner", "kam"],
  },
  {
    name: "Tickets",
    path: "/ops/stakeholder-issues",
    icon: Building,
    description: "Manage tickets assigned to you",
    iconColor: ICON_COLORS.purple,
    keywords: ["stakeholder", "issue", "problem", "ticket"],
  },
];

export const OPS_OPERATIONS_ITEMS: NavigationItem[] = [
  {
    name: "Onboarding",
    path: "/ops/onboarding",
    icon: UserPlus,
    description: "Employee onboarding workflow and tasks",
    iconColor: ICON_COLORS.purple,
    keywords: ["onboarding", "new employee", "hire"],
  },
  {
    name: "Offboarding",
    path: "/ops/offboarding",
    icon: UserMinus,
    description: "Employee offboarding workflow and tasks",
    iconColor: ICON_COLORS.error,
    keywords: ["offboarding", "exit", "leaving"],
  },
  {
    name: "HRIS",
    path: "/ops/hris",
    icon: Users,
    description: "Human Resource Information System",
    iconColor: ICON_COLORS.blue,
    keywords: ["hris", "hr", "employee", "human resource"],
  },
];

export const OPS_SECTIONS: NavigationSection[] = [
  {
    title: "Workflow",
    description: "Manage tasks, projects and work processes",
    items: OPS_WORKFLOW_ITEMS,
  },
  {
    title: "Services",
    description: "Essential everyday services for employees",
    items: OPS_SERVICES_ITEMS,
  },
  {
    title: "Operations",
    description: "Processes for company operations and management",
    items: OPS_OPERATIONS_ITEMS,
  },
];

// Flattened list of all ops items for search
export const ALL_OPS_ITEMS: NavigationItem[] = [
  ...OPS_WORKFLOW_ITEMS,
  ...OPS_SERVICES_ITEMS,
  ...OPS_OPERATIONS_ITEMS,
];

// ==============================================================================
// Admin Navigation Items
// ==============================================================================

export const ADMIN_CONFIG_ITEMS: NavigationItem[] = [
  {
    name: "Basic Settings",
    path: "/admin/config/basic",
    icon: Gear,
    description: "General company information and essential settings",
    iconColor: ICON_COLORS.blue,
    keywords: ["settings", "config", "company", "basic"],
  },
  {
    name: "Advanced Settings",
    path: "/admin/config/advanced",
    icon: GearSix,
    description: "Configure system-wide and granular settings",
    iconColor: ICON_COLORS.indigo,
    keywords: ["settings", "advanced", "system"],
  },
  {
    name: "Payroll",
    path: "/admin/config/payroll",
    icon: CreditCard,
    description: "Manage salary structures, deductions, and payment rules",
    iconColor: ICON_COLORS.success,
    keywords: ["payroll", "salary", "config"],
  },
  {
    name: "Teams",
    path: "/admin/config/teams",
    icon: Users,
    description: "Manage teams and assign granular permissions",
    iconColor: ICON_COLORS.violet,
    keywords: ["teams", "permissions", "access"],
  },
  {
    name: "Stakeholder Process",
    path: "/admin/config/stakeholder-process",
    icon: GitBranch,
    description: "Manage workflow processes for stakeholders and leads",
    iconColor: ICON_COLORS.teal,
    keywords: ["stakeholder", "workflow", "process"],
  },
  {
    name: "Data Export",
    path: "/admin/data-export",
    icon: Download,
    description: "Export HRIS and stakeholder data to CSV format",
    iconColor: ICON_COLORS.emerald,
    keywords: ["export", "data", "csv", "download"],
  },
];

export const ADMIN_LOG_ITEMS: NavigationItem[] = [
  {
    name: "Task",
    path: "/admin/logs/tasks",
    icon: ClipboardText,
    description: "View historical records for task management",
    iconColor: ICON_COLORS.indigo,
    keywords: ["task", "log", "history"],
  },
  {
    name: "Project",
    path: "/admin/logs/project",
    icon: ChartBar,
    description: "View historical records for project tracking",
    iconColor: ICON_COLORS.blue,
    keywords: ["project", "log", "history"],
  },
  {
    name: "Attendance",
    path: "/admin/logs/attendance",
    icon: SignIn,
    description: "Review historical check-in and check-out data",
    iconColor: ICON_COLORS.success,
    keywords: ["attendance", "log", "history"],
  },
  {
    name: "Leave",
    path: "/admin/logs/leave",
    icon: CalendarX,
    description: "Review all past and pending leave requests",
    iconColor: ICON_COLORS.blue,
    keywords: ["leave", "log", "history"],
  },
  {
    name: "Notice",
    path: "/admin/logs/notice",
    icon: Bell,
    description: "Archive and history of all published company notices",
    iconColor: ICON_COLORS.amber,
    keywords: ["notice", "log", "history"],
  },
  {
    name: "Requisition",
    path: "/admin/logs/requisition",
    icon: Clipboard,
    description: "History of all equipment/supply requisition requests",
    iconColor: ICON_COLORS.cyan,
    keywords: ["requisition", "log", "history"],
  },
  {
    name: "Complaint",
    path: "/admin/logs/complaint",
    icon: WarningCircle,
    description: "Archive of all submitted workplace complaints",
    iconColor: ICON_COLORS.error,
    keywords: ["complaint", "log", "history"],
  },
  {
    name: "Stakeholder",
    path: "/admin/stakeholders",
    icon: Building,
    description: "Records of all stakeholders and leads",
    iconColor: ICON_COLORS.purple,
    keywords: ["stakeholder", "log", "history"],
  },
  {
    name: "Tickets",
    path: "/admin/logs/stakeholder-issues",
    icon: Building,
    description: "View all tickets across the organization",
    iconColor: ICON_COLORS.purple,
    keywords: ["stakeholder", "issue", "log", "history", "problem", "ticket"],
  },
  {
    name: "Transaction",
    path: "/admin/transaction",
    icon: CurrencyDollar,
    description: "Define and manage financial transaction types and flows",
    iconColor: ICON_COLORS.emerald,
    keywords: ["transaction", "finance", "money"],
  },
];

export const ADMIN_SECTIONS: NavigationSection[] = [
  {
    title: "Company Configurations",
    description: "Manage core company settings and rules",
    items: ADMIN_CONFIG_ITEMS,
  },
  {
    title: "Company Logs",
    description: "View system records, audit trails, and historical data",
    items: ADMIN_LOG_ITEMS,
  },
];

// Flattened list of all admin items for search
export const ALL_ADMIN_ITEMS: NavigationItem[] = [
  ...ADMIN_CONFIG_ITEMS,
  ...ADMIN_LOG_ITEMS,
];

// ==============================================================================
// Page Icons
// ==============================================================================

export const PAGE_ICONS = {
  operations: Briefcase,
  admin: Gear,
} as const;
