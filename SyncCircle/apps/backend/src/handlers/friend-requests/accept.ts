/**
 * POST /friend-requests/{requestId}/accept — Accept a friend request.
 *
 * Verifies the caller is the receiver, the request is pending,
 * then atomically updates the request status and creates a Friendship record.
 * Handles idempotent re-accept and race conditions gracefully.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import {
  FRIEND_REQUEST_STATUS,
  FRIENDSHIP_STATUS,
  ERROR_CODES,
  type Friendship,
} from '@synccircle/shared';
import * as friendRequestRepo from '../../repositories/friend-request.repo.js';
import * as friendshipRepo from '../../repositories/friendship.repo.js';
import { canonicalPair } from '../../utils/canonical-pair.js';
import { success, error } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    // 1. Extract caller userId from Cognito JWT claims
    const claims = event.requestContext.authorizer?.claims;
    if (!claims) {
      return error(401, ERROR_CODES.UNAUTHORIZED, 'Missing authentication');
    }

    const callerUserId = claims.sub as string;

    // 2. Get requestId from path parameters
    const requestId = event.pathParameters?.requestId;
    if (!requestId) {
      return error(400, ERROR_CODES.VALIDATION_ERROR, 'requestId path parameter is required');
    }

    // 3. Fetch the friend request — 404 if not found
    const friendRequest = await friendRequestRepo.getById(requestId);
    if (!friendRequest) {
      return error(404, ERROR_CODES.NOT_FOUND, 'Friend request not found');
    }

    // 4. Verify caller is the receiver — 403 if not
    if (friendRequest.receiverUserId !== callerUserId) {
      return error(403, ERROR_CODES.FORBIDDEN, 'Only the recipient can accept a friend request');
    }

    // 5. Idempotent re-accept: if already accepted, return success
    if (friendRequest.status === FRIEND_REQUEST_STATUS.ACCEPTED) {
      return success({
        requestId,
        status: FRIEND_REQUEST_STATUS.ACCEPTED,
      });
    }

    // 6. Status must be "pending" — 409 if not
    if (friendRequest.status !== FRIEND_REQUEST_STATUS.PENDING) {
      return error(
        409,
        ERROR_CODES.CONFLICT,
        `Cannot accept a request with status "${friendRequest.status}"`,
      );
    }

    // 7. Build the friendship record with canonical pair ordering
    const now = new Date().toISOString();
    const { userIdLow, userIdHigh } = canonicalPair(
      friendRequest.senderUserId,
      friendRequest.receiverUserId,
    );

    const friendship: Friendship = {
      friendshipId: randomUUID(),
      userIdLow,
      userIdHigh,
      status: FRIENDSHIP_STATUS.ACTIVE,
      createdAt: now,
    };

    // 8. Atomically update request status + create friendship
    try {
      await friendshipRepo.transactAccept(
        {
          requestId,
          status: FRIEND_REQUEST_STATUS.ACCEPTED,
          respondedAt: now,
        },
        friendship,
      );
    } catch (err: unknown) {
      // 9. Handle race conditions (TransactionCanceledException)
      const errorName = (err as { name?: string })?.name;
      if (errorName === 'TransactionCanceledException') {
        logger.warn('Transaction cancelled — possible race condition', { requestId });
        return error(
          409,
          ERROR_CODES.CONFLICT,
          'Request was modified concurrently, please retry',
        );
      }
      throw err;
    }

    // 10. Return 200 success
    logger.info('Friend request accepted successfully', { requestId });

    return success({
      requestId,
      status: FRIEND_REQUEST_STATUS.ACCEPTED,
    });
  } catch (err) {
    logger.error('Unexpected error in acceptFriendRequest handler', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });

    return error(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
  }
}
