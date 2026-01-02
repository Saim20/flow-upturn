/**
 * CSV Export Utilities for Flow HRIS System
 * Provides standardized CSV export functionality for various data types
 */

import { ExtendedEmployee } from "@/hooks/useEmployees";
import { 
  Stakeholder, 
  Project, 
  Task, 
  Leave, 
  Attendance 
} from "@/lib/types/schemas";

/**
 * Convert data to CSV format
 */
function convertToCSV(headers: string[], rows: string[][]): string {
  const csvHeaders = headers.join(",");
  const csvRows = rows.map((row) =>
    row.map((cell) => {
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const cellStr = String(cell ?? "");
      if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(",")
  );
  
  return [csvHeaders, ...csvRows].join("\n");
}

/**
 * Trigger browser download of CSV file
 */
function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Format date for CSV export
 */
function formatDateForCSV(dateString?: string | null): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Generate timestamp for filename
 */
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

// ==============================================================================
// EMPLOYEE/HRIS DATA EXPORT
// ==============================================================================

export interface EmployeeExportOptions {
  includeEmail?: boolean;
  includePhone?: boolean;
  includeDepartment?: boolean;
  includeDesignation?: boolean;
  includeJoinDate?: boolean;
  includeSalary?: boolean;
}

export function exportEmployeesToCSV(
  employees: ExtendedEmployee[],
  options: EmployeeExportOptions = {}
): void {
  const {
    includeEmail = true,
    includePhone = true,
    includeDepartment = true,
    includeDesignation = true,
    includeJoinDate = true,
    includeSalary = false, // Sensitive data, default to false
  } = options;

  // Build headers dynamically based on options
  const headers: string[] = ["Employee ID", "Name"];
  
  if (includeEmail) headers.push("Email");
  if (includePhone) headers.push("Phone");
  if (includeDepartment) headers.push("Department");
  if (includeDesignation) headers.push("Designation");
  if (includeJoinDate) headers.push("Join Date");
  if (includeSalary) headers.push("Basic Salary");

  // Build rows
  const rows = employees.map((emp) => {
    const row: string[] = [emp.id, emp.name];
    
    if (includeEmail) row.push(emp.email || "");
    if (includePhone) row.push(emp.phone || "");
    if (includeDepartment) row.push(emp.department || "");
    if (includeDesignation) row.push(emp.designation || "");
    if (includeJoinDate) row.push(formatDateForCSV(emp.joinDate));
    if (includeSalary) row.push(emp.basic_salary?.toString() || "");
    
    return row;
  });

  const csvContent = convertToCSV(headers, rows);
  const filename = `employees_${getTimestamp()}.csv`;
  downloadCSV(csvContent, filename);
}

// ==============================================================================
// STAKEHOLDER DATA EXPORT
// ==============================================================================

export interface StakeholderExportOptions {
  includeAddress?: boolean;
  includeContactPersons?: boolean;
  includeStatus?: boolean;
  includeProcess?: boolean;
  includeKAM?: boolean;
  includeType?: boolean;
  includeStepData?: boolean;
}

export function exportStakeholdersToCSV(
  stakeholders: Stakeholder[],
  options: StakeholderExportOptions = {}
): void {
  const {
    includeAddress = true,
    includeContactPersons = true,
    includeStatus = true,
    includeProcess = true,
    includeKAM = true,
    includeType = true,
    includeStepData = false,
  } = options;

  // Build headers
  const headers: string[] = ["Stakeholder ID", "Name"];
  
  if (includeAddress) headers.push("Address");
  if (includeStatus) headers.push("Status");
  if (includeType) headers.push("Type");
  if (includeProcess) headers.push("Process");
  if (includeKAM) headers.push("KAM");
  if (includeContactPersons) {
    headers.push("Contact Person 1 - Name");
    headers.push("Contact Person 1 - Email");
    headers.push("Contact Person 1 - Phone");
  }
  if (includeStepData) headers.push("Step Data");
  headers.push("Created At");

  // Build rows
  const rows = stakeholders.map((stakeholder) => {
    const row: string[] = [
      stakeholder.id?.toString() || "",
      stakeholder.name,
    ];
    
    if (includeAddress) row.push(stakeholder.address || "");
    if (includeStatus) row.push(stakeholder.status || "Lead");
    if (includeType) {
      // Handle both direct object and nested structure
      const typeName = stakeholder.stakeholder_type 
        ? (typeof stakeholder.stakeholder_type === 'object' 
          ? (stakeholder.stakeholder_type as unknown as Record<string, unknown>)?.name as string || ""
          : "")
        : "";
      row.push(typeName);
    }
    if (includeProcess) {
      // Handle both direct object and nested structure
      const processName = stakeholder.process
        ? (typeof stakeholder.process === 'object'
          ? (stakeholder.process as unknown as Record<string, unknown>)?.name as string || ""
          : "")
        : "";
      row.push(processName);
    }
    if (includeKAM) {
      // Handle KAM which is transformed to have a name property
      const kamName = stakeholder.kam
        ? (typeof stakeholder.kam === 'object'
          ? (stakeholder.kam as Record<string, unknown>)?.name as string || ""
          : "")
        : "";
      row.push(kamName);
    }
    if (includeContactPersons) {
      const firstContact = stakeholder.contact_persons?.[0];
      row.push(firstContact?.name || "");
      row.push(firstContact?.email || "");
      row.push(firstContact?.phone || "");
    }
    if (includeStepData) {
      // Format step data as JSON string for single column
      const stepDataStr = formatStepDataForCSV(stakeholder.step_data as unknown as Record<string, unknown>[]);
      row.push(stepDataStr);
    }
    row.push(formatDateForCSV(stakeholder.created_at));
    
    return row;
  });

  const csvContent = convertToCSV(headers, rows);
  const filename = `stakeholders_${getTimestamp()}.csv`;
  downloadCSV(csvContent, filename);
}

/**
 * Format step data for CSV export as a single column - returns JSON format
 * Each step contains only the field labels and their values for human readability
 */
function formatStepDataForCSV(stepData?: Record<string, unknown>[]): string {
  if (!stepData || stepData.length === 0) return "";
  
  try {
    // Create array of step objects with only label: value pairs
    const formattedSteps = stepData.map((step) => {
      const stepRecord = step as Record<string, unknown>;
      const stepInfo = stepRecord.step as Record<string, unknown> | undefined;
      const stepName = stepInfo?.name as string || `Step ${stepRecord.step_order || "Unknown"}`;
      const stepDataObj = (stepRecord.data as Record<string, unknown>) || {};
      const fieldDefinitions = stepRecord.field_definitions_snapshot as Record<string, unknown> | undefined;
      
      // Get field definitions to map keys to labels
      const fields = (fieldDefinitions?.fields as Array<Record<string, unknown>>) || [];
      const fieldLabelMap: Record<string, string> = {};
      
      fields.forEach((field) => {
        const key = field.key as string;
        const label = field.label as string;
        if (key && label) {
          fieldLabelMap[key] = label;
        }
      });
      
      // Create object with field labels as keys and data as values
      const stepObject: Record<string, unknown> = {
        "Step Name": stepName,
      };
      
      // Add each field using its label as the key
      Object.entries(stepDataObj).forEach(([key, value]) => {
        const label = fieldLabelMap[key] || key;
        stepObject[label] = value;
      });
      
      return stepObject;
    });
    
    // Return as formatted JSON string
    return JSON.stringify(formattedSteps, null, 2);
  } catch (error) {
    console.error("Error formatting step data:", error);
    return "[]";
  }
}

// ==============================================================================
// GENERIC DATA EXPORT (for other modules)
// ==============================================================================

export interface GenericExportColumn {
  header: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accessor: string | ((item: any) => string);
}

export function exportGenericDataToCSV(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[],
  columns: GenericExportColumn[],
  filename: string
): void {
  const headers = columns.map((col) => col.header);
  
  const rows = data.map((item) => {
    return columns.map((col) => {
      if (typeof col.accessor === "function") {
        return col.accessor(item);
      }
      return item[col.accessor] ?? "";
    });
  });

  const csvContent = convertToCSV(headers, rows);
  const filenameWithTimestamp = `${filename}_${getTimestamp()}.csv`;
  downloadCSV(csvContent, filenameWithTimestamp);
}

// ==============================================================================
// PROJECT DATA EXPORT
// ==============================================================================

export interface ProjectExportOptions {
  includeDescription?: boolean;
  includeDates?: boolean;
  includeStatus?: boolean;
  includeProgress?: boolean; // Progress calculated from milestones, may not be present
  includeGoal?: boolean;
  includeAssignees?: boolean;
}

export function exportProjectsToCSV(
  projects: (Project & { progress?: number })[],
  options: ProjectExportOptions = {}
): void {
  const {
    includeDescription = true,
    includeDates = true,
    includeStatus = true,
    includeProgress = true,
    includeGoal = false,
    includeAssignees = true,
  } = options;

  // Build headers
  const headers: string[] = ["Project ID", "Project Title"];
  
  if (includeDescription) headers.push("Description");
  if (includeDates) {
    headers.push("Start Date");
    headers.push("End Date");
  }
  if (includeStatus) headers.push("Status");
  if (includeProgress) headers.push("Progress (%)");
  if (includeGoal) headers.push("Goal");
  if (includeAssignees) headers.push("Assignees");
  headers.push("Project Lead ID");
  headers.push("Created At");

  // Build rows
  const rows = projects.map((project) => {
    const row: string[] = [
      project.id?.toString() || "",
      project.project_title,
    ];
    
    if (includeDescription) row.push(project.description || "");
    if (includeDates) {
      row.push(formatDateForCSV(project.start_date));
      row.push(formatDateForCSV(project.end_date));
    }
    if (includeStatus) row.push(project.status || "");
    if (includeProgress) row.push(project.progress !== undefined ? project.progress.toString() : "0");
    if (includeGoal) row.push(project.goal || "");
    if (includeAssignees) {
      const assigneesList = Array.isArray(project.assignees) 
        ? project.assignees.join("; ") 
        : "";
      row.push(assigneesList);
    }
    row.push(project.project_lead_id || "");
    row.push(formatDateForCSV(project.created_at));
    
    return row;
  });

  const csvContent = convertToCSV(headers, rows);
  const filename = `projects_${getTimestamp()}.csv`;
  downloadCSV(csvContent, filename);
}

// ==============================================================================
// TASK DATA EXPORT
// ==============================================================================

export interface TaskExportOptions {
  includeDescription?: boolean;
  includeDates?: boolean;
  includePriority?: boolean;
  includeStatus?: boolean;
  includeProject?: boolean;
  includeAssignees?: boolean;
}

export function exportTasksToCSV(
  tasks: Task[],
  options: TaskExportOptions = {}
): void {
  const {
    includeDescription = true,
    includeDates = true,
    includePriority = true,
    includeStatus = true,
    includeProject = true,
    includeAssignees = true,
  } = options;

  // Build headers
  const headers: string[] = ["Task ID", "Task Title"];
  
  if (includeDescription) headers.push("Description");
  if (includeDates) {
    headers.push("Start Date");
    headers.push("End Date");
  }
  if (includePriority) headers.push("Priority");
  if (includeStatus) headers.push("Status");
  if (includeProject) headers.push("Project ID");
  if (includeAssignees) headers.push("Assignees");
  headers.push("Created At");

  // Build rows
  const rows = tasks.map((task) => {
    const row: string[] = [
      task.id?.toString() || "",
      task.task_title,
    ];
    
    if (includeDescription) row.push(task.task_description || "");
    if (includeDates) {
      row.push(formatDateForCSV(task.start_date));
      row.push(formatDateForCSV(task.end_date));
    }
    if (includePriority) row.push(task.priority || "normal");
    if (includeStatus) row.push(task.status ? "Completed" : "Pending");
    if (includeProject) row.push(task.project_id || "");
    if (includeAssignees) {
      const assigneesList = Array.isArray(task.assignees) 
        ? task.assignees.join("; ") 
        : "";
      row.push(assigneesList);
    }
    row.push(formatDateForCSV(task.created_at?.toString()));
    
    return row;
  });

  const csvContent = convertToCSV(headers, rows);
  const filename = `tasks_${getTimestamp()}.csv`;
  downloadCSV(csvContent, filename);
}

// ==============================================================================
// LEAVE DATA EXPORT
// ==============================================================================

export interface LeaveExportOptions {
  includeDates?: boolean;
  includeStatus?: boolean;
  includeType?: boolean;
  includeRemarks?: boolean;
  includeEmployee?: boolean;
}

export function exportLeavesToCSV(
  leaves: Leave[],
  options: LeaveExportOptions = {}
): void {
  const {
    includeDates = true,
    includeStatus = true,
    includeType = true,
    includeRemarks = true,
    includeEmployee = true,
  } = options;

  // Build headers
  const headers: string[] = ["Leave ID"];
  
  if (includeEmployee) headers.push("Employee ID");
  if (includeType) headers.push("Leave Type ID");
  if (includeDates) {
    headers.push("Start Date");
    headers.push("End Date");
  }
  if (includeStatus) headers.push("Status");
  if (includeRemarks) headers.push("Remarks");
  headers.push("Approved By");

  // Build rows
  const rows = leaves.map((leave) => {
    const row: string[] = [leave.id?.toString() || ""];
    
    if (includeEmployee) row.push(leave.employee_id || "");
    if (includeType) row.push(leave.type_id?.toString() || "");
    if (includeDates) {
      row.push(formatDateForCSV(leave.start_date));
      row.push(formatDateForCSV(leave.end_date));
    }
    if (includeStatus) row.push(leave.status || "");
    if (includeRemarks) row.push(leave.remarks || "");
    row.push(leave.approved_by_id || "");
    
    return row;
  });

  const csvContent = convertToCSV(headers, rows);
  const filename = `leaves_${getTimestamp()}.csv`;
  downloadCSV(csvContent, filename);
}

// ==============================================================================
// ATTENDANCE DATA EXPORT
// ==============================================================================

export interface AttendanceExportOptions {
  includeCheckInTime?: boolean;
  includeCheckOutTime?: boolean;
  includeTag?: boolean;
  includeSite?: boolean;
  includeCoordinates?: boolean;
  includeSiteTimings?: boolean;
  includeLateIndicator?: boolean;
  includeLocationStatus?: boolean;
}

export function exportAttendanceToCSV(
  attendance: Attendance[],
  options: AttendanceExportOptions = {}
): void {
  const {
    includeCheckInTime = true,
    includeCheckOutTime = true,
    includeTag = true,
    includeSite = true,
    includeCoordinates = false,
    includeSiteTimings = true,
    includeLateIndicator = true,
    includeLocationStatus = true,
  } = options;

  // Build headers
  const headers: string[] = ["Attendance ID", "Employee ID", "Attendance Date"];
  
  if (includeTag) headers.push("Tag");
  if (includeSite) headers.push("Site Name");
  if (includeSiteTimings) {
    headers.push("Site Check-In Time");
    headers.push("Site Check-Out Time");
  }
  if (includeCheckInTime) headers.push("Actual Check-In Time");
  if (includeCheckOutTime) headers.push("Actual Check-Out Time");
  if (includeLateIndicator) headers.push("Late Status");
  if (includeLocationStatus) headers.push("Location Status");
  if (includeCoordinates) {
    headers.push("Check-In Coordinates");
    headers.push("Check-Out Coordinates");
  }

  // Build rows
  const rows = attendance.map((record) => {
    const recordWithSite = record as Attendance & { site?: Record<string, unknown> };
    const siteInfo = recordWithSite.site;
    
    const row: string[] = [
      record.id?.toString() || "",
      record.employee_id || "",
      formatDateForCSV(record.attendance_date),
    ];
    
    if (includeTag) row.push(record.tag || "");
    
    if (includeSite) {
      const siteName = siteInfo?.name as string || "";
      row.push(siteName);
    }
    
    if (includeSiteTimings) {
      const siteCheckIn = siteInfo?.check_in as string || "";
      const siteCheckOut = siteInfo?.check_out as string || "";
      row.push(siteCheckIn);
      row.push(siteCheckOut);
    }
    
    if (includeCheckInTime) row.push(record.check_in_time || "");
    if (includeCheckOutTime) row.push(record.check_out_time || "");
    
    if (includeLateIndicator) {
      // Calculate if employee was late
      let lateStatus = "N/A";
      if (siteInfo && record.check_in_time) {
        const siteCheckIn = siteInfo.check_in as string;
        if (siteCheckIn && record.check_in_time > siteCheckIn) {
          lateStatus = "Late";
        } else if (siteCheckIn) {
          lateStatus = "On Time";
        }
      }
      row.push(lateStatus);
    }
    
    if (includeLocationStatus) {
      // Calculate if employee checked in from wrong location (distance > 100m threshold)
      let locationStatus = "N/A";
      if (siteInfo && record.check_in_coordinates) {
        const siteLat = siteInfo.latitude as number;
        const siteLng = siteInfo.longitude as number;
        const checkInLat = record.check_in_coordinates.y;
        const checkInLng = record.check_in_coordinates.x;
        
        if (siteLat && siteLng && checkInLat && checkInLng) {
          const distance = calculateDistance(siteLat, siteLng, checkInLat, checkInLng);
          // Threshold of 100 meters
          if (distance > 0.1) {
            locationStatus = `Wrong Location (${distance.toFixed(2)}km away)`;
          } else {
            locationStatus = "Correct Location";
          }
        }
      }
      row.push(locationStatus);
    }
    
    if (includeCoordinates) {
      const checkInCoords = record.check_in_coordinates 
        ? `${record.check_in_coordinates.x}, ${record.check_in_coordinates.y}`
        : "";
      const checkOutCoords = record.check_out_coordinates 
        ? `${record.check_out_coordinates.x}, ${record.check_out_coordinates.y}`
        : "";
      row.push(checkInCoords);
      row.push(checkOutCoords);
    }
    
    return row;
  });

  const csvContent = convertToCSV(headers, rows);
  const filename = `attendance_${getTimestamp()}.csv`;
  downloadCSV(csvContent, filename);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
