/**
 * GET /planning-sessions/{sessionId} — Get a planning session by ID.
 *
 * Returns the full Planning_Session including generated options and status,
 * only if the authenticated user is the Creator. Returns FORBIDDEN otherwise.
 *
 * Validates: Requirements 7.2, 7.5
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ERROR_CODES } from '@synccircle/shared';
import type { GetSessionResponse } from '../../types/ai-planner.types.js';
import * as planningSessionRepo from '../../repositories/planning-session.repo.js';
import { success, error } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

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

    // 3. Get the session from the repository
    const session = await planningSessionRepo.getById(sessionId);

    if (!session) {
      return error(404, ERROR_CODES.NOT_FOUND, 'Planning session not found');
    }

    // 4. Verify authorization — only the Creator can view
    if (session.creatorUserId !== userId) {
      return error(403, ERROR_CODES.FORBIDDEN, 'You are not authorized to view this planning session');
    }

    // 5. Return the session
    const response: GetSessionResponse = { session };

    logger.info('Retrieved planning session', {
      userId,
      sessionId,
    });

    return success(response);
  } catch (err) {
    logger.error('Unexpected error in getSession handler', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });

    return error(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
  }
}
