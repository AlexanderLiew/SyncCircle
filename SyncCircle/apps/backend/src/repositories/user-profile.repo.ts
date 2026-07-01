import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  BatchGetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { UserProfile } from '@synccircle/shared';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.USER_PROFILES_TABLE ?? 'UserProfiles';
const NORMALIZED_EMAIL_INDEX = 'normalizedEmail-index';
const BATCH_GET_LIMIT = 100;

/**
 * Create a new user profile in the UserProfiles table.
 */
export async function createProfile(profile: UserProfile): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: profile,
    }),
  );
}

/**
 * Get a user profile by its userId (partition key).
 */
export async function getByUserId(userId: string): Promise<UserProfile | undefined> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { userId },
    }),
  );
  return result.Item as UserProfile | undefined;
}

/**
 * Look up a user profile by normalized email using the normalizedEmail-index GSI.
 * Returns the first matching profile or undefined.
 */
export async function getByNormalizedEmail(email: string): Promise<UserProfile | undefined> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: NORMALIZED_EMAIL_INDEX,
      KeyConditionExpression: 'normalizedEmail = :email',
      ExpressionAttributeValues: { ':email': email },
      Limit: 1,
    }),
  );
  return result.Items?.[0] as UserProfile | undefined;
}

/**
 * Batch get user profiles by an array of userIds.
 * Handles the DynamoDB BatchGetItem 100-item limit by chunking requests.
 */
export async function batchGetByUserIds(userIds: string[]): Promise<UserProfile[]> {
  if (userIds.length === 0) return [];

  const profiles: UserProfile[] = [];

  // Chunk into groups of BATCH_GET_LIMIT
  for (let i = 0; i < userIds.length; i += BATCH_GET_LIMIT) {
    const chunk = userIds.slice(i, i + BATCH_GET_LIMIT);
    const keys = chunk.map((userId) => ({ userId }));

    let unprocessedKeys: Record<string, { Keys: Array<Record<string, string>> }> | undefined = {
      [TABLE_NAME]: { Keys: keys },
    };

    // Retry unprocessed keys
    while (unprocessedKeys && Object.keys(unprocessedKeys).length > 0) {
      const result = await docClient.send(
        new BatchGetCommand({
          RequestItems: unprocessedKeys as Record<string, { Keys: Array<Record<string, unknown>> }>,
        }),
      );

      const items = result.Responses?.[TABLE_NAME] ?? [];
      profiles.push(...(items as UserProfile[]));

      // Handle unprocessed keys (DynamoDB throttling)
      if (
        result.UnprocessedKeys &&
        Object.keys(result.UnprocessedKeys).length > 0
      ) {
        unprocessedKeys = result.UnprocessedKeys as Record<string, { Keys: Array<Record<string, string>> }>;
      } else {
        unprocessedKeys = undefined;
      }
    }
  }

  return profiles;
}

/**
 * Update a user profile. Sets updatedAt automatically.
 * Only updates the fields provided in the `updates` object.
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'displayName' | 'course' | 'email' | 'normalizedEmail'>>,
): Promise<UserProfile | undefined> {
  const now = new Date().toISOString();
  const expressionParts: string[] = [];
  const expressionNames: Record<string, string> = {};
  const expressionValues: Record<string, unknown> = {};

  // Always set updatedAt
  expressionParts.push('#updatedAt = :updatedAt');
  expressionNames['#updatedAt'] = 'updatedAt';
  expressionValues[':updatedAt'] = now;

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      const attrAlias = `#${key}`;
      const valAlias = `:${key}`;
      expressionParts.push(`${attrAlias} = ${valAlias}`);
      expressionNames[attrAlias] = key;
      expressionValues[valAlias] = value;
    }
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { userId },
      UpdateExpression: `SET ${expressionParts.join(', ')}`,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      ReturnValues: 'ALL_NEW',
    }),
  );

  return result.Attributes as UserProfile | undefined;
}
