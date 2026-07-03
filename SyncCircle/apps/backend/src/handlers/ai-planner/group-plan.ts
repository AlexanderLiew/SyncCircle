/**
 * POST /ai-planner/group — Create a group planning session.
 *
 * Extracts userId from JWT, validates the request body including
 * participant list, enforces rate limiting (5 requests/user/minute),
 * then delegates to PlanningSessionService for friendship verification,
 * privacy checks, availability calculation, and AI ranking.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ERROR_CODES } from '@synccircle/shared';
import { success, error } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { checkRateLimit } from './rate-limiter.js';
import {
  createGroupSession,
  type CreateGroupSessionParams,
} from '../../services/planning-session.service.js';
import type { CreateGroupSessionRequest } from '../../types/ai-planner.types.js';

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

    // 2. Enforce rate limiting (5 requests/user/minute)
    if (!checkRateLimit(userId)) {
      logger.warn('Rate limit exceeded for group planning', { userId });
      return error(429, ERROR_CODES.RATE_LIMITED, 'Rate limit exceeded. Maximum 5 planning requests per minute.');
    }

    // 3. Parse and validate request body
    if (!event.body) {
      return error(400, ERROR_CODES.VALIDATION_ERROR, 'Request body is required');
    }

    let body: CreateGroupSessionRequest;
    try {
      body = JSON.parse(event.body) as CreateGroupSessionRequest;
    } catch {
      return error(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid JSON in request body');
    }

    const {
      activity,
      durationMinutes,
      dateRangeStart,
      dateRangeEnd,
      participantUserIds,
      preferences,
    } = body;

    // Basic presence checks (detailed validation in service layer)
    if (!activity || !durationMinutes || !dateRangeStart || !dateRangeEnd) {
      return error(
        400,
        ERROR_CODES.VALIDATION_ERROR,
        'Missing required fields: activity, durationMinutes, dateRangeStart, dateRangeEnd',
      );
    }

    if (!participantUserIds || !Array.isArray(participantUserIds)) {
      return error(
        400,
        ERROR_CODES.VALIDATION_ERROR,
        'participantUserIds is required and must be an array',
        'participantUserIds',
      );
    }

    // 4. Call PlanningSessionService
    const params: CreateGroupSessionParams = {
      userId,
      activity,
      durationMinutes,
      dateRangeStart,
      dateRangeEnd,
      participantUserIds,
      preferences,
    };

    const result = await createGroupSession(params);

    // 5. Return appropriate response based on result
    if (result.success) {
      logger.info('Group planning session created', {
        userId,
        sessionId: result.data.sessionId,
        optionCount: result.data.options.length,
        participantCount: participantUserIds.length,
      });
      return success(result.data);
    }

    // Handle specific error codes
    switch (result.error.code) {
      case 'VALIDATION_ERROR':
        return error(400, ERROR_CODES.VALIDATION_ERROR, result.error.message, result.error.field);

      case 'NOT_FRIENDS':
        return error(
          403,
          ERROR_CODES.FORBIDDEN,
          `The following user IDs are not active friends: ${result.error.invalidUserIds.join(', ')}`,
        );

      case 'CONTEXT_UNAVAILABLE':
        return error(503, 'CONTEXT_UNAVAILABLE' as any, result.error.message);

      case 'NO_AVAILABILITY':
        // NO_AVAILABILITY is informational — return 200 with message
        return success({
          sessionId: result.error.sessionId,
          message: result.error.message,
          suggestions: result.error.suggestions,
          options: [],
          aiAvailable: false,
        });

      default:
        return error(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
    }
  } catch (err) {
    logger.error('Unexpected error in group planning handler', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });

    return error(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
  }
}
