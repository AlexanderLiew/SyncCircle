import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type {
  PlanningSession,
  PlanningSessionStatus,
  ProposedTimeOption,
  TimeSlot,
  AIPreferences,
} from '../types/ai-planner.types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.PLANNING_SESSIONS_TABLE!;

/**
 * Creates a new planning session record.
 */
export async function create(session: PlanningSession): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: session,
    }),
  );
}

/**
 * Gets a planning session by its sessionId (partition key).
 */
export async function getById(sessionId: string): Promise<PlanningSession | undefined> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { sessionId },
    }),
  );
  return result.Item as PlanningSession | undefined;
}

/**
 * Updates the status of a planning session.
 */
export async function updateStatus(
  sessionId: string,
  status: PlanningSessionStatus,
  updatedAt: string,
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { sessionId },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': updatedAt,
      },
    }),
  );
}

/**
 * Updates the proposed options on a planning session.
 */
export async function updateOptions(
  sessionId: string,
  proposedOptions: ProposedTimeOption[],
  status: PlanningSessionStatus,
  updatedAt: string,
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { sessionId },
      UpdateExpression:
        'SET proposedOptions = :options, #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':options': proposedOptions,
        ':status': status,
        ':updatedAt': updatedAt,
      },
    }),
  );
}

/**
 * Sets the accepted option ID on a session and updates status.
 */
export async function setAcceptedOption(
  sessionId: string,
  acceptedOptionId: string,
  status: PlanningSessionStatus,
  updatedAt: string,
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { sessionId },
      UpdateExpression:
        'SET acceptedOptionId = :optionId, #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':optionId': acceptedOptionId,
        ':status': status,
        ':updatedAt': updatedAt,
      },
    }),
  );
}

/**
 * Adds rejected time slots to the excludedOptions list.
 */
export async function addExcludedOptions(
  sessionId: string,
  excludedSlots: TimeSlot[],
  updatedAt: string,
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { sessionId },
      UpdateExpression:
        'SET excludedOptions = list_append(if_not_exists(excludedOptions, :emptyList), :slots), updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':slots': excludedSlots,
        ':emptyList': [],
        ':updatedAt': updatedAt,
      },
    }),
  );
}

/**
 * Queries all planning sessions created by a user, ordered by createdAt descending.
 */
export async function queryByCreatorUserId(creatorUserId: string): Promise<PlanningSession[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'creatorUserId-createdAt-index',
      KeyConditionExpression: 'creatorUserId = :creatorUserId',
      ExpressionAttributeValues: { ':creatorUserId': creatorUserId },
      ScanIndexForward: false,
    }),
  );
  return (result.Items ?? []) as PlanningSession[];
}
