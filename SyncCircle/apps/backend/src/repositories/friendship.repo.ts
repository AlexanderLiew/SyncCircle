import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { Friendship, FriendshipStatus } from '@synccircle/shared';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.FRIENDSHIPS_TABLE!;
const FRIEND_REQUESTS_TABLE = process.env.FRIEND_REQUESTS_TABLE!;

/**
 * Creates a new friendship record.
 * Uses a condition expression to prevent duplicate records (attribute_not_exists on friendshipId).
 */
export async function create(friendship: Friendship): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: friendship,
      ConditionExpression: 'attribute_not_exists(friendshipId)',
    }),
  );
}

/**
 * Retrieves a friendship by the canonical user pair.
 * Queries the userIdLow-index GSI and filters by userIdHigh.
 */
export async function getByCanonicalPair(
  userIdLow: string,
  userIdHigh: string,
): Promise<Friendship | undefined> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'userIdLow-index',
      KeyConditionExpression: 'userIdLow = :low',
      FilterExpression: 'userIdHigh = :high',
      ExpressionAttributeValues: {
        ':low': userIdLow,
        ':high': userIdHigh,
      },
    }),
  );

  return result.Items?.[0] as Friendship | undefined;
}

/**
 * Retrieves all friendships for a given user.
 * Queries both userIdLow-index and userIdHigh-index GSIs since
 * the user could appear in either position of the canonical pair.
 */
export async function getByUserId(userId: string): Promise<Friendship[]> {
  const [lowResult, highResult] = await Promise.all([
    docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'userIdLow-index',
        KeyConditionExpression: 'userIdLow = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      }),
    ),
    docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'userIdHigh-index',
        KeyConditionExpression: 'userIdHigh = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      }),
    ),
  ]);

  const items = [
    ...(lowResult.Items ?? []),
    ...(highResult.Items ?? []),
  ] as Friendship[];

  return items;
}

/**
 * Updates the status of an existing friendship record.
 */
export async function updateStatus(
  friendshipId: string,
  status: FriendshipStatus,
  updatedAt: string,
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { friendshipId },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': updatedAt,
      },
    }),
  );
}

/**
 * Atomically accepts a friend request and creates the friendship record.
 * Uses TransactWriteItems to ensure both operations succeed or both fail.
 *
 * @param requestUpdate - The friend request status update (requestId, status, respondedAt)
 * @param friendshipCreate - The new friendship record to create
 */
export async function transactAccept(
  requestUpdate: { requestId: string; status: string; respondedAt: string },
  friendshipCreate: Friendship,
): Promise<void> {
  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: FRIEND_REQUESTS_TABLE,
            Key: { requestId: requestUpdate.requestId },
            UpdateExpression:
              'SET #status = :status, respondedAt = :respondedAt',
            ConditionExpression: '#status = :pendingStatus',
            ExpressionAttributeNames: {
              '#status': 'status',
            },
            ExpressionAttributeValues: {
              ':status': requestUpdate.status,
              ':respondedAt': requestUpdate.respondedAt,
              ':pendingStatus': 'pending',
            },
          },
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: friendshipCreate,
            ConditionExpression: 'attribute_not_exists(friendshipId)',
          },
        },
      ],
    }),
  );
}
