/**
 * GET /friend-requests/outgoing — List outgoing friend requests.
 *
 * Returns all friend requests where the authenticated user is the sender.
 * Marks pending requests with expired tokens as "expired" in the response.
 * Results are sorted by createdAt descending and limited to 100 records.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  FRIEND_REQUEST_STATUS,
  ERROR_CODES,
  type OutgoingRequestsResponse,
  type FriendRequestStatus,
} from '@synccircle/shared';
import { isTokenExpired } from '../../services/token.service.js';
import * as friendRequestRepo from '../../repositories/friend-request.repo.js';
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

    // 2. Query friend requests sent by this user (already sorted by createdAt desc)
    const requests = await friendRequestRepo.getBySenderUserId(callerUserId);

    // 3. Limit to 100 results (already sorted descending from repo query)
    const limitedRequests = requests.slice(0, MAX_RESULTS);

    // 4. Build response, marking expired pending requests
    const response: OutgoingRequestsResponse = {
      requests: limitedRequests.map((req) => {
        // Determine the effective status: if still pending but token is expired, show as expired
        let effectiveStatus: FriendRequestStatus = req.status;
        if (
          req.status === FRIEND_REQUEST_STATUS.PENDING &&
          isTokenExpired(req.tokenExpiresAt)
        ) {
          effectiveStatus = FRIEND_REQUEST_STATUS.EXPIRED;
        }

        return {
          requestId: req.requestId,
          recipientEmail: req.receiverEmail,
          status: effectiveStatus,
          createdAt: req.createdAt,
        };
      }),
    };

    logger.info('Listed outgoing friend requests', {
      userId: callerUserId,
      count: response.requests.length,
    });

    return success(response);
  } catch (err) {
    logger.error('Unexpected error in listOutgoingRequests handler', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });

    return error(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
  }
}
