import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { TimetablePrivacySetting } from '../types/ai-planner.types';
import { TIMETABLE_VISIBILITY } from '../types/ai-planner.types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TIMETABLE_PRIVACY_TABLE!;

/**
 * Gets a user's timetable privacy setting.
 * Returns a default setting with visibility "friends" if no record exists.
 */
export async function get(userId: string): Promise<TimetablePrivacySetting> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { userId },
    }),
  );

  if (result.Item) {
    return result.Item as TimetablePrivacySetting;
  }

  // Default: friends (opt-out model)
  return {
    userId,
    visibility: TIMETABLE_VISIBILITY.FRIENDS,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Creates or updates a user's timetable privacy setting (upsert).
 */
export async function put(setting: TimetablePrivacySetting): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: setting,
    }),
  );
}
