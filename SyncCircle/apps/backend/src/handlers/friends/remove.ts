/**
 * DELETE /friends/{friendId} — Remove a friendship.
 *
 * Only a user in the canonical pair (userIdLow or userIdHigh) can remove
 * the friendship. Removing an already-removed friendship is idempotent
 * and returns 200.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { FRIENDSHIP_STATUS, ERROR_CODES } from '@synccircle/shared';
import * as friendshipRepo from '../../repositories/friendship.repo.js';
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

    // 2. Get friendshipId from path parameters
    const friendshipId = event.pathParameters?.friendId;
    if (!friendshipId) {
      return error(400, ERROR_CODES.VALIDATION_ERROR, 'Missing friendId path parameter');
    }

    // 3. Get all friendships for the caller and find the matching one.
    //    This ensures the caller is one of the two users in the canonical pair.
    const friendships = await friendshipRepo.getByUserId(callerUserId);
    const friendship = friendships.find((f) => f.friendshipId === friendshipId);

    // 4. If not found, the caller is not part of this friendship (or it doesn't exist)
    if (!friendship) {
      return error(403, ERROR_CODES.FORBIDDEN, 'You are not authorized to remove this friendship');
    }

    // 5. Idempotent: if already removed, return success
    if (friendship.status === FRIENDSHIP_STATUS.REMOVED) {
      return success({
        friendshipId,
        status: FRIENDSHIP_STATUS.REMOVED,
      });
    }

    // 6. Update status to "removed" with updatedAt timestamp
    const updatedAt = new Date().toISOString();
    await friendshipRepo.updateStatus(friendshipId, FRIENDSHIP_STATUS.REMOVED, updatedAt);

    logger.info('Friendship removed', { friendshipId });

    // 7. Return success
    return success({
      friendshipId,
      status: FRIENDSHIP_STATUS.REMOVED,
    });
  } catch (err) {
    logger.error('Unexpected error in removeFriend handler', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });

    return error(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
  }
}
