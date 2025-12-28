/**
 * Type definitions to replace Zod schemas
 */

import { SCHOOLING_TYPES, SchoolingType as ConstantsSchoolingType } from '@/lib/constants';

export const schoolingTypes = Object.values(SCHOOLING_TYPES);

export type SchoolingType = ConstantsSchoolingType;

export interface Schooling {
  type: SchoolingType;
  name: string;
  institute: string;
  from_date: string;
  to_date: string;
  result: string;
  attachments?: string[];
  id?: number;
  employee_id?: string;
  company_id?: number;
}

export interface Leave {
  id?: number;
  type_id?: number;
  start_date: string;
  end_date: string;
  remarks?: string;
  status: string;
  approved_by_id?: string;
  employee_id?: string;
  requested_to?: string;
  company_id?: number;
  description?: string;
}

export interface Experience {
  company_name: string;
  designation: string;
  from_date: string;
  to_date: string;
  description?: string;
  employee_id?: string;
  company_id?: number;
  id?: number;
}

export interface Lineage {
  name: string;
  hierarchical_level: number;
  position_id: number;
  company_id?: number;
  id?: number;
}

export interface Site {
  id?: number;
  name: string;
  longitude: number;
  latitude: number;
  check_in: string;
  check_out: string;
  location: string;
  company_id?: number;
}

export interface LeaveType {
  id?: number;
  name: string;
  annual_quota: number;
  company_id?: number;
}

export interface HolidayConfig {
  start_day: string;
  end_day: string;
  id?: number;
  name: string;
  date: string;
  company_id?: number;
}

export interface WeeklyHolidayConfig {
  id?: number;
  day: number;
  company_id?: number;
}

export interface RequisitionType {
  id?: number;
  name: string;
  company_id?: number;
}

export interface NoticeType {
  id?: number;
  name: string;
  company_id?: number;
}

/**
 * Standard Employee interface for consistent employee data across the application.
 * Use this for all employee selections, listings, and references.
 */
export interface Employee {
  id: string;
  name: string;
  email: string;
  department?: string;
  designation?: string;
}

export interface ComplaintsType {
  id?: number;
  name: string;
  company_id?: number;
}

export interface RequisitionInventory {
  id?: number;
  name: string;
  requisition_category_id?: number;
  description?: string;
  asset_owner: string;
  quantity: number;
  company_id?: number;
  department_id?: number;
}

export interface ClaimType {
  id?: number;
  settlement_item: string;
  allowance: number;
  settlement_level_id?: number;
  settler_id: string;
  company_id?: number;
}

export interface Project {
  id?: string;
  project_title: string;
  description?: string;
  start_date: string;
  end_date: string;
  project_lead_id: string;
  remark?: string;
  department_ids?: number[];
  goal?: string;
  progress?: number | null;
  status: string;
  company_id?: number;
  assignees?: string[];
  created_by?: string;
  created_at?: string;
}

export interface Milestone {
  id?: number;
  milestone_title: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: string;
  weightage: number;
  project_id?: string;
  company_id?: number;
  assignees?: string[];
}

export interface Comment {
  id?: number;
  comment: string;
  commenter_id: string;
  project_id?: string;
  company_id?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface Task {
  id?: string;
  task_title: string;
  task_description: string;
  start_date: string;
  end_date: string;
  priority: "low" | "normal" | "high" | "urgent";
  project_id?: string;
  milestone_id?: number;
  assignees: string[];
  department_id?: number;
  status?: boolean;
  company_id?: number;
  created_at?: Date;
  updated_at?: Date;
  created_by?: string;
}

export type RequisitionStatus = "Pending" | "Approved" | "Rejected";

export interface Requisition {
  id?: number;
  requisition_category_id?: number;
  employee_id?: string;
  item_id?: number;
  asset_owner?: string;
  description?: string;
  quantity: number;
  approved_by_id?: string;
  status: RequisitionStatus;
  company_id?: number;
  date: string;
  is_one_off: boolean;
  from_time?: string;
  to_time?: string;
  attachments?: string[];
  comment?: string;
  remark?: string;
}

export interface SettlementRecord {
  id?: number;
  settlement_type_id?: number;
  description?: string;
  event_date: string;
  amount: number;
  comment?: string;
  status: string;
  approved_by_id?: string;
  claimant_id?: string;
  requested_to?: string;
  company_id?: string;
  in_advance?: boolean;
  attachments?: string[];
  attachment_download_urls?: string[];
}

export interface ComplaintRecord {
  id?: number;
  complaint_type_id?: number;
  complainer_id: string;
  resolved_by_id?: string;
  requested_to?: string;
  description: string;
  status: string;
  comment?: string;
  company_id?: number;
  anonymous?: boolean;
  against_whom: string;
  attachments?: string[];
  attachment_download_urls?: string[];
  department_id?: number;
}

export interface Notice {
  id?: number;
  notice_type_id?: number;
  title: string;
  description: string;
  urgency: "low" | "normal" | "high" | "urgent";
  valid_from: string;
  valid_till: string;
  company_id?: number;
  department_id?: number;
  created_by?: string;
  created_at?: string;
}

// Notification System Interfaces (separate from Notice system)
export interface NotificationType {
  id?: number;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  company_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Notification {
  id?: number;
  title: string;
  message: string;
  type_id?: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  recipient_id: string[];
  sender_id?: string;
  is_read: boolean;
  read_at?: string;
  action_url?: string;
  metadata?: Record<string, any>;
  context?: string;
  reference_id?: number;
  reference_table?: string;
  company_id: number;
  department_id?: number;
  expires_at?: string;
  scheduled_for?: string;
  created_at?: string;
  updated_at?: string;
  // Joined data from notification_types
  type?: NotificationType;
}

export interface NotificationPreferences {
  id?: number;
  employee_id: string;
  company_id: number;
  email_enabled: boolean;
  push_enabled: boolean;
  notification_types: Record<string, any>;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Attendance {
  id?: number;
  attendance_date: string;
  tag: string;
  company_id?: number;
  site_id?: number;
  check_in_time?: string;
  check_in_coordinates?: {
    x: number;
    y: number;
  };
  check_out_time?: string;
  check_out_coordinates?: {
    x: number;
    y: number;
  };
  supervisor_id?: string;
  employee_id: string;
}

export interface Division {
  id?: number;
  name: string;
  head_id?: string;
  company_id?: number | string;
  created_at?: string;
}

export interface Department {
  id?: number;
  name: string;
  head_id?: string;
  description?: string;
  division_id?: number;
  company_id?: string | number;
}

export interface Position {
  id?: number;
  name: string;
  description?: string;
  department_id?: number;
  grade?: number;
  company_id?: string | number;
}

export interface Grade {
  id?: number;
  name: string;
  company_id?: number;
}

export interface CompanyBasics {
  company_name: string;
  company_id?: string;
  industry_id: string;
  country_id: string;
  // Operations Settings
  live_absent_enabled: boolean;
  fiscal_year_start: string; // Date format: YYYY-MM-DD (e.g., "2024-01-01")
  max_device_limit?: number;
  max_users?: number;
}

export interface BasicInfo {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  department_id: number;
  designation: string;
  job_status: string;
  hire_date: string;
  id_input: string;
  basic_salary?: number; // Added for admin/manager editable salary
  supervisor_id?: string | null; // Supervisor employee ID
}

export interface PersonalInfo {
  id?: number;
  gender?: string;
  religion?: string;
  blood_group?: string;
  marital_status?: string;
  nid_no?: string;
  father_name?: string;
  mother_name?: string;
  spouse_name?: string;
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_phone?: string;
  permanent_address?: string;
  date_of_birth?: string;
}

export interface OnboardingFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  department_id: number | null;
  designation: string;
  job_status: string;
  hire_date: string;
  company_name: string;
  company_id: number;
  supervisor_id: string | null;
  basic_salary?: number; // Added for salary management
  // Device information for automatic approval
  device_id?: string;
  device_info?: string;
  device_browser?: string;
  device_os?: string;
  device_type?: string;
  device_model?: string;
  device_user_agent?: string;
  device_location?: string;
}

// Account System Interface
export type AccountStatus = "Complete" | "Pending";
export type PaymentMethod = "Cash" | "Bank" | string; // String allows free text

export interface Account {
  id?: number;
  title: string;
  method?: string | null; // Nullable dropdown
  company_id: number;
  status: AccountStatus;
  from_source: string; // Renamed from 'from' to avoid conflicts
  transaction_date: string; // ISO date string
  amount: number; // Supports negative values for expenses
  currency: string; // Default BDT, but allows free text
  additional_data?: Record<string, any>; // JSONB data
  stakeholder_id?: number | null; // Reference to stakeholder for tracking activities
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  // Joined data from stakeholder
  stakeholder?: {
    id: number;
    name: string;
    address?: string;
    is_completed?: boolean;
  };
}

// Payroll System Interfaces
export interface PayrollAdjustment {
  type: string;
  amount: number; // positive for additions, negative for deductions
}

export interface Payroll {
  id?: number;
  employee_id: string;
  basic_salary: number; // snapshot of the basic salary
  adjustments: PayrollAdjustment[]; // JSON array
  total_amount: number;
  generation_date: string;
  company_id: number;
  status: 'Paid' | 'Pending' | 'Published'; // Updated: 'Adjusted' -> 'Published'
  supervisor_id: string;
  created_at?: string;
  updated_at?: string;
}

// ==============================================================================
// Stakeholder Management System (Process-Based)
// ==============================================================================

// Stakeholder Type - categorization of stakeholders
export interface StakeholderType {
  id?: number;
  name: string;
  description?: string;
  company_id: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

// Contact Person for Stakeholder
export interface ContactPerson {
  name: string;
  phone: string;
  email: string;
}

// Field definition types for process steps
export type FieldType = 'text' | 'number' | 'boolean' | 'date' | 'file' | 'geolocation' | 'dropdown' | 'multi_select' | 'calculated';

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  message?: string;
  min?: number; // For number fields
  max?: number; // For number fields
}

// Dropdown option for dropdown and multi_select field types
export interface DropdownOption {
  label: string;
  value: string;
  // Nested field definitions for this option (for multi_select)
  nested?: FieldDefinition[];
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  validation?: FieldValidation;
  placeholder?: string;
  helpText?: string;
  // For dropdown and multi_select field types
  options?: DropdownOption[];
  // Nested field definitions for all field types
  nested?: FieldDefinition[];
  // For calculated field type
  formula?: string; // Excel-like formula (e.g., "Step1.price * Step2.quantity")
  referencedFields?: Array<{ stepOrder: number; fieldKey: string }>; // Parsed references
}

export interface FieldDefinitionsSchema {
  fields: FieldDefinition[];
}

// Nested field data value structure
// Supports recursive nesting with type, value, and nested fields
export interface NestedFieldValue {
  type: FieldType;
  value: any;
  nested?: Record<string, NestedFieldValue>;
}

// Type for step data that can contain nested values
export type StepDataValue = string | number | boolean | any[] | NestedFieldValue;

// Stakeholder Process - defines the workflow
export interface StakeholderProcess {
  id?: number;
  name: string;
  description?: string;
  company_id: number;
  is_active: boolean;
  is_sequential: boolean; // If true, steps must be completed in order
  allow_rollback: boolean; // If true, can go back to previous steps (only for sequential)
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  // Joined data
  steps?: StakeholderProcessStep[];
  step_count?: number;
}

// Process Step - individual step in a process
export interface StakeholderProcessStep {
  id?: number;
  process_id: number;
  name: string;
  description?: string;
  step_order: number;
  team_ids: number[]; // Array of team IDs for multi-team assignment
  field_definitions: FieldDefinitionsSchema;
  use_date_range: boolean;
  start_date?: string; // ISO date string
  end_date?: string; // ISO date string
  can_reject: boolean; // Whether team members can reject stakeholders at this step
  status_field?: {
    enabled: boolean;
    label?: string;
    options?: DropdownOption[];
  }; // Optional status field configuration
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  version?: number; // For backward compatibility
  // Joined data
  team?: {
    id: number;
    name: string;
  };
  teams?: Array<{
    id: number;
    name: string;
  }>; // Multiple teams assigned to this step
}

// Stakeholder Status Type
export type StakeholderStatus = 'Lead' | 'Permanent' | 'Rejected';

// Stakeholder - main entity (called "Lead" until completed)
export interface Stakeholder {
  id?: number;
  name: string;
  address?: string;
  contact_persons: ContactPerson[];
  process_id: number;
  current_step_id?: number;
  current_step_order: number;
  stakeholder_type_id?: number; // Optional categorization
  parent_stakeholder_id?: number; // Reference to parent stakeholder for hierarchical relationships
  is_active: boolean;
  is_completed: boolean;
  completed_at?: string;
  kam_id?: string; // Key Accounts Manager - Employee ID assigned to handle stakeholder
  status: StakeholderStatus; // Lead, Permanent, or Rejected
  rejected_at?: string;
  rejected_by_id?: string; // UUID of the employee who rejected (database column: rejected_by)
  rejection_reason?: string;
  additional_data?: Record<string, any>; // Additional key-value data for permanent stakeholders
  access_code?: string; // Unique code for public ticket access
  company_id: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  // Joined data
  process?: StakeholderProcess;
  current_step?: StakeholderProcessStep;
  step_data?: StakeholderStepData[];
  transactions?: Account[]; // Financial transactions associated with this stakeholder
  stakeholder_type?: StakeholderType; // Type information
  parent_stakeholder?: {
    id: number;
    name: string;
    status?: StakeholderStatus;
  };
  kam?: {
    id: string;
    name: string;
    email?: string;
  };
  rejected_by?: {
    id: string;
    name: string;
    email?: string;
  };
}

// Step Data - actual data for each step of each stakeholder
export interface StakeholderStepData {
  id?: number;
  stakeholder_id: number;
  step_id: number;
  data: Record<string, any>; // Dynamic based on field_definitions
  field_definitions_snapshot?: FieldDefinitionsSchema; // Snapshot for backward compatibility
  step_version?: number;
  is_completed: boolean;
  completed_at?: string;
  completed_by?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  // Joined data
  step?: StakeholderProcessStep;
}

// Stakeholder Issue - issue tracking/ticketing for stakeholders
// Stakeholder Issue Category - for organizing issues
export interface StakeholderIssueCategory {
  id?: number;
  name: string;
  description?: string;
  color: string; // Hex color for visual distinction
  company_id: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  // Joined data
  subcategories?: StakeholderIssueSubcategory[];
}

// Stakeholder Issue Subcategory - for further organization
export interface StakeholderIssueSubcategory {
  id?: number;
  category_id: number;
  name: string;
  description?: string;
  company_id: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  // Joined data
  category?: StakeholderIssueCategory;
}

// Linked Step Field - represents a specific field from a step linked to an issue
export interface LinkedStepField {
  stepDataId: number; // ID of the stakeholder_step_data record
  fieldKey: string; // Key of the specific field in the step data
  // Optional cached values for display (populated when fetching)
  stepName?: string;
  stepOrder?: number;
  fieldLabel?: string;
  fieldValue?: any;
}

// Required field definition for stakeholder issues
// Fields that must be filled before marking an issue as resolved
export interface StakeholderIssueRequiredField {
  key: string; // Unique identifier for the field
  label: string; // Display label
  type: 'text' | 'number' | 'date' | 'select'; // Field type
  required: boolean; // Whether the field must be filled
  value?: string | number | null; // Current value (filled when resolving)
  options?: string[]; // Options for select type fields
}

export interface StakeholderIssue {
  id?: number;
  stakeholder_id: number;
  title: string;
  description?: string;
  status: 'Pending' | 'In Progress' | 'Pending Approval' | 'Resolved';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  attachments: StakeholderIssueAttachment[];
  assigned_to?: string; // Employee ID assigned to handle this specific issue
  assigned_team_id?: number; // Team ID assigned to handle this issue (either employee OR team)
  checker_team_id?: number; // Team ID assigned to verify and approve the resolution
  category_id?: number; // Optional category for organization
  subcategory_id?: number; // Optional subcategory (must belong to selected category)
  linked_step_data_ids?: number[]; // DEPRECATED: Array of stakeholder_step_data IDs linked to this issue
  linked_fields?: LinkedStepField[]; // Array of specific field references linked to this issue
  required_fields?: StakeholderIssueRequiredField[]; // Fields that must be filled before resolution
  is_pending_checker_approval?: boolean; // True when assigned entity has marked as resolved but checker has not approved
  checker_approved_at?: string; // When checker team approved
  checker_approved_by?: string; // Employee who approved (from checker team)
  checker_rejection_reason?: string; // Reason if checker rejects the resolution
  created_from_public_page?: boolean; // True if ticket was created via public page
  company_id: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  // Joined data
  stakeholder?: Stakeholder;
  assigned_employee?: {
    id: string;
    name: string;
    email?: string;
  };
  assigned_team?: {
    id: number;
    name: string;
  };
  checker_team?: {
    id: number;
    name: string;
  };
  category?: StakeholderIssueCategory;
  subcategory?: StakeholderIssueSubcategory;
  linked_step_data?: StakeholderStepData[]; // Joined step data for linked records
  creator?: {
    id: string;
    name: string;
    email?: string;
  };
  resolver?: {
    id: string;
    name: string;
    email?: string;
  };
  checker_approver?: {
    id: string;
    name: string;
    email?: string;
  };
}

// File attachment for stakeholder issues
export interface StakeholderIssueAttachment {
  path: string;
  originalName: string;
  size: number;
  type: string;
  uploadedAt: string;
}

// Salary Change Audit Trail
export interface SalaryChangeLog {
  id?: number;
  employee_id: string;
  company_id: number;
  change_data: {
    old_value: number;
    new_value: number;
    reason?: string;
    employee_name: string;
    changed_at: string;
  };
  changed_by: string;
  created_at?: string;
}

// Enhanced Account Entry for Payroll Integration
export interface PayrollAccountEntry {
  id?: number;
  account_id?: number;
  payroll_id: number;
  employee_id: string;
  employee_name?: string;
  transaction_type?: 'salary_payment' | 'deduction' | 'bonus';
  amount?: number;
  description?: string;
  company_id?: number;
  created_at?: string;
  created_by?: string;
  total_amount?: number;
  basic_salary?: number;
  adjustments?: any;
  generation_date?: string;
  source?: string;
}

// Team-Based Permissions System
// ==============================================================================

export interface Team {
  id?: number;
  name: string;
  description?: string;
  company_id: number;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface TeamMember {
  id?: number;
  team_id: number;
  employee_id: string;
  joined_at?: string;
  added_by?: string;
  // Populated fields for display
  employee_name?: string;
  employee_email?: string;
  added_by_name?: string;
}

export type PermissionCategory = 'workflow' | 'services' | 'operations' | 'admin';

export interface Permission {
  id?: number;
  module_name: string;
  display_name: string;
  description?: string;
  category: PermissionCategory;
  created_at?: string;
}

export interface TeamPermission {
  id?: number;
  team_id: number;
  permission_id: number;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_comment: boolean;
  created_at?: string;
  updated_at?: string;
  // Populated fields for display
  module_name?: string;
  display_name?: string;
  category?: PermissionCategory;
}

export interface UserPermissions {
  [moduleName: string]: {
    can_read: boolean;
    can_write: boolean;
    can_delete: boolean;
    can_approve: boolean;
    can_comment: boolean;
  };
}

export interface TeamWithMembers extends Team {
  member_count?: number;
  members?: TeamMember[];
}

export interface TeamWithPermissions extends Team {
  permissions?: TeamPermission[];
}
// ==============================================================================
// Superadmin Types
// ==============================================================================

export interface Superadmin {
  id?: number;
  user_id: string;
  granted_by?: string;
  granted_at?: string;
  notes?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  // Joined data
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    designation?: string;
  };
  granted_by_user?: {
    id: string;
    email: string;
  };
}

export interface Country {
  id: number;
  name: string;
  created_at?: string;
}

export interface Industry {
  id: number;
  name: string;
  created_at?: string;
}

export interface Company {
  id: number;
  name: string;
  code: string;
  industry_id: number;
  country_id: number;
  live_absent_enabled?: boolean;
  payroll_generation_day?: number;
  fiscal_year_start?: string;
  live_payroll_enabled?: boolean;
  has_division?: boolean;
  pay_frequency?: string;
  file_size_limit_mb?: number;
  max_device_limit?: number;
  max_users?: number;
  created_at?: string;
  updated_at?: string;
  // Joined data
  industry?: Industry;
  country?: Country;
}

// ==============================================================================
// Stakeholder Services Billing System
// ==============================================================================
// NOTE: The old process-based billing types have been removed.
// New service-based billing types are in: src/lib/types/stakeholder-services.ts
// Including: StakeholderService, StakeholderServiceInvoice, StakeholderServicePayment,
// ServiceInvoiceStatus, ServicePaymentStatus, BillingCycleType, etc.
