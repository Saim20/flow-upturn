/**
 * Simple validation utilities to replace Zod
 */

import { SCHOOLING_TYPE_OPTIONS, STATUS, JOB_STATUS } from '@/lib/constants';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  success: boolean;
  data?: any;
  errors: ValidationError[];
}

/**
 * Helper function to validate string length
 */
function validateStringLength(value: any, fieldName: string, min?: number, max?: number): ValidationError | null {
  // Capitalize the field name for better error messages
  const formattedFieldName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
  if (typeof value !== 'string') {
    return { field: fieldName, message: `${formattedFieldName} must be a string` };
  }
  if (min !== undefined && value.trim().length < min) {
    return { field: fieldName, message: min === 1 ? `${formattedFieldName} is required` : `${formattedFieldName} must be at least ${min} characters` };
  }
  if (max !== undefined && value.length > max) {
    return { field: fieldName, message: `${formattedFieldName} must be ${max} characters or fewer` };
  }
  return null;
}

/**
 * Helper function to validate numbers
 */
function validateNumber(value: any, fieldName: string, min?: number, max?: number): ValidationError | null {
  if (typeof value !== 'number' || isNaN(value)) {
    return { field: fieldName, message: `${fieldName} must be a valid number` };
  }
  if (min !== undefined && value < min) {
    return { field: fieldName, message: `${fieldName} must be at least ${min}` };
  }
  if (max !== undefined && value > max) {
    return { field: fieldName, message: `${fieldName} must be at most ${max}` };
  }
  return null;
}

/**
 * Helper function to validate dates
 */
function validateDate(value: any, fieldName: string): ValidationError | null {
  if (!value || typeof value !== 'string') {
    return { field: fieldName, message: `${fieldName} is required` };
  }
  if (isNaN(Date.parse(value))) {
    return { field: fieldName, message: `Invalid ${fieldName}` };
  }
  return null;
}

/**
 * Helper function to validate UUID
 */
function validateUUID(value: any, fieldName: string, optional = true): ValidationError | null {
  if (optional && (!value || value === '')) return null;
  if (!value || typeof value !== 'string') {
    return { field: fieldName, message: `${fieldName} is required` };
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    return { field: fieldName, message: `${fieldName} must be a valid UUID` };
  }
  return null;
}

/**
 * Validates a notice object
 */
export function validateNotice(notice: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Required field validations
  if (!notice.notice_type_id || notice.notice_type_id < 1) {
    errors.push({ field: 'notice_type_id', message: 'Please select a notice type' });
  }

  if (!notice.title || typeof notice.title !== 'string' || notice.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Please enter a title' });
  } else if (notice.title.length > 200) {
    errors.push({ field: 'title', message: 'Title must be 200 characters or fewer' });
  }

  if (!notice.description || typeof notice.description !== 'string' || notice.description.trim().length === 0) {
    errors.push({ field: 'description', message: 'Please enter a description' });
  }

  if (!notice.urgency || typeof notice.urgency !== 'string' || notice.urgency.trim().length === 0) {
    errors.push({ field: 'urgency', message: 'Please select an urgency level' });
  }

  if (!notice.valid_from || typeof notice.valid_from !== 'string' || notice.valid_from.trim().length === 0) {
    errors.push({ field: 'valid_from', message: 'Please select a start date' });
  }

  if (!notice.valid_till || typeof notice.valid_till !== 'string' || notice.valid_till.trim().length === 0) {
    errors.push({ field: 'valid_till', message: 'Please select an end date' });
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? notice : undefined,
    errors
  };
}

/**
 * Validates a schooling object
 */
export function validateSchooling(schooling: any): ValidationResult {
  const errors: ValidationError[] = [];
  const schoolingTypes = SCHOOLING_TYPE_OPTIONS;

  if (!schooling.type || !schoolingTypes.includes(schooling.type)) {
    errors.push({ field: 'type', message: 'Please select a valid schooling type' });
  }

  const nameError = validateStringLength(schooling.name, 'name', 1, 50);
  if (nameError) errors.push(nameError);

  const instituteError = validateStringLength(schooling.institute, 'institute', 1, 100);
  if (instituteError) errors.push(instituteError);

  const fromDateError = validateDate(schooling.from_date, 'from_date');
  if (fromDateError) errors.push(fromDateError);

  const toDateError = validateDate(schooling.to_date, 'to_date');
  if (toDateError) errors.push(toDateError);

  const resultError = validateStringLength(schooling.result, 'result', 1, 15);
  if (resultError) errors.push(resultError);

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? schooling : undefined,
    errors
  };
}

/**
 * Validates a leave object
 */
export function validateLeave(leave: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!leave.start_date || typeof leave.start_date !== 'string' || leave.start_date.trim().length === 0) {
    errors.push({ field: 'start_date', message: 'Please select a start date' });
  }

  if (!leave.end_date || typeof leave.end_date !== 'string' || leave.end_date.trim().length === 0) {
    errors.push({ field: 'end_date', message: 'Please select an end date' });
  }

  if (leave.remarks && typeof leave.remarks === 'string' && leave.remarks.length > 250) {
    errors.push({ field: 'remarks', message: 'Remarks must be 250 characters or fewer' });
  }

  if (!leave.status || typeof leave.status !== 'string' || leave.status.trim().length === 0) {
    errors.push({ field: 'status', message: 'Please select a status' });
  }

  if (leave.approved_by_id) {
    const uuidError = validateUUID(leave.approved_by_id, 'approved_by_id');
    if (uuidError) errors.push(uuidError);
  }

  if (leave.requested_to) {
    const uuidError = validateUUID(leave.requested_to, 'requested_to');
    if (uuidError) errors.push(uuidError);
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? leave : undefined,
    errors
  };
}

/**
 * Validates an experience object
 */
export function validateExperience(experience: any): ValidationResult {
  const errors: ValidationError[] = [];

  const companyNameError = validateStringLength(experience.company_name, 'company_name', 1, 50);
  if (companyNameError) errors.push(companyNameError);

  const designationError = validateStringLength(experience.designation, 'designation', 1, 25);
  if (designationError) errors.push(designationError);

  const fromDateError = validateDate(experience.from_date, 'from_date');
  if (fromDateError) errors.push(fromDateError);

  const toDateError = validateDate(experience.to_date, 'to_date');
  if (toDateError) errors.push(toDateError);

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? experience : undefined,
    errors
  };
}

/**
 * Validates a lineage object
 */
export function validateLineage(lineage: any): ValidationResult {
  const errors: ValidationError[] = [];

  const nameError = validateStringLength(lineage.name, 'name', 1, 50);
  if (nameError) errors.push(nameError);

  if (!lineage.hierarchical_level || typeof lineage.hierarchical_level !== 'number' ||
    !Number.isInteger(lineage.hierarchical_level) || lineage.hierarchical_level < 1) {
    errors.push({ field: 'hierarchical_level', message: 'hierarchical_level must be a positive integer' });
  }

  if (!lineage.position_id || typeof lineage.position_id !== 'number') {
    errors.push({ field: 'position_id', message: 'position_id is required' });
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? lineage : undefined,
    errors
  };
}

/**
 * Validates a site object
 */
export function validateSite(site: any): ValidationResult {
  const errors: ValidationError[] = [];

  const nameError = validateStringLength(site.name, 'name', 1, 100);
  if (nameError) errors.push(nameError);

  const longitudeError = validateNumber(site.longitude, 'longitude', 0);
  if (longitudeError) errors.push(longitudeError);

  const latitudeError = validateNumber(site.latitude, 'latitude', 0);
  if (latitudeError) errors.push(latitudeError);

  const checkInError = validateStringLength(site.check_in, 'check_in', 1);
  if (checkInError) errors.push(checkInError);

  const checkOutError = validateStringLength(site.check_out, 'check_out', 1);
  if (checkOutError) errors.push(checkOutError);

  const locationError = validateStringLength(site.location, 'location', 1);
  if (locationError) errors.push(locationError);

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? site : undefined,
    errors
  };
}

/**
 * Validates a leave type object
 */
export function validateLeaveType(leaveType: any): ValidationResult {
  const errors: ValidationError[] = [];

  const nameError = validateStringLength(leaveType.name, 'name', 1, 30);
  if (nameError) errors.push(nameError);

  const quotaError = validateNumber(leaveType.annual_quota, 'annual_quota', 1);
  if (quotaError) errors.push(quotaError);

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? leaveType : undefined,
    errors
  };
}

/**
 * Validates a holiday config object
 */
export function validateHolidayConfig(holidayConfig: any): ValidationResult {
  const errors: ValidationError[] = [];

  const nameError = validateStringLength(holidayConfig.name, 'name', 1, 50);
  if (nameError) errors.push(nameError);

  const dateError = validateDate(holidayConfig.date, 'date');
  if (dateError) errors.push(dateError);

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? holidayConfig : undefined,
    errors
  };
}

/**
 * Validates a requisition type object
 */
export function validateRequisitionType(requisitionType: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!requisitionType.name || typeof requisitionType.name !== 'string' || requisitionType.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Please enter a valid name' });
  } else if (requisitionType.name.length > 50) {
    errors.push({ field: 'name', message: 'Name must be 50 characters or fewer' });
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? requisitionType : undefined,
    errors
  };
}

/**
 * Validates a news and notice type object
 */
export function validateNewsAndNoticeType(newsAndNoticeType: any): ValidationResult {
  const errors: ValidationError[] = [];

  const nameError = validateStringLength(newsAndNoticeType.name, 'name', 1, 50);
  if (nameError) errors.push(nameError);

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? newsAndNoticeType : undefined,
    errors
  };
}

/**
 * Validates a complaints type object
 */
export function validateComplaintsType(complaintsType: any): ValidationResult {
  const errors: ValidationError[] = [];

  const nameError = validateStringLength(complaintsType.name, 'name', 1, 50);
  if (nameError) errors.push(nameError);

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? complaintsType : undefined,
    errors
  };
}

/**
 * Validates a requisition inventory object
 */
export function validateRequisitionInventory(inventory: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!inventory.name || typeof inventory.name !== 'string' || inventory.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Please enter a valid name' });
  } else if (inventory.name.length > 50) {
    errors.push({ field: 'name', message: 'Name must be 50 characters or fewer' });
  }

  if (!inventory.asset_owner || typeof inventory.asset_owner !== 'string' || inventory.asset_owner.trim().length === 0) {
    errors.push({ field: 'asset_owner', message: 'Please select an asset owner' });
  }

  const quantityError = validateNumber(inventory.quantity, 'quantity', 1);
  if (quantityError) errors.push(quantityError);

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? inventory : undefined,
    errors
  };
}

/**
 * Validates a claim type object
 */
export function validateClaimType(claimType: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!claimType.settlement_item || typeof claimType.settlement_item !== 'string' || claimType.settlement_item.trim().length === 0) {
    errors.push({ field: 'settlement_item', message: 'Please enter a valid name' });
  } else if (claimType.settlement_item.length > 25) {
    errors.push({ field: 'settlement_item', message: 'Settlement item must be 25 characters or fewer' });
  }

  if (!claimType.allowance || typeof claimType.allowance !== 'number' || claimType.allowance < 1) {
    errors.push({ field: 'allowance', message: 'Please enter a valid allowance' });
  }

  if (!claimType.settler_id || typeof claimType.settler_id !== 'string' || claimType.settler_id.trim().length === 0) {
    errors.push({ field: 'settler_id', message: 'Please select a settler' });
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? claimType : undefined,
    errors
  };
}

/**
 * Validates a project object
 */
export function validateProject(project: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!project.project_title || typeof project.project_title !== 'string' || project.project_title.trim().length === 0) {
    errors.push({ field: 'project_title', message: 'Please enter a valid project title' });
  } else if (project.project_title.length > 200) {
    errors.push({ field: 'project_title', message: 'Project title must be 200 characters or fewer' });
  }

  if (!project.start_date || typeof project.start_date !== 'string' || project.start_date.trim().length === 0) {
    errors.push({ field: 'start_date', message: 'Please select a start date' });
  }

  if (!project.end_date || typeof project.end_date !== 'string' || project.end_date.trim().length === 0) {
    errors.push({ field: 'end_date', message: 'Please select an end date' });
  }

  if (!project.project_lead_id || typeof project.project_lead_id !== 'string' || project.project_lead_id.trim().length === 0) {
    errors.push({ field: 'project_lead_id', message: 'Please select a project lead' });
  }

  if (!project.description || typeof project.description !== 'string' || project.description.trim().length === 0) {
    errors.push({ field: 'description', message: 'Please enter a project description' });
  }

  if (
    !Array.isArray(project.department_ids) ||
    project.department_ids.length === 0 ||
    project.department_ids.some((id: number) => id === 0)
  ) {
    errors.push({
      field: 'department_ids',
      message: 'Please select at least one department',
    });
  }


  return {
    success: errors.length === 0,
    data: errors.length === 0 ? project : undefined,
    errors
  };
}

/**
 * Validates a milestone object
 */
export function validateMilestone(milestone: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!milestone.milestone_title || typeof milestone.milestone_title !== 'string' || milestone.milestone_title.trim().length === 0) {
    errors.push({ field: 'milestone_title', message: 'Please enter a valid milestone title' });
  } else if (milestone.milestone_title.length > 200) {
    errors.push({ field: 'milestone_title', message: 'Milestone title must be 200 characters or fewer' });
  }

  if (!milestone.start_date || typeof milestone.start_date !== 'string' || milestone.start_date.trim().length === 0) {
    errors.push({ field: 'start_date', message: 'Please select a start date' });
  }

  if (!milestone.end_date || typeof milestone.end_date !== 'string' || milestone.end_date.trim().length === 0) {
    errors.push({ field: 'end_date', message: 'Please select an end date' });
  }

  if (!milestone.status || typeof milestone.status !== 'string' || milestone.status.trim().length === 0) {
    errors.push({ field: 'status', message: 'Please select a status' });
  }

  if (!milestone.weightage || typeof milestone.weightage !== 'number' || milestone.weightage < 1) {
    errors.push({ field: 'weightage', message: 'Please enter a valid weightage' });
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? milestone : undefined,
    errors
  };
}

/**
 * Validates a comment object
 */
export function validateComment(comment: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!comment.comment || typeof comment.comment !== 'string' || comment.comment.trim().length === 0) {
    errors.push({ field: 'comment', message: 'Please enter a valid comment' });
  }

  if (!comment.commenter_id || typeof comment.commenter_id !== 'string') {
    errors.push({ field: 'commenter_id', message: 'Commenter ID is required' });
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? comment : undefined,
    errors
  };
}

/**
 * Validates a task object
 */
export function validateTask(task: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!task.task_title || typeof task.task_title !== 'string' || task.task_title.trim().length === 0) {
    errors.push({ field: 'task_title', message: 'Title is required' });
  }

  if (!task.start_date || typeof task.start_date !== 'string' || task.start_date.trim().length === 0) {
    errors.push({ field: 'start_date', message: 'Start date is required' });
  }

  if (!task.end_date || typeof task.end_date !== 'string' || task.end_date.trim().length === 0) {
    errors.push({ field: 'end_date', message: 'End date is required' });
  }

  if (!task.priority || typeof task.priority !== 'string' || task.priority.trim().length === 0) {
    errors.push({ field: 'priority', message: 'Priority is required' });
  }

  if (!task.project_id || typeof task.project_id !== 'number') {
    errors.push({ field: 'project_id', message: 'Project ID is required' });
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? task : undefined,
    errors
  };
}

/**
 * Validates a requisition object
 */
export function validateRequisition(requisition: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!requisition.quantity || typeof requisition.quantity !== 'number' || requisition.quantity < 1) {
    errors.push({ field: 'quantity', message: 'Please enter a valid quantity' });
  }

  const validStatuses = [STATUS.PENDING, STATUS.APPROVED, STATUS.REJECTED];
  if (requisition.status && !validStatuses.includes(requisition.status)) {
    errors.push({ field: 'status', message: 'Please select a valid status' });
  }

  if (!requisition.date || typeof requisition.date !== 'string' || requisition.date.trim().length === 0) {
    errors.push({ field: 'date', message: 'Please select a date' });
  }

  if (requisition.approved_by_id) {
    const uuidError = validateUUID(requisition.approved_by_id, 'approved_by_id');
    if (uuidError) errors.push(uuidError);
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? requisition : undefined,
    errors
  };
}

/**
 * Validates a settlement record object
 */
export function validateSettlementRecord(settlement: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!settlement.event_date || typeof settlement.event_date !== 'string' || settlement.event_date.trim().length === 0) {
    errors.push({ field: 'event_date', message: 'Please select an event date' });
  }

  if (!settlement.amount || typeof settlement.amount !== 'number' || settlement.amount < 0.01) {
    errors.push({ field: 'amount', message: 'Please enter a valid amount' });
  }

  if (!settlement.status || typeof settlement.status !== 'string' || settlement.status.trim().length === 0) {
    errors.push({ field: 'status', message: 'Please select a status' });
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? settlement : undefined,
    errors
  };
}

/**
 * Validates a complaint record object
 */
export function validateComplaintRecord(complaint: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!complaint.complainer_id || typeof complaint.complainer_id !== 'string') {
    errors.push({ field: 'complainer_id', message: 'Complainer ID is required' });
  }

  if (!complaint.description || typeof complaint.description !== 'string' || complaint.description.trim().length === 0) {
    errors.push({ field: 'description', message: 'Please enter a description' });
  }

  if (!complaint.status || typeof complaint.status !== 'string' || complaint.status.trim().length === 0) {
    errors.push({ field: 'status', message: 'Please select a status' });
  }

  if (!complaint.against_whom || typeof complaint.against_whom !== 'string' || complaint.against_whom.trim().length === 0) {
    errors.push({ field: 'against_whom', message: 'Please select a person' });
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? complaint : undefined,
    errors
  };
}

/**
 * Validates an attendance object
 */
export function validateAttendance(attendance: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!attendance.attendance_date || typeof attendance.attendance_date !== 'string' || attendance.attendance_date.trim().length === 0) {
    errors.push({ field: 'attendance_date', message: 'Please select an attendance date' });
  }

  if (!attendance.tag || typeof attendance.tag !== 'string' || attendance.tag.trim().length === 0) {
    errors.push({ field: 'tag', message: 'Please select an attendance tag' });
  }

  if (!attendance.employee_id || typeof attendance.employee_id !== 'string' || attendance.employee_id.trim().length === 0) {
    errors.push({ field: 'employee_id', message: 'Please select an employee' });
  } else {
    const uuidError = validateUUID(attendance.employee_id, 'employee_id', false);
    if (uuidError) errors.push(uuidError);
  }

  if (attendance.supervisor_id) {
    const uuidError = validateUUID(attendance.supervisor_id, 'supervisor_id');
    if (uuidError) errors.push(uuidError);
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? attendance : undefined,
    errors
  };
}

/**
 * Validates a division object
 */
export function validateDivision(division: any): ValidationResult {
  const errors: ValidationError[] = [];

  const nameError = validateStringLength(division.name, 'name', 1, 50);
  if (nameError) errors.push(nameError);

  const headIdError = validateStringLength(division.head_id, 'head_id', 1);
  if (headIdError) errors.push(headIdError);

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? division : undefined,
    errors
  };
}

/**
 * Validates a department object
 */
export function validateDepartment(department: any, hasDept: boolean): ValidationResult {
  const errors: ValidationError[] = [];

  const nameError = validateStringLength(department.name, 'name', 1, 50);
  if (nameError) errors.push(nameError);

  // head_id is required
  const headIdError = validateStringLength(department.head_id, 'head_id', 1);
  if (headIdError) errors.push(headIdError);

  // description is optional
  if (department.description && department.description.trim()) {
    const descriptionError = validateStringLength(department.description, 'description', 1, 500);
    if (descriptionError) errors.push(descriptionError);
  }

  // division_id is required when hasDept is true
  if (hasDept && (department.division_id === null || department.division_id === undefined || typeof department.division_id !== 'number' || isNaN(department.division_id))) {
    errors.push({
      field: 'division_id',
      message: 'Division is required'
    });
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? department : undefined,
    errors
  };
}

/**
 * Validates a position object
 */
export function validatePosition(position: any): ValidationResult {
  const errors: ValidationError[] = [];

  const nameError = validateStringLength(position.name, 'name', 1, 50);
  if (nameError) errors.push(nameError);

  if (
    position.department_id === null ||
    position.department_id === undefined ||
    (typeof position.department_id !== "number") ||
    isNaN(position.department_id)
  ) {
    errors.push({ field: "department_id", message: "Department is required" });
  }

  if (
    position.grade === null ||
    position.grade === undefined ||
    (typeof position.grade !== "number") ||
    isNaN(position.grade)
  ) {
    errors.push({ field: "grade", message: "Grade is required" });
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? position : undefined,
    errors
  };
}

/**
 * Validates a grade object
 */
export function validateGrade(grade: any): ValidationResult {
  const errors: ValidationError[] = [];

  const nameError = validateStringLength(grade.name, 'name', 1, 50);
  if (nameError) errors.push(nameError);

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? grade : undefined,
    errors
  };
}

/**
 * Helper function to convert validation errors to object format (like Zod used to)
 */
export function validationErrorsToObject(errors: ValidationError[]): Record<string, string> {
  const errorObj: Record<string, string> = {};
  errors.forEach(error => {
    errorObj[error.field] = error.message;
  });
  return errorObj;
}

/**
 * Validates company basics information
 */
export function validateCompanyBasics(companyBasics: any): ValidationResult {
  const errors: ValidationError[] = [];

  const companyNameError = validateStringLength(companyBasics.company_name, 'company_name', 1);
  if (companyNameError) errors.push(companyNameError);

  const companyIdError = validateStringLength(companyBasics.company_id, 'company_id', 1);
  if (companyIdError) errors.push(companyIdError);

  const industryIdError = validateStringLength(companyBasics.industry_id, 'industry_id', 1);
  if (industryIdError) errors.push(industryIdError);

  const countryIdError = validateStringLength(companyBasics.country_id, 'country_id', 1);
  if (countryIdError) errors.push(countryIdError);

  // Validate boolean fields
  if (typeof companyBasics.live_absent_enabled !== 'boolean') {
    errors.push({ field: 'live_absent_enabled', message: 'Live absent tracking setting is required' });
  }

  if (typeof companyBasics.live_payroll_enabled !== 'boolean') {
    errors.push({ field: 'live_payroll_enabled', message: 'Live payroll setting is required' });
  }

  // Validate payroll generation day (1-31)
  const payrollDayError = validateNumber(companyBasics.payroll_generation_day, 'payroll_generation_day', 1, 31);
  if (payrollDayError) errors.push(payrollDayError);

  // Validate fiscal year start date
  const fiscalYearError = validateDate(companyBasics.fiscal_year_start, 'fiscal_year_start');
  if (fiscalYearError) errors.push(fiscalYearError);

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? companyBasics : undefined,
    errors
  };
}

/**
 * Validates basic information
 */
export function validateBasicInfo(basicInfo: any): ValidationResult {
  const errors: ValidationError[] = [];

  const firstNameError = validateStringLength(basicInfo.first_name, 'first_name', 1);
  if (firstNameError) errors.push(firstNameError);

  const lastNameError = validateStringLength(basicInfo.last_name, 'last_name', 1);
  if (lastNameError) errors.push(lastNameError);

  if (!basicInfo.email || typeof basicInfo.email !== 'string') {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(basicInfo.email)) {
    errors.push({ field: 'email', message: 'Invalid email address' });
  }

  const phoneError = validateStringLength(basicInfo.phone_number, 'phone_number', 1);
  if (phoneError) errors.push(phoneError);

  if (typeof basicInfo.department_id !== 'number' || basicInfo.department_id < 0) {
    errors.push({ field: 'department_id', message: 'Department is required' });
  }

  const designationError = validateStringLength(basicInfo.designation, 'designation', 1);
  if (designationError) errors.push(designationError);

  const jobStatusError = validateStringLength(basicInfo.job_status, 'job_status', 1);
  if (jobStatusError) errors.push(jobStatusError);

  if (!basicInfo.hire_date || isNaN(Date.parse(basicInfo.hire_date))) {
    errors.push({ field: 'hire_date', message: 'Please enter a valid date' });
  }

  const idError = validateStringLength(basicInfo.id_input, 'id_input', 1);
  if (idError) errors.push(idError);

  // Validate basic salary if provided (optional field, but must be valid number if present)
  if (basicInfo.basic_salary !== undefined && basicInfo.basic_salary !== null) {
    const salaryError = validateNumber(Number(basicInfo.basic_salary), 'basic_salary', 0);
    if (salaryError) errors.push(salaryError);
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? basicInfo : undefined,
    errors
  };
}

/**
 * Validates personal information (all fields optional)
 */
export function validatePersonalInfo(personalInfo: any): ValidationResult {
  const errors: ValidationError[] = [];

  // All fields are optional for personal info, so basic validation
  return {
    success: true,
    data: personalInfo,
    errors
  };
}

/**
 * Validates onboarding form data
 */
export function validateOnboardingForm(formData: any): ValidationResult {
  const errors: ValidationError[] = [];

  const firstNameError = validateStringLength(formData.first_name, 'first_name', 1);
  if (firstNameError) errors.push(firstNameError);

  const lastNameError = validateStringLength(formData.last_name, 'last_name', 1);
  if (lastNameError) errors.push(lastNameError);

  if (!formData.email || typeof formData.email !== 'string') {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.push({ field: 'email', message: 'Invalid email address' });
  }

  const phoneError = validateStringLength(formData.phone_number, 'phone_number', 1);
  if (phoneError) errors.push(phoneError);

  // if (!formData.department_id || (typeof formData.department_id !== 'number' && isNaN(Number(formData.department_id)))) {
  //   errors.push({ field: 'department_id', message: 'Department is required' });
  // }

  const designationError = validateStringLength(formData.designation, 'designation', 1);
  if (designationError) errors.push(designationError);

  const validJobStatuses = Object.values(JOB_STATUS);
  if (!formData.job_status || !validJobStatuses.includes(formData.job_status)) {
    errors.push({ field: 'job_status', message: 'Job status is required' });
  }

  if (!formData.hire_date || isNaN(Date.parse(formData.hire_date))) {
    errors.push({ field: 'hire_date', message: 'Please enter a valid date' });
  }

  const companyNameError = validateStringLength(formData.company_name, 'company_name', 1);
  if (companyNameError) errors.push(companyNameError);

  if (typeof formData.company_id !== 'number' || formData.company_id < 0) {
    errors.push({ field: 'company_id', message: 'Company ID is required' });
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? formData : undefined,
    errors
  };
}
