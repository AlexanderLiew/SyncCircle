/**
 * PUT /timetable/privacy — Update timetable privacy setting.
 *
 * Validates the visibility value ("friends" or "none") and upserts
 * the user's timetable privacy setting in DynamoDB.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ERROR_CODES } from '@synccircle/shared';
import {
  TIMETABLE_VISIBILITY,
  type TimetableVisibility,
  type PrivacySettingResponse,
  type UpdatePrivacySettingRequest,
} from '../../types/ai-planner.types.js';
import * as timetablePrivacyRepo from '../../repositories/timetable-privacy.repo.js';
import { success, error } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

const ALLOWED_VISIBILITY_VALUES: TimetableVisibility[] = [
  TIMETABLE_VISIBILITY.FRIENDS,
  TIMETABLE_VISIBILITY.NONE,
];

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

    // 2. Parse request body
    if (!event.body) {
      return error(400, ERROR_CODES.VALIDATION_ERROR, 'Request body is required');
    }

    let body: UpdatePrivacySettingRequest;
    try {
      body = JSON.parse(event.body) as UpdatePrivacySettingRequest;
    } catch {
      return error(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid JSON body');
    }

    // 3. Validate visibility value
    if (
      !body.visibility ||
      !ALLOWED_VISIBILITY_VALUES.includes(body.visibility as TimetableVisibility)
    ) {
      return error(
        400,
        ERROR_CODES.VALIDATION_ERROR,
        'visibility must be "friends" or "none"',
        'visibility',
      );
    }

    // 4. Upsert the privacy setting
    const updatedAt = new Date().toISOString();
    await timetablePrivacyRepo.put({
      userId,
      visibility: body.visibility,
      updatedAt,
    });

    // 5. Return the updated setting
    const response: PrivacySettingResponse = {
      userId,
      visibility: body.visibility,
      updatedAt,
    };

    logger.info('Updated timetable privacy setting', {
      userId,
      visibility: body.visibility,
    });

    return success(response);
  } catch (err) {
    logger.error('Unexpected error in put-privacy handler', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });

    return error(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
  }
}
