// ============================================================
// CramCircle — Pure Form Validation Functions
// ============================================================

/**
 * Validation result returned by all validator functions.
 * When `valid` is true, `errors` will be an empty object.
 * When `valid` is false, `errors` maps field names to error messages.
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates an email address format.
 * Uses a reasonable regex for standard email validation.
 */
export function validateEmail(email: string): ValidationResult {
  const errors: Record<string, string> = {};

  const trimmed = email.trim();
  if (!trimmed) {
    errors.email = 'Email is required';
  } else {
    // Standard email format: local@domain.tld
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      errors.email = 'Please enter a valid email address';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validates a password meets minimum requirements (at least 8 characters).
 */
export function validatePassword(password: string): ValidationResult {
  const errors: Record<string, string> = {};

  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validates the class form data.
 * All fields are required, and endTime must be strictly after startTime.
 * Time strings are expected in "HH:mm" format.
 */
export function validateClassForm(data: {
  title: string;
  moduleCode: string;
  location: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.title.trim()) {
    errors.title = 'Title is required';
  }

  if (!data.moduleCode.trim()) {
    errors.moduleCode = 'Module code is required';
  }

  if (!data.location.trim()) {
    errors.location = 'Location is required';
  }

  if (data.dayOfWeek < 0 || data.dayOfWeek > 4 || !Number.isInteger(data.dayOfWeek)) {
    errors.dayOfWeek = 'Day of week must be between 0 (Monday) and 4 (Friday)';
  }

  if (!data.startTime.trim()) {
    errors.startTime = 'Start time is required';
  }

  if (!data.endTime.trim()) {
    errors.endTime = 'End time is required';
  }

  // Only validate time ordering if both times are provided
  if (data.startTime.trim() && data.endTime.trim()) {
    if (data.endTime <= data.startTime) {
      errors.endTime = 'End time must be after start time';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validates the task form data.
 * Title must be non-empty (after trimming whitespace).
 */
export function validateTaskForm(data: { title: string }): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.title.trim()) {
    errors.title = 'Task title is required';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validates the group join form data.
 * Group name must be non-empty, and password must be exactly 4 numeric digits.
 */
export function validateGroupJoin(data: {
  groupName: string;
  password: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.groupName.trim()) {
    errors.groupName = 'Group name is required';
  }

  if (!data.password) {
    errors.password = 'Password is required';
  } else if (!/^\d{4}$/.test(data.password)) {
    errors.password = 'Password must be exactly 4 numeric digits';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
