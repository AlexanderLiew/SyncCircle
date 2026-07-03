/**
 * GET /meeting-invitations/{invitationId} — Get a meeting invitation by ID.
 *
 * Returns the Meeting_Invitation details including the associated event
 * information, only if the authenticated user is the receiverUserId.
 * Returns FORBIDDEN otherwise.
 *
 * Validates: Requirements 7.4, 7.5
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ERROR_CODES } from '@synccircle/shared';
import type { GetInvitationResponse } from '../../types/ai-planner.types.js';
import * as meetingInvitationRepo from '../../repositories/meeting-invitation.repo.js';
import * as calendarEventRepo from '../../repositories/calendar-event.repo.js';
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

    // 2. Extract invitationId from path parameters
    const invitationId = event.pathParameters?.invitationId;
    if (!invitationId) {
      return error(400, ERROR_CODES.VALIDATION_ERROR, 'Missing invitationId path parameter');
    }

    // 3. Get the invitation from the repository
    const invitation = await meetingInvitationRepo.getById(invitationId);

    if (!invitation) {
      return error(404, ERROR_CODES.NOT_FOUND, 'Meeting invitation not found');
    }

    // 4. Verify authorization — only the receiver can view
    if (invitation.receiverUserId !== userId) {
      return error(403, ERROR_CODES.FORBIDDEN, 'You are not authorized to view this invitation');
    }

    // 5. Optionally fetch associated event details
    let associatedEvent;
    if (invitation.eventId) {
      associatedEvent = await calendarEventRepo.getByEventId(invitation.eventId);
    }

    // 6. Return the invitation with optional event
    const response: GetInvitationResponse = {
      invitation,
      ...(associatedEvent && { event: associatedEvent }),
    };

    logger.info('Retrieved meeting invitation', {
      userId,
      invitationId,
    });

    return success(response);
  } catch (err) {
    logger.error('Unexpected error in getInvitation handler', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });

    return error(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
  }
}
