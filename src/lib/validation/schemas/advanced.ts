// Advanced validation schemas for complex entities
import { Notice } from '@/lib/types';
import { ValidationResult, ValidationError, validateString, validateNumber, validateRequired, validateEmail } from './common';

// Education/Experience validation (Schooling)
export interface EducationData {
  type: any; // SchoolingType
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

export function validateEducation(data: EducationData): ValidationResult<EducationData> {
  const errors: ValidationError[] = [];

  // Validate required fields
  const requiredError = validateRequired(data.type, 'type');
  if (requiredError) errors.push(requiredError);

  const nameError = validateString(data.name, 'name', { required: true, minLength: 2, maxLength: 100 });
  if (nameError) errors.push(nameError);

  const instituteError = validateString(data.institute, 'institute', { required: true, minLength: 2, maxLength: 200 });
  if (instituteError) errors.push(instituteError);

  const fromDateError = validateRequired(data.from_date, 'from_date');
  if (fromDateError) errors.push(fromDateError);

  const toDateError = validateRequired(data.to_date, 'to_date');
  if (toDateError) errors.push(toDateError);

  const resultError = validateString(data.result, 'result', { required: true, maxLength: 50 });
  if (resultError) errors.push(resultError);

  // Validate date logic
  if (data.from_date && data.to_date && new Date(data.from_date) > new Date(data.to_date)) {
    errors.push({ field: 'to_date', message: 'End date must be after start date' });
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

export interface ExperienceData {
  company_name: string;
  designation: string;
  from_date: string;
  to_date: string;
  description?: string;
  employee_id?: string;
  company_id?: number;
  id?: number;
}

export function validateExperience(data: ExperienceData): ValidationResult<ExperienceData> {
  const errors: ValidationError[] = [];

  // Validate required fields
  const companyError = validateString(data.company_name, 'company_name', { required: true, minLength: 2, maxLength: 100 });
  if (companyError) errors.push(companyError);

  const designationError = validateString(data.designation, 'designation', { required: true, minLength: 2, maxLength: 100 });
  if (designationError) errors.push(designationError);

  const fromDateError = validateRequired(data.from_date, 'from_date');
  if (fromDateError) errors.push(fromDateError);

  // Validate description if provided
  if (data.description) {
    const descError = validateString(data.description, 'description', { maxLength: 1000 });
    if (descError) errors.push(descError);
  }

  // Validate date logic
  if (data.to_date && data.from_date &&
    new Date(data.from_date) > new Date(data.to_date)) {
    errors.push({ field: 'to_date', message: 'End date must be after start date' });
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Project Management validation
export interface ProjectData {
  id?: number;
  project_title: string;
  description?: string;
  start_date: string;
  end_date: string;
  project_lead_id: string;
  remark?: string;
  department_id?: number;
  goal?: string;
  progress?: number | null;
  status: string;
  company_id?: number;
  assignees?: string[];
}

export function validateProject(data: ProjectData): ValidationResult<ProjectData> {
  const errors: ValidationError[] = [];

  // Validate required fields
  const titleError = validateString(data.project_title, 'project_title', { required: true, minLength: 2, maxLength: 100 });
  if (titleError) errors.push(titleError);

  const startDateError = validateRequired(data.start_date, 'start_date');
  if (startDateError) errors.push(startDateError);

  const endDateError = validateRequired(data.end_date, 'end_date');
  if (endDateError) errors.push(endDateError);

  const statusError = validateRequired(data.status, 'status');
  if (statusError) errors.push(statusError);

  const leadError = validateString(data.project_lead_id, 'project_lead_id', { required: true });
  if (leadError) errors.push(leadError);

  // Validate optional fields
  if (data.description) {
    const descError = validateString(data.description, 'description', { maxLength: 1000 });
    if (descError) errors.push(descError);
  }

  if (data.remark) {
    const remarkError = validateString(data.remark, 'remark', { maxLength: 500 });
    if (remarkError) errors.push(remarkError);
  }

  if (data.goal) {
    const goalError = validateString(data.goal, 'goal', { maxLength: 500 });
    if (goalError) errors.push(goalError);
  }

  if (data.progress !== undefined && data.progress !== null) {
    const progressError = validateNumber(data.progress, 'progress', { min: 0, max: 100 });
    if (progressError) errors.push(progressError);
  }

  if (data.department_id !== undefined) {
    const deptError = validateNumber(data.department_id, 'department_id', { min: 1 });
    if (deptError) errors.push(deptError);
  }

  // Validate date logic
  if (data.end_date && data.start_date && new Date(data.start_date) > new Date(data.end_date)) {
    errors.push({ field: 'end_date', message: 'End date must be after start date' });
  }

  // Validate assignees if provided
  if (data.assignees && !Array.isArray(data.assignees)) {
    errors.push({ field: 'assignees', message: 'Assignees must be an array' });
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

export interface MilestoneData {
  id?: number;
  milestone_title: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: string;
  weightage: number | undefined;
  project_id?: string;
  company_id?: number;
  assignees?: string[];
}

export function validateMilestone(data: MilestoneData): ValidationResult<MilestoneData> {
  const errors: ValidationError[] = [];

  // Validate milestone title
  const titleError = validateString(data.milestone_title, 'milestone_title', { required: true, minLength: 2, maxLength: 100 });
  if (titleError) errors.push(titleError);

  // Validate description (optional)
  if (data.description) {
    const descError = validateString(data.description, 'description', { maxLength: 500 });
    if (descError) errors.push(descError);
  }

  // Validate dates
  const startDateError = validateRequired(data.start_date, 'start_date');
  if (startDateError) errors.push(startDateError);

  const endDateError = validateRequired(data.end_date, 'end_date');
  if (endDateError) errors.push(endDateError);

  // Validate date logic
  if (data.start_date && data.end_date && new Date(data.start_date) > new Date(data.end_date)) {
    errors.push({ field: 'end_date', message: 'End date must be after start date' });
  }

  // Validate weightage
  const weightageError = validateNumber(data.weightage, 'weightage', { required: true, min: 0, max: 100 });
  if (weightageError) errors.push(weightageError);

  // Validate status
  // const statusError = validateString(data.status, 'status', { required: true });
  // if (statusError) errors.push(statusError);

  // Validate project_id if provided
  // if (data.project_id !== undefined) {
  //   const projectError = validateNumber(data.project_id, 'project_id', { min: 1 });
  //   if (projectError) errors.push(projectError);
  // }

  // Validate assignees if provided
  if (data.assignees && !Array.isArray(data.assignees)) {
    errors.push({ field: 'assignees', message: 'Assignees must be an array' });
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Task validation
export interface TaskData {
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
}

export function validateTask(data: TaskData): ValidationResult<TaskData> {
  const errors: ValidationError[] = [];

  // Validate required fields
  const titleError = validateString(data.task_title, 'task_title', { required: true, minLength: 2, maxLength: 200 });
  if (titleError) errors.push(titleError);

  const descriptionError = validateString(data.task_description, 'task_description', { required: true, minLength: 1, maxLength: 1000 });
  if (descriptionError) errors.push(descriptionError);

  const priorityError = validateRequired(data.priority, 'priority');
  if (priorityError) errors.push(priorityError);

  const startDateError = validateRequired(data.start_date, 'start_date');
  if (startDateError) errors.push(startDateError);

  const endDateError = validateRequired(data.end_date, 'end_date');
  if (endDateError) errors.push(endDateError);

  // Validate optional fields
  if (data.project_id !== undefined && data.project_id !== null && data.project_id !== '') {
    const projectIdError = validateString(data.project_id, 'project_id', { required: false, minLength: 1 });
    if (projectIdError) errors.push(projectIdError);
  }
  if (data.milestone_id !== undefined && data.milestone_id !== null) {
    const milestoneError = validateNumber(data.milestone_id, 'milestone_id', { required: true, min: 0 });
    if (milestoneError) errors.push(milestoneError);
  }

  if (data.department_id !== undefined && data.department_id !== null) {
    const deptError = validateNumber(data.department_id, 'department_id', { required: true, min: 0 });
    if (deptError) errors.push(deptError);
  }

  // Validate date logic
  if (data.start_date && data.end_date && new Date(data.start_date) >= new Date(data.end_date)) {
    errors.push({ field: 'end_date', message: 'End date must be after start date' });
  }

  // Validate assignees (required array)
  if (!data.assignees || !Array.isArray(data.assignees)) {
    errors.push({ field: 'assignees', message: 'Assignees must be an array' });
  }

  // Validate status (optional boolean)
  if (data.status !== undefined && typeof data.status !== 'boolean') {
    errors.push({ field: 'status', message: 'Status must be a True/False value' });
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Claim Type validation
export interface ClaimTypeData {
  settlement_item: string;
  allowance: number;
  settler_id: string;
  settlement_level_id?: number;
}

export function validateClaimType(data: ClaimTypeData): ValidationResult<ClaimTypeData> {
  const errors: ValidationError[] = [];

  // Validate settlement_item
  const itemError = validateString(data.settlement_item, 'settlement_item', { required: true, minLength: 1, maxLength: 25 });
  if (itemError) errors.push(itemError);

  // Validate allowance
  const allowanceError = validateNumber(data.allowance, 'allowance', { required: true, min: 1 });
  if (allowanceError) errors.push(allowanceError);

  // Validate settler_id
  if (data.settler_id === undefined || data.settler_id === null || data.settler_id === '') {
    errors.push({ field: 'settler_id', message: 'Settler is required' });
  } else {
    const settlerError = validateString(data.settler_id, 'settler_id', { required: true });
    if (settlerError) errors.push(settlerError);
  }

  // Validate settlement_level_id if provided
  if (data.settlement_level_id !== undefined && data.settlement_level_id !== 0) {
    const levelError = validateNumber(data.settlement_level_id, 'settlement_level_id', { min: 1 });
    if (levelError) errors.push(levelError);
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Lineage validation (for individual lineage records)
export interface LineageData {
  name: string;
  hierarchical_level: number;
  position_id: number;
  company_id?: number;
  id?: number;
}

// Lineage form data (for creating hierarchies)
export interface LineageFormData {
  name: string;
  hierarchy: Array<{
    level: number;
    position_id: number | null;
  }>;
}

export function validateLineage(data: LineageData): ValidationResult<LineageData> {
  const errors: ValidationError[] = [];

  // Validate name
  const nameError = validateString(data.name, 'name', { required: true, minLength: 2, maxLength: 100 });
  if (nameError) errors.push(nameError);

  // Validate hierarchical_level
  const levelError = validateNumber(data.hierarchical_level, 'hierarchical_level', { required: true, min: 1 });
  if (levelError) errors.push(levelError);

  // Validate position_id
  const positionError = validateNumber(data.position_id, 'position_id', { required: true, min: 1 });
  if (positionError) errors.push(positionError);

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

export function validateLineageForm(data: LineageFormData): ValidationResult<LineageFormData> {
  const errors: ValidationError[] = [];

  // Validate name
  const nameError = validateString(data.name, 'name', { required: true, minLength: 2, maxLength: 100 });
  if (nameError) errors.push(nameError);

  // Validate hierarchy
  if (!data.hierarchy || !Array.isArray(data.hierarchy)) {
    errors.push({ field: 'hierarchy', message: 'Hierarchy is required' });
  } else if (data.hierarchy.length === 0) {
    errors.push({ field: 'hierarchy', message: 'At least one level is required' });
  } else {
    // Validate each hierarchy level
    data.hierarchy.forEach((level, index) => {
      if (level.position_id === null || level.position_id === undefined) {
        errors.push({ field: `hierarchy[${index}].position_id`, message: `Position is required for level ${level.level}` });
      }

      const levelError = validateNumber(level.level, `hierarchy[${index}].level`, { required: true, min: 1 });
      if (levelError) errors.push(levelError);
    });

    // Check for duplicate position_ids
    const positionIds = data.hierarchy.map(h => h.position_id).filter(id => id !== null);
    const uniquePositionIds = new Set(positionIds);
    if (positionIds.length !== uniquePositionIds.size) {
      errors.push({ field: 'hierarchy', message: 'Each position can only be used once in the hierarchy' });
    }
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Notice validation
export interface NoticeData {
  id?: number;
  notice_type_id?: number;
  title: string;
  description: string;
  urgency: string;
  valid_from: string;
  valid_till: string;
  company_id?: number;
  department_id?: number;
}

export function validateNotice(data: Notice): ValidationResult<Notice> {
  const errors: ValidationError[] = [];

  // Validate title
  const titleError = validateString(data.title, 'title', { required: true, minLength: 3, maxLength: 200 });
  if (titleError) errors.push(titleError);

  // Validate description
  const descriptionError = validateString(data.description, 'description', { required: true, minLength: 10, maxLength: 1000 });
  if (descriptionError) errors.push(descriptionError);

  // Validate urgency
  const urgencyError = validateString(data.urgency, 'urgency', { required: true });
  if (urgencyError) errors.push(urgencyError);

  // Validate dates
  const validFromError = validateRequired(data.valid_from, 'valid_from');
  if (validFromError) errors.push(validFromError);

  const validTillError = validateRequired(data.valid_till, 'valid_till');
  if (validTillError) errors.push(validTillError);

  // Validate date logic
  if (data.valid_from && data.valid_till && new Date(data.valid_from) > new Date(data.valid_till)) {
    errors.push({ field: 'valid_till', message: 'End date must be after start date' });
  }

  // Validate notice_type_id if provided
  if (data.notice_type_id !== undefined) {
    const typeError = validateNumber(data.notice_type_id, 'notice_type_id', { min: 1 });
    if (typeError) errors.push(typeError);
  }

  if (data.department_id !== undefined) {
    const departmentError = validateNumber(data.department_id, 'department_id', { required: false, min: 1 });
    if (departmentError) errors.push(departmentError);
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Leave validation
export interface LeaveData {
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

export function validateLeave(data: LeaveData): ValidationResult<LeaveData> {
  const errors: ValidationError[] = [];

  // Validate required fields
  const startDateError = validateRequired(data.start_date, 'start_date');
  if (startDateError) errors.push(startDateError);

  const endDateError = validateRequired(data.end_date, 'end_date');
  if (endDateError) errors.push(endDateError);

  const statusError = validateString(data.status, 'status', { required: true });
  if (statusError) errors.push(statusError);

  // Validate optional fields
  if (data.remarks) {
    const remarksError = validateString(data.remarks, 'remarks', { maxLength: 500 });
    if (remarksError) errors.push(remarksError);
  }

  if (data.description) {
    const descError = validateString(data.description, 'description', { maxLength: 1000 });
    if (descError) errors.push(descError);
  }

  if (data.type_id !== undefined) {
    const typeError = validateNumber(data.type_id, 'type_id', { min: 1 });
    if (typeError) errors.push(typeError);
  }

  // Validate date logic
  if (data.start_date && data.end_date && new Date(data.start_date) > new Date(data.end_date)) {
    errors.push({ field: 'end_date', message: 'End date must be after start date' });
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Comment validation
export interface CommentData {
  id?: number;
  comment: string;
  commenter_id: string;
  project_id?: string;
  company_id?: number;
  created_at?: Date;
  updated_at?: Date;
}

export function validateComment(data: CommentData): ValidationResult<CommentData> {
  const errors: ValidationError[] = [];

  // Validate required fields
  const commentError = validateString(data.comment, 'comment', { required: true, minLength: 1, maxLength: 1000 });
  if (commentError) errors.push(commentError);

  const commenterError = validateString(data.commenter_id, 'commenter_id', { required: true });
  if (commenterError) errors.push(commenterError);

  // Validate optional fields
  if (data.project_id !== undefined) {
    const projectError = validateNumber(data.project_id, 'project_id', { min: 1 });
    if (projectError) errors.push(projectError);
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Requisition validation
export interface RequisitionData {
  id?: number;
  requisition_category_id?: number;
  employee_id?: string;
  item_id?: number;
  asset_owner?: string;
  description?: string;
  quantity: number;
  approved_by_id?: string;
  status: string;
  company_id?: number;
  date: string;
  is_one_off: boolean;
  from_time?: string;
  to_time?: string;
  attachments?: string[];
  comment?: string;
  remark?: string;
}

export function validateRequisition(data: RequisitionData): ValidationResult<RequisitionData> {
  const errors: ValidationError[] = [];

  // Validate required fields
  const quantityError = validateNumber(data.quantity, 'quantity', { required: true, min: 1 });
  if (quantityError) errors.push(quantityError);

  const statusError = validateString(data.status, 'status', { required: true });
  if (statusError) errors.push(statusError);

  const dateError = validateRequired(data.date, 'date');
  if (dateError) errors.push(dateError);

  // Validate optional fields
  if (data.description) {
    const descError = validateString(data.description, 'description', { maxLength: 500 });
    if (descError) errors.push(descError);
  }

  if (data.comment) {
    const commentError = validateString(data.comment, 'comment', { maxLength: 500 });
    if (commentError) errors.push(commentError);
  }

  if (data.remark) {
    const remarkError = validateString(data.remark, 'remark', { maxLength: 500 });
    if (remarkError) errors.push(remarkError);
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Settlement Record validation
export interface SettlementRecordData {
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
}

export function validateSettlementRecord(data: SettlementRecordData): ValidationResult<SettlementRecordData> {
  const errors: ValidationError[] = [];

  // Validate required fields
  const eventDateError = validateRequired(data.event_date, 'event_date');
  if (eventDateError) errors.push(eventDateError);

  const amountError = validateNumber(data.amount, 'amount', { required: true, min: 0 });
  if (amountError) errors.push(amountError);

  const statusError = validateString(data.status, 'status', { required: true });
  if (statusError) errors.push(statusError);

  // Validate optional fields
  if (data.description) {
    const descError = validateString(data.description, 'description', { maxLength: 500 });
    if (descError) errors.push(descError);
  }

  if (data.comment) {
    const commentError = validateString(data.comment, 'comment', { maxLength: 500 });
    if (commentError) errors.push(commentError);
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Complaint Record validation
export interface ComplaintRecordData {
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
}

export function validateComplaintRecord(data: ComplaintRecordData): ValidationResult<ComplaintRecordData> {
  const errors: ValidationError[] = [];

  // Validate required fields
  const complainerError = validateString(data.complainer_id, 'complainer_id', { required: true });
  if (complainerError) errors.push(complainerError);

  const descriptionError = validateString(data.description, 'description', { required: true, minLength: 10, maxLength: 1000 });
  if (descriptionError) errors.push(descriptionError);

  const statusError = validateString(data.status, 'status', { required: true });
  if (statusError) errors.push(statusError);

  const againstWhomError = validateString(data.against_whom, 'against_whom', { required: true });
  if (againstWhomError) errors.push(againstWhomError);

  // Validate optional fields
  if (data.comment) {
    const commentError = validateString(data.comment, 'comment', { maxLength: 500 });
    if (commentError) errors.push(commentError);
  }

  if (data.complaint_type_id !== undefined) {
    const typeError = validateNumber(data.complaint_type_id, 'complaint_type_id', { min: 1 });
    if (typeError) errors.push(typeError);
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Attendance validation
export interface AttendanceData {
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

export function validateAttendance(data: AttendanceData): ValidationResult<AttendanceData> {
  const errors: ValidationError[] = [];

  // Validate required fields
  const dateError = validateRequired(data.attendance_date, 'attendance_date');
  if (dateError) errors.push(dateError);

  const tagError = validateString(data.tag, 'tag', { required: true });
  if (tagError) errors.push(tagError);

  const employeeError = validateString(data.employee_id, 'employee_id', { required: true });
  if (employeeError) errors.push(employeeError);

  // Validate optional fields
  if (data.site_id !== undefined) {
    const siteError = validateNumber(data.site_id, 'site_id', { min: 1 });
    if (siteError) errors.push(siteError);
  }

  // Validate coordinates if provided
  if (data.check_in_coordinates) {
    const xError = validateNumber(data.check_in_coordinates.x, 'check_in_coordinates.x', { required: true });
    if (xError) errors.push(xError);

    const yError = validateNumber(data.check_in_coordinates.y, 'check_in_coordinates.y', { required: true });
    if (yError) errors.push(yError);
  }

  if (data.check_out_coordinates) {
    const xError = validateNumber(data.check_out_coordinates.x, 'check_out_coordinates.x', { required: true });
    if (xError) errors.push(xError);

    const yError = validateNumber(data.check_out_coordinates.y, 'check_out_coordinates.y', { required: true });
    if (yError) errors.push(yError);
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Company Basics validation
export interface CompanyBasicsData {
  company_name: string;
  company_id: string;
  industry_id: string;
  country_id: string;
}

export function validateCompanyBasics(data: CompanyBasicsData): ValidationResult<CompanyBasicsData> {
  const errors: ValidationError[] = [];

  // Validate required fields
  const nameError = validateString(data.company_name, 'company_name', { required: true, minLength: 2, maxLength: 100 });
  if (nameError) errors.push(nameError);

  const companyIdError = validateString(data.company_id, 'company_id', { required: true });
  if (companyIdError) errors.push(companyIdError);

  const industryError = validateString(data.industry_id, 'industry_id', { required: true });
  if (industryError) errors.push(industryError);

  const countryError = validateString(data.country_id, 'country_id', { required: true });
  if (countryError) errors.push(countryError);

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Basic Info validation
export interface BasicInfoData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  department_id: number;
  designation: string;
  job_status: string;
  hire_date: string;
  id_input: string;
}

export function validateBasicInfo(data: BasicInfoData): ValidationResult<BasicInfoData> {
  const errors: ValidationError[] = [];

  // Validate required fields
  const firstNameError = validateString(data.first_name, 'first_name', { required: true, minLength: 1, maxLength: 50 });
  if (firstNameError) errors.push(firstNameError);

  const lastNameError = validateString(data.last_name, 'last_name', { required: true, minLength: 1, maxLength: 50 });
  if (lastNameError) errors.push(lastNameError);

  const emailError = validateEmail(data.email, 'email', true);
  if (emailError) errors.push(emailError);

  const phoneError = validateString(data.phone_number, 'phone_number', { required: true, minLength: 10, maxLength: 15 });
  if (phoneError) errors.push(phoneError);

  const deptError = validateNumber(data.department_id, 'department_id', { required: true, min: 1 });
  if (deptError) errors.push(deptError);

  const designationError = validateString(data.designation, 'designation', { required: true, maxLength: 100 });
  if (designationError) errors.push(designationError);

  const statusError = validateString(data.job_status, 'job_status', { required: true });
  if (statusError) errors.push(statusError);

  const hireDateError = validateRequired(data.hire_date, 'hire_date');
  if (hireDateError) errors.push(hireDateError);

  const idInputError = validateString(data.id_input, 'id_input', { required: true });
  if (idInputError) errors.push(idInputError);

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Personal Info validation
export interface PersonalInfoData {
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

export function validatePersonalInfo(data: PersonalInfoData): ValidationResult<PersonalInfoData> {
  const errors: ValidationError[] = [];

  // All fields are optional, but validate formats if provided
  if (data.gender) {
    const genderError = validateString(data.gender, 'gender', { maxLength: 20 });
    if (genderError) errors.push(genderError);
  }

  if (data.religion) {
    const religionError = validateString(data.religion, 'religion', { maxLength: 50 });
    if (religionError) errors.push(religionError);
  }

  if (data.blood_group) {
    const bloodError = validateString(data.blood_group, 'blood_group', { maxLength: 10 });
    if (bloodError) errors.push(bloodError);
  }

  if (data.marital_status) {
    const maritalError = validateString(data.marital_status, 'marital_status', { maxLength: 20 });
    if (maritalError) errors.push(maritalError);
  }

  if (data.nid_no) {
    const nidError = validateString(data.nid_no, 'nid_no', { maxLength: 20 });
    if (nidError) errors.push(nidError);
  }

  if (data.father_name) {
    const fatherError = validateString(data.father_name, 'father_name', { maxLength: 100 });
    if (fatherError) errors.push(fatherError);
  }

  if (data.mother_name) {
    const motherError = validateString(data.mother_name, 'mother_name', { maxLength: 100 });
    if (motherError) errors.push(motherError);
  }

  if (data.spouse_name) {
    const spouseError = validateString(data.spouse_name, 'spouse_name', { maxLength: 100 });
    if (spouseError) errors.push(spouseError);
  }

  if (data.emergency_contact_name) {
    const emergencyNameError = validateString(data.emergency_contact_name, 'emergency_contact_name', { maxLength: 100 });
    if (emergencyNameError) errors.push(emergencyNameError);
  }

  if (data.emergency_contact_relation) {
    const emergencyRelationError = validateString(data.emergency_contact_relation, 'emergency_contact_relation', { maxLength: 50 });
    if (emergencyRelationError) errors.push(emergencyRelationError);
  }

  if (data.emergency_contact_phone) {
    const emergencyPhoneError = validateString(data.emergency_contact_phone, 'emergency_contact_phone', { maxLength: 15 });
    if (emergencyPhoneError) errors.push(emergencyPhoneError);
  }

  if (data.permanent_address) {
    const addressError = validateString(data.permanent_address, 'permanent_address', { maxLength: 500 });
    if (addressError) errors.push(addressError);
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Onboarding Form Data validation
export interface OnboardingFormDataType {
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
}

export function validateOnboardingForm(data: OnboardingFormDataType): ValidationResult<OnboardingFormDataType> {
  const errors: ValidationError[] = [];

  // Validate required fields
  const firstNameError = validateString(data.first_name, 'first_name', { required: true, minLength: 1, maxLength: 50 });
  if (firstNameError) errors.push(firstNameError);

  const lastNameError = validateString(data.last_name, 'last_name', { required: true, minLength: 1, maxLength: 50 });
  if (lastNameError) errors.push(lastNameError);

  const emailError = validateEmail(data.email, 'email', true);
  if (emailError) errors.push(emailError);

  const phoneError = validateString(data.phone_number, 'phone_number', { required: true, minLength: 10, maxLength: 15 });
  if (phoneError) errors.push(phoneError);

  const designationError = validateString(data.designation, 'designation', { required: true, maxLength: 100 });
  if (designationError) errors.push(designationError);

  const statusError = validateString(data.job_status, 'job_status', { required: true });
  if (statusError) errors.push(statusError);

  const hireDateError = validateRequired(data.hire_date, 'hire_date');
  if (hireDateError) errors.push(hireDateError);

  const companyNameError = validateString(data.company_name, 'company_name', { required: true, minLength: 2, maxLength: 100 });
  if (companyNameError) errors.push(companyNameError);

  const companyIdError = validateNumber(data.company_id, 'company_id', { required: true, min: 1 });
  if (companyIdError) errors.push(companyIdError);

  // Validate optional fields
  if (data.department_id !== null) {
    const deptError = validateNumber(data.department_id, 'department_id', { min: 1 });
    if (deptError) errors.push(deptError);
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}
