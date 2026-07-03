/**
 * GET /timetable/privacy — Retrieve timetable privacy setting.
 *
 * Returns the authenticated user's timetable privacy setting,
 * defaulting to "friends" if no setting has been configured.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ERROR_CODES } from '@synccircle/shared';
import type { PrivacySettingResponse } from '../../types/ai-planner.types.js';
import * as timetablePrivacyRepo from '../../repositories/timetable-privacy.repo.js';
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

    // 2. Get privacy setting (returns default "friends" if no record)
    const setting = await timetablePrivacyRepo.get(userId);

    // 3. Return the privacy setting response
    const response: PrivacySettingResponse = {
      userId: setting.userId,
      visibility: setting.visibility,
      updatedAt: setting.updatedAt,
    };

    logger.info('Retrieved timetable privacy setting', {
      userId,
      visibility: setting.visibility,
    });

    return success(response);
  } catch (err) {
    logger.error('Unexpected error in get-privacy handler', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });

    return error(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
  }
}
