/**
 * POST /friend-requests/{requestId}/reject — Reject a friend request.
 *
 * Only the receiver of the request can reject it.
 * The request must be in "pending" status (idempotent re-reject allowed).
 * Updates the request status to "rejected" and sets respondedAt.
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

    // 3. Get the friend request by ID — 404 if not found
    const friendRequest = await friendRequestRepo.getById(requestId);
    if (!friendRequest) {
      return error(404, ERROR_CODES.NOT_FOUND, 'Friend request not found');
    }

    // 4. Verify caller is the receiverUserId — 403 if not
    if (friendRequest.receiverUserId !== callerUserId) {
      return error(403, ERROR_CODES.FORBIDDEN, 'Only the recipient can reject this request');
    }

    // 5. Idempotent re-reject: if already rejected, return success
    if (friendRequest.status === FRIEND_REQUEST_STATUS.REJECTED) {
      logger.info('Idempotent re-reject of friend request', { requestId });
      return success({
        requestId,
        status: FRIEND_REQUEST_STATUS.REJECTED,
        respondedAt: friendRequest.respondedAt,
      });
    }

    // 6. Check status is "pending" — 409 if not
    if (friendRequest.status !== FRIEND_REQUEST_STATUS.PENDING) {
      return error(
        409,
        ERROR_CODES.CONFLICT,
        `Cannot reject a request with status "${friendRequest.status}"`,
      );
    }

    // 7. Update status to "rejected", set respondedAt
    const respondedAt = new Date().toISOString();
    try {
      await friendRequestRepo.updateStatus(requestId, FRIEND_REQUEST_STATUS.REJECTED, respondedAt);
    } catch (err: unknown) {
      // 8. Catch ConditionalCheckFailedException — race condition
      if (
        err instanceof Error &&
        err.name === 'ConditionalCheckFailedException'
      ) {
        logger.warn('Conditional check failed during reject (race condition)', { requestId });
        return error(409, ERROR_CODES.CONFLICT, 'Request status changed concurrently');
      }
      throw err;
    }

    // 9. Return 200 with success response
    logger.info('Friend request rejected', { requestId });

    return success({
      requestId,
      status: FRIEND_REQUEST_STATUS.REJECTED,
      respondedAt,
    });
  } catch (err) {
    logger.error('Unexpected error in rejectFriendRequest handler', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });

    return error(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
  }
}
