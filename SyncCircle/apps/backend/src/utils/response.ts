/**
 * HTTP response helpers for Lambda handlers.
 *
 * All responses follow a consistent structure with JSON body,
 * CORS headers, and appropriate status codes.
 */

import type { ErrorCode, ErrorResponse } from '@synccircle/shared';

export interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

/**
 * Returns a 200 OK response with the given body.
 */
export function success(body: unknown): ApiResponse {
  return {
    statusCode: 200,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body),
  };
}

/**
 * Returns a 201 Created response with the given body.
 */
export function created(body: unknown): ApiResponse {
  return {
    statusCode: 201,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body),
  };
}

/**
 * Returns an error response following the ErrorResponse interface.
 */
export function error(
  statusCode: number,
  code: ErrorCode,
  message: string,
  field?: string,
): ApiResponse {
  const errorBody: ErrorResponse = {
    error: message,
    code,
    ...(field !== undefined && { field }),
  };

  return {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(errorBody),
  };
}
