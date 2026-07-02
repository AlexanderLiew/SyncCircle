/**
 * GET /users — List all registered users for friend discovery.
 *
 * Scans the UserProfiles table and returns userId, displayName, and email
 * for all users except the authenticated caller. Supports optional
 * `?name=` query parameter for case-insensitive display name filtering.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ERROR_CODES, type UsersListResponse } from '@synccircle/shared';
import { success, error } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAME = process.env.USER_PROFILES_TABLE!;

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    // 1. Extract caller userId from Cognito authorizer claims
    const claims = event.requestContext.authorizer?.claims;
    if (!claims) {
      return error(401, ERROR_CODES.UNAUTHORIZED, 'Missing authentication');
    }

    const callerUserId = claims.sub as string;

    // 2. Scan UserProfiles table, excluding the caller
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        ProjectionExpression: 'userId, displayName, email',
        FilterExpression: 'userId <> :callerId',
        ExpressionAttributeValues: {
          ':callerId': callerUserId,
        },
      }),
    );

    let users = (scanResult.Items ?? []) as Array<{
      userId: string;
      displayName: string;
      email: string;
    }>;

    // 3. Apply optional client-side name filter
    const nameQuery = event.queryStringParameters?.name;
    if (nameQuery) {
      const lowerQuery = nameQuery.toLowerCase();
      users = users.filter((user) =>
        user.displayName.toLowerCase().includes(lowerQuery),
      );
    }

    // 4. Return success response
    const response: UsersListResponse = { users };

    logger.info('Listed users for discovery', {
      userId: callerUserId,
      count: users.length,
      filtered: !!nameQuery,
    });

    return success(response);
  } catch (err) {
    logger.error('Unexpected error in getUsers handler', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });

    return error(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
  }
}
