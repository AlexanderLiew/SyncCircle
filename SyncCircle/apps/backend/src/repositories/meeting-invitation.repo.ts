import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { MeetingInvitation, MeetingInvitationStatus } from '../types/ai-planner.types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.MEETING_INVITATIONS_TABLE!;

/**
 * Creates a new meeting invitation record.
 */
export async function create(invitation: MeetingInvitation): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: invitation,
    }),
  );
}

/**
 * Gets a meeting invitation by its invitationId (partition key).
 */
export async function getById(invitationId: string): Promise<MeetingInvitation | undefined> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { invitationId },
    }),
  );
  return result.Item as MeetingInvitation | undefined;
}

/**
 * Updates the status of a meeting invitation.
 */
export async function updateStatus(
  invitationId: string,
  status: MeetingInvitationStatus,
  respondedAt: string,
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { invitationId },
      UpdateExpression: 'SET #status = :status, respondedAt = :respondedAt',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': status,
        ':respondedAt': respondedAt,
      },
    }),
  );
}

/**
 * Queries all meeting invitations received by a user, ordered by createdAt descending.
 */
export async function queryByReceiverUserId(
  receiverUserId: string,
): Promise<MeetingInvitation[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'receiverUserId-createdAt-index',
      KeyConditionExpression: 'receiverUserId = :receiverUserId',
      ExpressionAttributeValues: { ':receiverUserId': receiverUserId },
      ScanIndexForward: false,
    }),
  );
  return (result.Items ?? []) as MeetingInvitation[];
}

/**
 * Queries all meeting invitations for a given planning session.
 */
export async function queryByPlanningSessionId(
  planningSessionId: string,
): Promise<MeetingInvitation[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'planningSessionId-index',
      KeyConditionExpression: 'planningSessionId = :planningSessionId',
      ExpressionAttributeValues: { ':planningSessionId': planningSessionId },
    }),
  );
  return (result.Items ?? []) as MeetingInvitation[];
}
