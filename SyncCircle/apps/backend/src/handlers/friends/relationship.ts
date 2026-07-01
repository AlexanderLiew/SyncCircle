/**
 * GET /friends/{userId}/relationship — Query relationship status between caller and target user.
 *
 * Used by downstream services (Timetable, AI Planner) to check if two users
 * are active friends and gate feature access accordingly.
 *
 * Logic:
 * 1. Extract caller userId from Cognito claims
 * 2. Get targetUserId from path parameters (event.pathParameters.userId)
 * 3. Compute canonical pair
 * 4. Query Friendships table for the canonical pair
 * 5. If friendship exists → return its status + isActiveFriend
 * 6. If no friendship → check for pending friend requests between the two users
 * 7. If pending request exists → return "pending"
 * 8. Otherwise → return "none"
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  ERROR_CODES,
  FRIENDSHIP_STATUS,
  type FriendshipAccessResult,
  type RelationshipStatus,
} from '@synccircle/shared';
import * as friendshipRepo from '../../repositories/friendship.repo.js';
import * as friendRequestRepo from '../../repositories/friend-request.repo.js';
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

    // 2. Get targetUserId from path parameters
    const targetUserId = event.pathParameters?.userId;
    if (!targetUserId) {
      return error(400, ERROR_CODES.VALIDATION_ERROR, 'userId path parameter is required');
    }

    // 3. Compute canonical pair
    const { userIdLow, userIdHigh } = canonicalPair(callerUserId, targetUserId);

    // 4. Query Friendships table for the canonical pair
    const friendship = await friendshipRepo.getByCanonicalPair(userIdLow, userIdHigh);

    // 5. If friendship exists, return its status
    if (friendship) {
      const relationshipStatus = friendship.status as RelationshipStatus;
      const isActiveFriend = friendship.status === FRIENDSHIP_STATUS.ACTIVE;

      const result: FriendshipAccessResult = {
        friendUserId: targetUserId,
        isActiveFriend,
        relationshipStatus,
      };

      logger.info('Relationship query completed — friendship found', {
        callerUserId,
        targetUserId,
        relationshipStatus,
      });

      return success(result);
    }

    // 6. No friendship record — check for pending friend requests between users
    const pendingRequests = await friendRequestRepo.queryPendingBetweenUsers(
      callerUserId,
      targetUserId,
    );

    if (pendingRequests.length > 0) {
      const result: FriendshipAccessResult = {
        friendUserId: targetUserId,
        isActiveFriend: false,
        relationshipStatus: 'pending',
      };

      logger.info('Relationship query completed — pending request found', {
        callerUserId,
        targetUserId,
      });

      return success(result);
    }

    // 8. No relationship at all
    const result: FriendshipAccessResult = {
      friendUserId: targetUserId,
      isActiveFriend: false,
      relationshipStatus: 'none',
    };

    logger.info('Relationship query completed — no relationship', {
      callerUserId,
      targetUserId,
    });

    return success(result);
  } catch (err) {
    logger.error('Unexpected error in relationship query handler', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });

    return error(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
  }
}
