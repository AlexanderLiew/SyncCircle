/**
 * Structured JSON logger that strips PII from log output.
 *
 * All log entries are written as single-line JSON to stdout for
 * CloudWatch ingestion. Fields containing sensitive data (email,
 * token, password, secret, authorization) are redacted automatically.
 */

/** Fields that should never appear in logs */
const PII_FIELDS = new Set([
  'email',
  'normalizedemail',
  'normalizedreceiveremail',
  'receiveremail',
  'recipientemail',
  'token',
  'tokenhash',
  'password',
  'secret',
  'authorization',
  'accesstoken',
  'refreshtoken',
  'idtoken',
]);

const REDACTED = '[REDACTED]';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Recursively redacts PII fields from a data object.
 * Returns a new object with sensitive values replaced.
 */
function redactPii(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(redactPii);
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (PII_FIELDS.has(key.toLowerCase())) {
        result[key] = REDACTED;
      } else {
        result[key] = redactPii(value);
      }
    }
    return result;
  }

  return data;
}

function writeLog(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(data ? (redactPii(data) as Record<string, unknown>) : {}),
  };

  console.log(JSON.stringify(entry));
}

export const logger = {
  info(message: string, data?: Record<string, unknown>): void {
    writeLog('info', message, data);
  },

  warn(message: string, data?: Record<string, unknown>): void {
    writeLog('warn', message, data);
  },

  error(message: string, data?: Record<string, unknown>): void {
    writeLog('error', message, data);
  },

  debug(message: string, data?: Record<string, unknown>): void {
    writeLog('debug', message, data);
  },
};
