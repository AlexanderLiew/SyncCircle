/**
 * GET /friends — List active friends for the authenticated user.
 *
 * Queries all friendships for the caller (via both GSIs), filters to
 * only active friendships, enriches with friend display names via
 * batch get on UserProfiles, and returns the friends array.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  FRIENDSHIP_STATUS,
  ERROR_CODES,
  type FriendsListResponse,
} from '@synccircle/shared';
import * as friendshipRepo from '../../repositories/friendship.repo.js';
import * as userProfileRepo from '../../repositories/user-profile.repo.js';
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

    // 2. Query all friendships for the caller (both GSIs)
    const friendships = await friendshipRepo.getByUserId(callerUserId);

    // 3. Filter to only active friendships
    const activeFriendships = friendships.filter(
      (f) => f.status === FRIENDSHIP_STATUS.ACTIVE,
    );

    // 4. Determine the friend's userId for each friendship
    //    (the one that is NOT the caller)
    const friendUserIds = activeFriendships.map((f) =>
      f.userIdLow === callerUserId ? f.userIdHigh : f.userIdLow,
    );

    // 5. Batch get friend profiles for display names
    const friendProfiles = friendUserIds.length > 0
      ? await userProfileRepo.batchGetByUserIds(friendUserIds)
      : [];

    // Build a lookup map: userId -> displayName
    const displayNameMap = new Map<string, string>();
    for (const profile of friendProfiles) {
      displayNameMap.set(profile.userId, profile.displayName);
    }

    // 6. Build and return the response
    const response: FriendsListResponse = {
      friends: activeFriendships.map((f) => {
        const friendUserId =
          f.userIdLow === callerUserId ? f.userIdHigh : f.userIdLow;
        return {
          friendId: friendUserId,
          displayName: displayNameMap.get(friendUserId) ?? 'Unknown User',
          createdAt: f.createdAt,
        };
      }),
    };

    logger.info('Listed friends', {
      userId: callerUserId,
      count: response.friends.length,
    });

    return success(response);
  } catch (err) {
    logger.error('Unexpected error in listFriends handler', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });

    return error(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
  }
}
