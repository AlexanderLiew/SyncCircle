/**
 * GET /planning-sessions — List planning sessions for the authenticated user.
 *
 * Queries all planning sessions where the user is the Creator,
 * ordered by createdAt descending.
 *
 * Validates: Requirements 7.1
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ERROR_CODES } from '@synccircle/shared';
import type { ListSessionsResponse } from '../../types/ai-planner.types.js';
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

    // 2. Query sessions by creatorUserId (ordered by createdAt desc via GSI)
    const sessions = await planningSessionRepo.queryByCreatorUserId(userId);

    // 3. Return the sessions
    const response: ListSessionsResponse = { sessions };

    logger.info('Listed planning sessions', {
      userId,
      count: sessions.length,
    });

    return success(response);
  } catch (err) {
    logger.error('Unexpected error in listSessions handler', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });

    return error(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
  }
}
