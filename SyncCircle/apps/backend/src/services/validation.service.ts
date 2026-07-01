/**
 * Validation service for the Friends Backend.
 *
 * Provides input validation, email normalization, display name comparison,
 * and self-action detection.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EMAIL_MAX_LENGTH = 254;
const DISPLAY_NAME_MIN_LENGTH = 1;
const DISPLAY_NAME_MAX_LENGTH = 100;
const COURSE_MAX_LENGTH = 100;

/**
 * Practical RFC-compliant email regex.
 * Validates the local part allows alphanumeric, dots, underscores, hyphens, and plus signs.
 * The domain part requires at least one dot with alphanumeric/hyphen segments.
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

// ─── Validation Functions ────────────────────────────────────────────────────

/**
 * Validates an email address for format and length.
 * Does NOT normalize — call `normalizeEmail` separately if needed.
 */
export function validateEmail(email: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof email !== 'string' || email.trim().length === 0) {
    errors.push({ field: 'email', message: 'Email is required' });
    return { valid: false, errors };
  }

  const trimmed = email.trim();

  if (trimmed.length > EMAIL_MAX_LENGTH) {
    errors.push({
      field: 'email',
      message: `Email must not exceed ${EMAIL_MAX_LENGTH} characters`,
    });
    return { valid: false, errors };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    errors.push({ field: 'email', message: 'Email format is invalid' });
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

/**
 * Validates a display name (required, 1-100 chars, non-empty after trimming).
 */
export function validateDisplayName(displayName: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof displayName !== 'string' || displayName.trim().length === 0) {
    errors.push({ field: 'displayName', message: 'Display name is required' });
    return { valid: false, errors };
  }

  const trimmed = displayName.trim();

  if (trimmed.length < DISPLAY_NAME_MIN_LENGTH) {
    errors.push({
      field: 'displayName',
      message: `Display name must be at least ${DISPLAY_NAME_MIN_LENGTH} character(s)`,
    });
    return { valid: false, errors };
  }

  if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
    errors.push({
      field: 'displayName',
      message: `Display name must not exceed ${DISPLAY_NAME_MAX_LENGTH} characters`,
    });
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

/**
 * Validates a course field (optional — if provided, max 100 chars).
 * Returns valid if the value is undefined, null, or an empty string.
 */
export function validateCourse(course: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  // Course is optional — undefined/null/empty is valid
  if (course === undefined || course === null || course === '') {
    return { valid: true, errors: [] };
  }

  if (typeof course !== 'string') {
    errors.push({ field: 'course', message: 'Course must be a string' });
    return { valid: false, errors };
  }

  if (course.length > COURSE_MAX_LENGTH) {
    errors.push({
      field: 'course',
      message: `Course must not exceed ${COURSE_MAX_LENGTH} characters`,
    });
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

// ─── Normalization & Comparison ──────────────────────────────────────────────

/**
 * Normalizes an email address: trims whitespace and converts to lowercase.
 * Idempotent — normalizing an already-normalized email returns the same value.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Compares two display names in a case-insensitive, trim-invariant manner.
 * Returns true if the names match after trimming and lowercasing.
 */
export function compareDisplayNames(nameA: string, nameB: string): boolean {
  return nameA.trim().toLowerCase() === nameB.trim().toLowerCase();
}

/**
 * Checks whether the sender and recipient are the same user.
 * Comparison is done after email normalization (trim + lowercase).
 * Returns true if it's a self-action (i.e., should be rejected).
 */
export function isSelfAction(senderEmail: string, recipientEmail: string): boolean {
  return normalizeEmail(senderEmail) === normalizeEmail(recipientEmail);
}
