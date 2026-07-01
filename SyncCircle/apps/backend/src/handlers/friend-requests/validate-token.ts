/**
 * GET /friend-requests/invite/{token} — Validate an invitation token.
 *
 * Hashes the incoming token, queries the FriendRequests table by tokenHash-index,
 * checks expiry and usage status, verifies the caller is the intended recipient,
 * then returns the sender's display name and request creation date.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ERROR_CODES, FRIEND_REQUEST_STATUS } from '@synccircle/shared';
import * as friendRequestRepo from '../../repositories/friend-request.repo.js';
import * as userProfileRepo from '../../repositories/user-profile.repo.js';
import { hashToken, isTokenExpired } from '../../services/token.service.js';
import { normalizeEmail } from '../../services/validation.service.js';
import { success, error } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    // 1. Extract caller's email from Cognito claims and normalize it
    const claims = event.requestContext.authorizer?.claims;
    if (!claims) {
      return error(401, ERROR_CODES.UNAUTHORIZED, 'Missing authentication');
    }

    const callerEmail = claims.email as string;
    const normalizedCallerEmail = normalizeEmail(callerEmail);

    // 2. Get the token from path parameters
    const token = event.pathParameters?.token;
    if (!token) {
      return error(400, ERROR_CODES.VALIDATION_ERROR, 'Token path parameter is required');
    }

    // 3. Hash the token
    const hashedToken = hashToken(token);

    // 4. Query friendRequestRepo by tokenHash
    const friendRequest = await friendRequestRepo.getByTokenHash(hashedToken);

    // 5. If no request found — return 404
    if (!friendRequest) {
      return error(404, ERROR_CODES.NOT_FOUND, 'Invitation not found');
    }

    // 6. If token is expired — return 410 (TOKEN_EXPIRED)
    if (isTokenExpired(friendRequest.tokenExpiresAt)) {
      return error(410, ERROR_CODES.TOKEN_EXPIRED, 'This invitation has expired');
    }

    // 7. If request status is not "pending" — return 410 (TOKEN_USED)
    if (friendRequest.status !== FRIEND_REQUEST_STATUS.PENDING) {
      return error(410, ERROR_CODES.TOKEN_USED, 'This invitation has already been responded to');
    }

    // 8. If caller's normalized email doesn't match receiver — return 403 (WRONG_RECIPIENT)
    if (normalizedCallerEmail !== friendRequest.normalizedReceiverEmail) {
      return error(
        403,
        ERROR_CODES.WRONG_RECIPIENT,
        'This invitation was sent to a different account',
      );
    }

    // 9. Look up sender profile for display name
    const senderProfile = await userProfileRepo.getByUserId(friendRequest.senderUserId);
    const senderDisplayName = senderProfile?.displayName ?? friendRequest.senderDisplayName;

    // 10. Return 200 with request details
    logger.info('Token validated successfully', { requestId: friendRequest.requestId });

    return success({
      requestId: friendRequest.requestId,
      senderDisplayName,
      createdAt: friendRequest.createdAt,
    });
  } catch (err) {
    logger.error('Unexpected error in validateToken handler', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });

    return error(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
  }
}
