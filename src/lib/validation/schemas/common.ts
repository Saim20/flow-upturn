// Common validation schemas and utilities without external dependencies
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

/**
 * Maps technical field names to user-friendly labels
 */
const FIELD_LABELS: Record<string, string> = {
  // Common fields
  name: 'Name',
  description: 'Description',
  email: 'Email',
  phone_number: 'Phone number',
  
  // ID fields - these should show the entity name, not the ID
  head_id: 'Head',
  position_id: 'Position',
  department_id: 'Department',
  division_id: 'Division',
  grade_id: 'Grade',
  grade: 'Grade',
  project_id: 'Project',
  company_id: 'Company',
  employee_id: 'Employee',
  supervisor_id: 'Supervisor',
  approved_by_id: 'Approver',
  requested_to: 'Requested to',
  complainer_id: 'Complainer',
  commenter_id: 'Commenter',
  settler_id: 'Settler',
  project_lead_id: 'Project lead',
  against_whom: 'Person complained against',
  notice_type_id: 'Notice type',
  industry_id: 'Industry',
  country_id: 'Country',
  asset_owner: 'Asset owner',
  
  // Date fields
  from_date: 'From date',
  to_date: 'To date',
  start_date: 'Start date',
  end_date: 'End date',
  hire_date: 'Hire date',
  event_date: 'Event date',
  attendance_date: 'Attendance date',
  date: 'Date',
  valid_from: 'Valid from',
  valid_till: 'Valid till',
  fiscal_year_start: 'Fiscal year start',
  
  // Other common fields
  first_name: 'First name',
  last_name: 'Last name',
  company_name: 'Company name',
  designation: 'Designation',
  job_status: 'Job status',
  hierarchical_level: 'Hierarchical level',
  check_in: 'Check-in time',
  check_out: 'Check-out time',
  location: 'Location',
  longitude: 'Longitude',
  latitude: 'Latitude',
  annual_quota: 'Annual quota',
  quantity: 'Quantity',
  allowance: 'Allowance',
  amount: 'Amount',
  weightage: 'Weightage',
  status: 'Status',
  priority: 'Priority',
  tag: 'Tag',
  urgency: 'Urgency',
  type: 'Type',
  title: 'Title',
  result: 'Result',
  institute: 'Institute',
  remarks: 'Remarks',
  comment: 'Comment',
  settlement_item: 'Settlement item',
  project_title: 'Project title',
  milestone_title: 'Milestone title',
  task_title: 'Task title',
  department_ids: 'Departments',
  id_input: 'Employee ID',
  basic_salary: 'Basic salary',
};

/**
 * Gets a user-friendly label for a field name
 */
function getFieldLabel(fieldName: string): string {
  if (FIELD_LABELS[fieldName]) {
    return FIELD_LABELS[fieldName];
  }
  // Fallback: convert snake_case to Title Case
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Common validation utilities
export function validateRequired(value: any, fieldName: string): ValidationError | null {
  const fieldNameReadable = getFieldLabel(fieldName);
  if (value === undefined || value === null || value === '') {
    return { field: fieldName, message: `${fieldNameReadable} is required` };
  }
  return null;
}

export function validateString(value: string, fieldName: string, options: {
  minLength?: number;
  maxLength?: number;
  required?: boolean;
} = {}): ValidationError | null {
  const fieldNameReadable = getFieldLabel(fieldName);
  if (options.required && (!value || value.trim() === '')) {
    return { field: fieldName, message: `${fieldNameReadable} is required` };
  }
  
  if (value && options.minLength && value.length < options.minLength) {
    return { field: fieldName, message: `${fieldNameReadable} must be at least ${options.minLength} characters` };
  }
  
  if (value && options.maxLength && value.length > options.maxLength) {
    return { field: fieldName, message: `${fieldNameReadable} must be less than ${options.maxLength} characters` };
  }
  
  return null;
}

export function validateNumber(value: any, fieldName: string, options: {
  min?: number;
  max?: number;
  required?: boolean;
  integer?: boolean;
} = {}): ValidationError | null {
  const fieldNameReadable = getFieldLabel(fieldName);
  if (options.required && (value === undefined || value === null || value === '')) {
    return { field: fieldName, message: `${fieldNameReadable} is required` };
  }
  
  if (value !== undefined && value !== null && value !== '') {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    const label = getFieldLabel(fieldName);
    
    if (isNaN(num)) {
      return { field: fieldName, message: `${label} must be a valid number` };
    }
    
    if (options.integer && !Number.isInteger(num)) {
      return { field: fieldName, message: `${label} must be an integer` };
    }
    
    if (options.min !== undefined && num < options.min) {
      return { field: fieldName, message: `${label} must be at least ${options.min}` };
    }
    
    if (options.max !== undefined && num > options.max) {
      return { field: fieldName, message: `${label} must be at most ${options.max}` };
    }
  }
  
  return null;
}

export function validateEmail(value: string, fieldName: string, required: boolean = true): ValidationError | null {
  const fieldNameReadable = getFieldLabel(fieldName);
  if (required && (!value || value.trim() === '')) {
    return { field: fieldName, message: `${fieldNameReadable} is required` };
  }
  
  if (value && value.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return { field: fieldName, message: `${fieldNameReadable} must be a valid email address` };
    }
  }
  
  return null;
}

export function validateDate(value: string, fieldName: string, required: boolean = true): ValidationError | null {
  const fieldNameReadable = getFieldLabel(fieldName);
  if (required && (!value || value.trim() === '')) {
    return { field: fieldName, message: `${fieldNameReadable} is required` };
  }
  
  if (value && value.trim()) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) {
      return { field: fieldName, message: `${fieldNameReadable} must be in YYYY-MM-DD format` };
    }
    
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return { field: fieldName, message: `${fieldNameReadable} must be a valid date` };
    }
  }
  
  return null;
}

export function validateTime(value: string, fieldName: string, required: boolean = true): ValidationError | null {
  const fieldNameReadable = getFieldLabel(fieldName);
  if (required && (!value || value.trim() === '')) {
    return { field: fieldName, message: `${fieldNameReadable} is required` };
  }
  
  if (value && value.trim()) {
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(value)) {
      return { field: fieldName, message: `${fieldNameReadable} must be in HH:MM format` };
    }
  }
  
  return null;
}

export function validateUrl(value: string, fieldName: string, required: boolean = false): ValidationError | null {
  const fieldNameReadable = getFieldLabel(fieldName);
  if (required && (!value || value.trim() === '')) {
    return { field: fieldName, message: `${fieldNameReadable} is required` };
  }
  
  if (value && value.trim()) {
    try {
      new URL(value);
    } catch {
      return { field: fieldName, message: `${fieldNameReadable} must be a valid URL` };
    }
  }
  
  return null;
}

// Utility to combine validation results
export function combineValidationResults<T>(
  data: T,
  validationErrors: (ValidationError | null)[]
): ValidationResult<T> {
  const errors = validationErrors.filter(error => error !== null) as ValidationError[];
  
  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Helper to convert validation errors to object format (compatible with existing code)
export function validationErrorsToObject(errors: ValidationError[] = []): Record<string, string> {
  const errorObj: Record<string, string> = {};
  errors.forEach(error => {
    errorObj[error.field] = error.message;
  });
  return errorObj;
}
