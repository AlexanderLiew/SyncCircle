/**
 * GET /meeting-invitations — List meeting invitations for the authenticated user.
 *
 * Queries all meeting invitations where the user is the receiverUserId,
 * ordered by createdAt descending.
 *
 * Validates: Requirements 7.3
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ERROR_CODES } from '@synccircle/shared';
import type { ListInvitationsResponse } from '../../types/ai-planner.types.js';
import * as meetingInvitationRepo from '../../repositories/meeting-invitation.repo.js';
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

    // 2. Query invitations by receiverUserId (ordered by createdAt desc via GSI)
    const invitations = await meetingInvitationRepo.queryByReceiverUserId(userId);

    // 3. Return the invitations
    const response: ListInvitationsResponse = { invitations };

    logger.info('Listed meeting invitations', {
      userId,
      count: invitations.length,
    });

    return success(response);
  } catch (err) {
    logger.error('Unexpected error in listInvitations handler', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });

    return error(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
  }
}
