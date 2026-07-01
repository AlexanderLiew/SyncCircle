/**
 * POST /friend-requests — Create a new friend request.
 *
 * Validates input, prevents self-requests and duplicates,
 * generates an invitation token, stores the request, and
 * sends an invitation email (non-blocking on failure).
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import {
  FRIEND_REQUEST_STATUS,
  FRIENDSHIP_STATUS,
  ERROR_CODES,
  type FriendRequest,
} from '@synccircle/shared';
import {
  validateEmail,
  validateDisplayName,
  normalizeEmail,
  isSelfAction,
} from '../../services/validation.service.js';
import { generateToken } from '../../services/token.service.js';
import { sendInvitationEmail } from '../../services/email.service.js';
import * as userProfileRepo from '../../repositories/user-profile.repo.js';
import * as friendRequestRepo from '../../repositories/friend-request.repo.js';
import * as friendshipRepo from '../../repositories/friendship.repo.js';
import { canonicalPair } from '../../utils/canonical-pair.js';
import { created, error } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    // 1. Extract caller info from Cognito JWT claims
    const claims = event.requestContext.authorizer?.claims;
    if (!claims) {
      return error(401, ERROR_CODES.UNAUTHORIZED, 'Missing authentication');
    }

    const callerUserId = claims.sub as string;
    const callerEmail = claims.email as string;

    // 2. Parse request body
    if (!event.body) {
      return error(400, ERROR_CODES.VALIDATION_ERROR, 'Request body is required');
    }

    let body: { email?: string; displayName?: string; recipientEmail?: string; recipientDisplayName?: string };
    try {
      body = JSON.parse(event.body);
    } catch {
      return error(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid JSON body');
    }

    const { email: emailField, displayName: displayNameField, recipientEmail, recipientDisplayName } = body;
    // Support both field naming conventions
    const email = emailField || recipientEmail;
    const displayName = displayNameField || recipientDisplayName;

    // 3. Validate inputs
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      const firstError = emailValidation.errors[0]!;
      return error(400, ERROR_CODES.VALIDATION_ERROR, firstError.message, firstError.field);
    }

    const displayNameValidation = validateDisplayName(displayName);
    if (!displayNameValidation.valid) {
      const firstError = displayNameValidation.errors[0]!;
      return error(400, ERROR_CODES.VALIDATION_ERROR, firstError.message, firstError.field);
    }

    // 4. Self-request check
    if (isSelfAction(callerEmail, email as string)) {
      return error(400, ERROR_CODES.SELF_REQUEST, 'Cannot send a friend request to yourself');
    }

    // 5. Normalize recipient email
    const normalizedRecipientEmail = normalizeEmail(email as string);

    // 6. Look up recipient by normalized email
    const recipient = await userProfileRepo.getByNormalizedEmail(normalizedRecipientEmail);

    // 7. If recipient found, check for existing active friendship
    if (recipient) {
      const { userIdLow, userIdHigh } = canonicalPair(callerUserId, recipient.userId);
      const existingFriendship = await friendshipRepo.getByCanonicalPair(userIdLow, userIdHigh);

      if (existingFriendship && existingFriendship.status === FRIENDSHIP_STATUS.ACTIVE) {
        return error(409, ERROR_CODES.ALREADY_FRIENDS, 'You are already friends with this user');
      }

      // 8. Check for pending requests in either direction
      const pendingRequests = await friendRequestRepo.queryPendingBetweenUsers(
        callerUserId,
        recipient.userId,
      );

      if (pendingRequests.length > 0) {
        return error(409, ERROR_CODES.PENDING_EXISTS, 'A pending friend request already exists between you and this user');
      }
    }

    // 9. Generate invitation token
    const { token, tokenHash, expiresAt } = generateToken();

    // 10. Build and store FriendRequest record
    const now = new Date().toISOString();
    const requestId = randomUUID();

    const friendRequest: FriendRequest = {
      requestId,
      senderUserId: callerUserId,
      receiverUserId: recipient?.userId ?? '',
      receiverEmail: email as string,
      normalizedReceiverEmail: normalizedRecipientEmail,
      senderDisplayName: displayName as string,
      status: FRIEND_REQUEST_STATUS.PENDING,
      tokenHash,
      tokenExpiresAt: expiresAt,
      createdAt: now,
    };

    await friendRequestRepo.create(friendRequest);

    // 11. Send invitation email (non-blocking on failure)
    let emailSent = false;
    try {
      const emailResult = await sendInvitationEmail({
        recipientEmail: email as string,
        senderDisplayName: displayName as string,
        token,
      });
      emailSent = emailResult.emailSent;
    } catch (emailError) {
      logger.error('Failed to send invitation email', {
        errorMessage: emailError instanceof Error ? emailError.message : String(emailError),
        requestId,
      });
      emailSent = false;
    }

    // 12. Return 201 Created
    logger.info('Friend request created successfully', { requestId });

    return created({
      requestId,
      status: FRIEND_REQUEST_STATUS.PENDING,
      emailSent,
    });
  } catch (err) {
    logger.error('Unexpected error in createFriendRequest handler', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });

    return error(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
  }
}
