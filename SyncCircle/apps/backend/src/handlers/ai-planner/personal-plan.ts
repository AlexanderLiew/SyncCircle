/**
 * POST /ai-planner/personal — Create a personal planning session.
 *
 * Extracts userId from JWT, validates the request body, enforces rate
 * limiting (5 requests/user/minute), then delegates to PlanningSessionService.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ERROR_CODES } from '@synccircle/shared';
import { success, error } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { checkRateLimit } from './rate-limiter.js';
import {
  createPersonalSession,
  type CreatePersonalSessionParams,
} from '../../services/planning-session.service.js';
import type { CreatePersonalSessionRequest } from '../../types/ai-planner.types.js';

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
      logger.warn('Rate limit exceeded for personal planning', { userId });
      return error(429, ERROR_CODES.RATE_LIMITED, 'Rate limit exceeded. Maximum 5 planning requests per minute.');
    }

    // 3. Parse and validate request body
    if (!event.body) {
      return error(400, ERROR_CODES.VALIDATION_ERROR, 'Request body is required');
    }

    let body: CreatePersonalSessionRequest;
    try {
      body = JSON.parse(event.body) as CreatePersonalSessionRequest;
    } catch {
      return error(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid JSON in request body');
    }

    const { activity, durationMinutes, dateRangeStart, dateRangeEnd, preferences } = body;

    // Basic presence checks (detailed validation in service layer)
    if (!activity || !durationMinutes || !dateRangeStart || !dateRangeEnd) {
      return error(
        400,
        ERROR_CODES.VALIDATION_ERROR,
        'Missing required fields: activity, durationMinutes, dateRangeStart, dateRangeEnd',
      );
    }

    // 4. Call PlanningSessionService
    const params: CreatePersonalSessionParams = {
      userId,
      activity,
      durationMinutes,
      dateRangeStart,
      dateRangeEnd,
      preferences,
    };

    const result = await createPersonalSession(params);

    // 5. Return appropriate response based on result
    if (result.success) {
      logger.info('Personal planning session created', {
        userId,
        sessionId: result.data.sessionId,
        optionCount: result.data.options.length,
      });
      return success(result.data);
    }

    // Handle specific error codes
    switch (result.error.code) {
      case 'VALIDATION_ERROR':
        return error(400, ERROR_CODES.VALIDATION_ERROR, result.error.message, result.error.field);

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
    logger.error('Unexpected error in personal planning handler', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });

    return error(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
  }
}
