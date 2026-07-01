/**
 * Cognito Post-Confirmation Lambda Trigger
 *
 * Triggered after a user successfully confirms their email during registration.
 * Creates a UserProfile record and links any pending friend requests that
 * were sent to this user's email before they registered.
 */

import type { PostConfirmationConfirmSignUpTriggerEvent } from 'aws-lambda';
import { normalizeEmail } from '../../services/validation.service';
import { isTokenExpired } from '../../services/token.service';
import * as userProfileRepo from '../../repositories/user-profile.repo';
import * as friendRequestRepo from '../../repositories/friend-request.repo';
import { FRIEND_REQUEST_STATUS } from '@synccircle/shared';
import { logger } from '../../utils/logger';

export async function handler(
  event: PostConfirmationConfirmSignUpTriggerEvent,
): Promise<PostConfirmationConfirmSignUpTriggerEvent> {
  const userAttributes = event.request.userAttributes;

  const userId = userAttributes.sub!;
  const email = userAttributes.email!;
  const displayName =
    userAttributes['custom:displayName'] || userAttributes.name || '';
  const course = userAttributes['custom:course'] || undefined;

  const now = new Date().toISOString();
  const normalizedEmailValue = normalizeEmail(email);

  logger.info('Post-confirmation trigger started', { userId });

  // Step 1: Create UserProfile record
  await userProfileRepo.createProfile({
    userId,
    email,
    normalizedEmail: normalizedEmailValue,
    displayName,
    ...(course !== undefined && { course }),
    createdAt: now,
    updatedAt: now,
  });

  logger.info('UserProfile created', { userId });

  // Step 2: Query pending friend requests for this email
  const pendingRequests = await friendRequestRepo.getByNormalizedEmail(normalizedEmailValue);

  // Filter to only pending status
  const pendingOnly = pendingRequests.filter(
    (req) => req.status === FRIEND_REQUEST_STATUS.PENDING,
  );

  logger.info('Found pending friend requests for new user', {
    userId,
    count: pendingOnly.length,
  });

  // Step 3: Process each matching request
  for (const request of pendingOnly) {
    try {
      if (!isTokenExpired(request.tokenExpiresAt)) {
        // Not expired — attach the new user as receiver
        await friendRequestRepo.setReceiverUserId(request.requestId, userId);
        logger.info('Attached receiverUserId to friend request', {
          requestId: request.requestId,
          userId,
        });
      } else {
        // Expired — mark as expired
        try {
          await friendRequestRepo.updateStatus(
            request.requestId,
            FRIEND_REQUEST_STATUS.EXPIRED,
            now,
          );
          logger.info('Marked expired friend request', {
            requestId: request.requestId,
          });
        } catch (statusError) {
          // Condition check failure is expected if already transitioned
          logger.warn('Failed to mark friend request as expired (condition failure)', {
            requestId: request.requestId,
            error: statusError instanceof Error ? statusError.message : String(statusError),
          });
        }
      }
    } catch (requestError) {
      // Log error but continue processing remaining requests
      logger.error('Failed to process friend request during post-confirmation', {
        requestId: request.requestId,
        error: requestError instanceof Error ? requestError.message : String(requestError),
      });
    }
  }

  logger.info('Post-confirmation trigger completed', { userId });

  // Return event unchanged (required for Cognito trigger to succeed)
  return event;
}
