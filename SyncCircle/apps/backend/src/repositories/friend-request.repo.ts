import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { FriendRequest, FriendRequestStatus } from '@synccircle/shared';
import { FRIEND_REQUEST_STATUS } from '@synccircle/shared';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.FRIEND_REQUESTS_TABLE!;

/**
 * Creates a new friend request record.
 */
export async function create(request: FriendRequest): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: request,
    })
  );
}

/**
 * Gets a friend request by its primary key (requestId).
 */
export async function getById(requestId: string): Promise<FriendRequest | undefined> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { requestId },
    })
  );
  return result.Item as FriendRequest | undefined;
}

/**
 * Gets all friend requests sent by a user, ordered by createdAt descending.
 */
export async function getBySenderUserId(senderId: string): Promise<FriendRequest[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'senderUserId-createdAt-index',
      KeyConditionExpression: 'senderUserId = :senderId',
      ExpressionAttributeValues: { ':senderId': senderId },
      ScanIndexForward: false,
    })
  );
  return (result.Items ?? []) as FriendRequest[];
}

/**
 * Gets all friend requests received by a user, ordered by createdAt descending.
 */
export async function getByReceiverUserId(receiverId: string): Promise<FriendRequest[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'receiverUserId-createdAt-index',
      KeyConditionExpression: 'receiverUserId = :receiverId',
      ExpressionAttributeValues: { ':receiverId': receiverId },
      ScanIndexForward: false,
    })
  );
  return (result.Items ?? []) as FriendRequest[];
}

/**
 * Gets all friend requests sent to a normalized email address.
 */
export async function getByNormalizedEmail(email: string): Promise<FriendRequest[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'normalizedReceiverEmail-index',
      KeyConditionExpression: 'normalizedReceiverEmail = :email',
      ExpressionAttributeValues: { ':email': email },
    })
  );
  return (result.Items ?? []) as FriendRequest[];
}

/**
 * Gets a friend request by the hashed invitation token.
 */
export async function getByTokenHash(hash: string): Promise<FriendRequest | undefined> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'tokenHash-index',
      KeyConditionExpression: 'tokenHash = :hash',
      ExpressionAttributeValues: { ':hash': hash },
    })
  );
  return (result.Items?.[0] as FriendRequest) ?? undefined;
}

/**
 * Queries for any pending friend request between two users in either direction.
 * Used for duplicate-request prevention.
 */
export async function queryPendingBetweenUsers(
  userA: string,
  userB: string
): Promise<FriendRequest[]> {
  // Query: senderUserId=A AND receiverUserId=B with status=pending
  const [sentByA, sentByB] = await Promise.all([
    docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'senderUserId-createdAt-index',
        KeyConditionExpression: 'senderUserId = :sender',
        FilterExpression: 'receiverUserId = :receiver AND #status = :pending',
        ExpressionAttributeValues: {
          ':sender': userA,
          ':receiver': userB,
          ':pending': FRIEND_REQUEST_STATUS.PENDING,
        },
        ExpressionAttributeNames: { '#status': 'status' },
      })
    ),
    docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'senderUserId-createdAt-index',
        KeyConditionExpression: 'senderUserId = :sender',
        FilterExpression: 'receiverUserId = :receiver AND #status = :pending',
        ExpressionAttributeValues: {
          ':sender': userB,
          ':receiver': userA,
          ':pending': FRIEND_REQUEST_STATUS.PENDING,
        },
        ExpressionAttributeNames: { '#status': 'status' },
      })
    ),
  ]);

  return [
    ...((sentByA.Items ?? []) as FriendRequest[]),
    ...((sentByB.Items ?? []) as FriendRequest[]),
  ];
}

/**
 * Updates the status of a friend request with a conditional write.
 * The request must currently be in "pending" status; otherwise the condition fails.
 *
 * @throws ConditionalCheckFailedException if current status is not "pending"
 */
export async function updateStatus(
  requestId: string,
  status: FriendRequestStatus,
  respondedAt: string
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { requestId },
      UpdateExpression: 'SET #status = :newStatus, respondedAt = :respondedAt',
      ConditionExpression: '#status = :pending',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':newStatus': status,
        ':respondedAt': respondedAt,
        ':pending': FRIEND_REQUEST_STATUS.PENDING,
      },
    })
  );
}

/**
 * Sets the receiverUserId on a friend request (used when the invited user registers).
 */
export async function setReceiverUserId(
  requestId: string,
  userId: string
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { requestId },
      UpdateExpression: 'SET receiverUserId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
    })
  );
}
