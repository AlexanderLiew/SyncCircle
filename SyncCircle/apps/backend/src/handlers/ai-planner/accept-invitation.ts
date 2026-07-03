/**
 * POST /meeting-invitations/{invitationId}/accept — Accept a meeting invitation.
 *
 * Extracts the authenticated userId from Cognito JWT claims, verifies that the
 * caller is the invitation receiver, and delegates to the planning session
 * service to accept the invitation (creating a calendar event for the participant).
 *
 * Error mapping:
 * - FORBIDDEN → 403 (not the receiver)
 * - NOT_FOUND → 404 (invitation does not exist)
 * - EXPIRED → 410 (invitation past 72h limit)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ERROR_CODES } from '@synccircle/shared';
import { acceptInvitation } from '../../services/planning-session.service.js';
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
      return error(400, ERROR_CODES.VALIDATION_ERROR, 'invitationId path parameter is required');
    }

    // 3. Call service method
    const result = await acceptInvitation(userId, invitationId);

    // 4. Handle result
    if (result.success) {
      return success(result.data);
    }

    // 5. Map errors to HTTP status codes
    switch (result.error.code) {
      case 'FORBIDDEN':
        return error(403, ERROR_CODES.FORBIDDEN, result.error.message);
      case 'NOT_FOUND':
        return error(404, ERROR_CODES.NOT_FOUND, result.error.message);
      case 'EXPIRED':
        return error(410, ERROR_CODES.TOKEN_EXPIRED, result.error.message);
      default:
        return error(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
    }
  } catch (err) {
    logger.error('Unexpected error in acceptInvitation handler', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });

    return error(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
  }
}
