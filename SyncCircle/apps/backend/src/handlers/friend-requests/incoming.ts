/**
 * GET /friend-requests/incoming — List incoming pending friend requests.
 *
 * Returns all pending friend requests where the authenticated user
 * is the receiver, enriched with sender display names via batch lookup.
 * Results are sorted by createdAt descending and limited to 100 records.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  FRIEND_REQUEST_STATUS,
  ERROR_CODES,
  type IncomingRequestsResponse,
} from '@synccircle/shared';
import * as friendRequestRepo from '../../repositories/friend-request.repo.js';
import * as userProfileRepo from '../../repositories/user-profile.repo.js';
import { success, error } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

/** Maximum number of requests to return per response. */
const MAX_RESULTS = 100;

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    // 1. Extract caller userId from Cognito claims
    const claims = event.requestContext.authorizer?.claims;
    if (!claims) {
      return error(401, ERROR_CODES.UNAUTHORIZED, 'Missing authentication');
    }

    const callerUserId = claims.sub as string;

    // 2. Query friend requests received by this user (already sorted by createdAt desc)
    const requests = await friendRequestRepo.getByReceiverUserId(callerUserId);

    // 3. Filter to only pending requests
    const pendingRequests = requests.filter(
      (req) => req.status === FRIEND_REQUEST_STATUS.PENDING,
    );

    // 4. Limit to 100 results (already sorted descending from repo query)
    const limitedRequests = pendingRequests.slice(0, MAX_RESULTS);

    // 5. Batch get sender profiles to enrich with display names
    const senderUserIds = [
      ...new Set(limitedRequests.map((req) => req.senderUserId)),
    ];

    const senderProfiles = senderUserIds.length > 0
      ? await userProfileRepo.batchGetByUserIds(senderUserIds)
      : [];

    // Build a lookup map for sender display names
    const senderDisplayNameMap = new Map<string, string>();
    for (const profile of senderProfiles) {
      senderDisplayNameMap.set(profile.userId, profile.displayName);
    }

    // 6. Build response with enriched sender display names
    const response: IncomingRequestsResponse = {
      requests: limitedRequests.map((req) => ({
        requestId: req.requestId,
        senderDisplayName:
          senderDisplayNameMap.get(req.senderUserId) ?? req.senderDisplayName,
        createdAt: req.createdAt,
      })),
    };

    logger.info('Listed incoming friend requests', {
      userId: callerUserId,
      count: response.requests.length,
    });

    return success(response);
  } catch (err) {
    logger.error('Unexpected error in listIncomingRequests handler', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });

    return error(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
  }
}
