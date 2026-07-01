/**
 * POST /friend-requests/{requestId}/cancel — Cancel a sent friend request.
 *
 * Only the sender of the request can cancel it. The request must be in
 * "pending" status. Re-cancelling an already-cancelled request is idempotent
 * and returns 200.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { FRIEND_REQUEST_STATUS, ERROR_CODES } from '@synccircle/shared';
import * as friendRequestRepo from '../../repositories/friend-request.repo.js';
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
      return error(400, ERROR_CODES.VALIDATION_ERROR, 'Missing requestId path parameter');
    }

    // 3. Fetch the friend request by ID
    const friendRequest = await friendRequestRepo.getById(requestId);
    if (!friendRequest) {
      return error(404, ERROR_CODES.NOT_FOUND, 'Friend request not found');
    }

    // 4. Verify the caller is the sender (only sender can cancel)
    if (friendRequest.senderUserId !== callerUserId) {
      return error(403, ERROR_CODES.FORBIDDEN, 'Only the sender can cancel a friend request');
    }

    // 5. Idempotent re-cancel: if already cancelled, return success
    if (friendRequest.status === FRIEND_REQUEST_STATUS.CANCELLED) {
      return success({
        requestId,
        status: FRIEND_REQUEST_STATUS.CANCELLED,
        respondedAt: friendRequest.respondedAt,
      });
    }

    // 6. Status must be "pending" to cancel
    if (friendRequest.status !== FRIEND_REQUEST_STATUS.PENDING) {
      return error(409, ERROR_CODES.CONFLICT, `Cannot cancel a request with status "${friendRequest.status}"`);
    }

    // 7. Update the status to "cancelled" with conditional write
    const respondedAt = new Date().toISOString();

    try {
      await friendRequestRepo.updateStatus(requestId, FRIEND_REQUEST_STATUS.CANCELLED, respondedAt);
    } catch (updateError: unknown) {
      // 8. Handle ConditionalCheckFailedException (race condition)
      if (
        updateError instanceof Error &&
        updateError.name === 'ConditionalCheckFailedException'
      ) {
        return error(409, ERROR_CODES.CONFLICT, 'Friend request status has already changed');
      }
      throw updateError;
    }

    // 9. Return success
    logger.info('Friend request cancelled', { requestId });

    return success({
      requestId,
      status: FRIEND_REQUEST_STATUS.CANCELLED,
      respondedAt,
    });
  } catch (err) {
    logger.error('Unexpected error in cancelFriendRequest handler', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });

    return error(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
  }
}
