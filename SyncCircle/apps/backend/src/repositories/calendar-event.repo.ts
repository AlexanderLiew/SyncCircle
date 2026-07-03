import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  DeleteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { CalendarEvent, CalendarEventStatus } from '../types/ai-planner.types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.CALENDAR_EVENTS_TABLE!;

/**
 * Creates a new calendar event record.
 */
export async function create(event: CalendarEvent): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: event,
    }),
  );
}

/**
 * Gets all calendar events for a user within a date range.
 * Uses the composite key (PK: userId, SK: startDateTime) for efficient range queries.
 */
export async function getByUserAndDateRange(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<CalendarEvent[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression:
        'userId = :userId AND startDateTime BETWEEN :start AND :end',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':start': startDate,
        ':end': endDate,
      },
    }),
  );
  return (result.Items ?? []) as CalendarEvent[];
}

/**
 * Gets a calendar event by its eventId using the eventId-index GSI.
 */
export async function getByEventId(eventId: string): Promise<CalendarEvent | undefined> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'eventId-index',
      KeyConditionExpression: 'eventId = :eventId',
      ExpressionAttributeValues: { ':eventId': eventId },
      Limit: 1,
    }),
  );
  return result.Items?.[0] as CalendarEvent | undefined;
}

/**
 * Deletes a calendar event by its composite key (userId + startDateTime).
 */
export async function deleteEvent(userId: string, startDateTime: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { userId, startDateTime },
    }),
  );
}

/**
 * Updates the status of a calendar event.
 */
export async function updateStatus(
  userId: string,
  startDateTime: string,
  status: CalendarEventStatus,
  updatedAt: string,
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { userId, startDateTime },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': updatedAt,
      },
    }),
  );
}
