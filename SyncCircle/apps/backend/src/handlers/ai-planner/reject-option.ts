/**
 * POST /planning-sessions/{sessionId}/reject-option
 *
 * Rejects a proposed time option and records it in the session's excluded list.
 *
 * Requirements: 4.1, 12.4
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { ErrorCode } from '@synccircle/shared';
import { ERROR_CODES } from '@synccircle/shared';
import { success, error } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { rejectOption } from '../../services/planning-session.service.js';

/** Maps service error codes to HTTP status codes. */
const ERROR_STATUS_MAP: Record<string, number> = {
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SLOT_CONFLICT: 409,
  CONTEXT_UNAVAILABLE: 503,
  VALIDATION_ERROR: 400,
};

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    // 1. Extract userId from JWT claims
    const claims = event.requestContext.authorizer?.claims;
    if (!claims) {
      return error(401, ERROR_CODES.UNAUTHORIZED, 'Missing authentication');
    }
    const userId = claims.sub as string;

    // 2. Extract sessionId from path parameters
    const sessionId = event.pathParameters?.sessionId;
    if (!sessionId) {
      return error(400, ERROR_CODES.VALIDATION_ERROR, 'Missing sessionId path parameter');
    }

    // 3. Parse body for optionId
    if (!event.body) {
      return error(400, ERROR_CODES.VALIDATION_ERROR, 'Request body is required');
    }

    let body: { optionId?: string };
    try {
      body = JSON.parse(event.body);
    } catch {
      return error(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid JSON body');
    }

    const { optionId } = body;
    if (!optionId || typeof optionId !== 'string') {
      return error(400, ERROR_CODES.VALIDATION_ERROR, 'optionId is required');
    }

    // 4. Call service
    const result = await rejectOption(userId, sessionId, optionId);

    // 5. Return result or map error
    if (result.success) {
      return success(result.data);
    }

    const statusCode = ERROR_STATUS_MAP[result.error.code] ?? 500;
    return error(statusCode, result.error.code as ErrorCode, result.error.message);
  } catch (err) {
    logger.error('Unexpected error in reject-option handler', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    return error(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
  }
}
