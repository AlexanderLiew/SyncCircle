/**
 * POST /tasks/notify — Lambda handler
 *
 * Sends a reminder email via SES for a task due tomorrow.
 * Validates the request body, looks up the user's email from the
 * UserProfiles table, composes a friendly reminder, and sends it.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { ERROR_CODES } from '@synccircle/shared';
import { success, error } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const sesClient = new SESClient({});

const TABLE_NAME = process.env.USER_PROFILES_TABLE!;
const SES_SENDER_EMAIL = process.env.SES_SENDER_EMAIL ?? 'noreply@synccircle.com';

/**
 * Validates that the dueDate string matches YYYY-MM-DD with valid calendar values.
 */
export function isValidDueDate(dueDate: string): boolean {
  if (typeof dueDate !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dueDate)) return false;

  const [yearStr, monthStr, dayStr] = dueDate.split('-');
  const year = parseInt(yearStr!, 10);
  const month = parseInt(monthStr!, 10);
  const day = parseInt(dayStr!, 10);

  if (month < 1 || month > 12) return false;
  if (day < 1) return false;

  // Use Date to validate day-of-month for the given year/month
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Validates the request body for the notify endpoint.
 */
export function validateNotifyRequest(body: unknown): {
  valid: boolean;
  taskTitle?: string;
  dueDate?: string;
  errorMessage?: string;
  errorField?: string;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, errorMessage: 'Invalid request body', errorField: undefined };
  }

  const { taskTitle, dueDate } = body as Record<string, unknown>;

  // Validate taskTitle
  if (typeof taskTitle !== 'string' || taskTitle.trim().length === 0) {
    return { valid: false, errorMessage: 'taskTitle is required and must be a non-empty string', errorField: 'taskTitle' };
  }
  if (taskTitle.length > 200) {
    return { valid: false, errorMessage: 'taskTitle must not exceed 200 characters', errorField: 'taskTitle' };
  }

  // Validate dueDate
  if (typeof dueDate !== 'string' || !isValidDueDate(dueDate)) {
    return { valid: false, errorMessage: 'dueDate must be a valid date in YYYY-MM-DD format', errorField: 'dueDate' };
  }

  return { valid: true, taskTitle: taskTitle, dueDate: dueDate };
}

/**
 * Composes the email subject and body for a task reminder.
 */
export function composeReminderEmail(taskTitle: string, dueDate: string): {
  subject: string;
  textBody: string;
  htmlBody: string;
} {
  const subject = `Reminder: "${taskTitle}" is due on ${dueDate}`;

  const textBody = [
    `Hi there!`,
    ``,
    `This is a friendly reminder that your task "${taskTitle}" is due on ${dueDate}.`,
    ``,
    `Make sure to complete it before the deadline. You've got this!`,
    ``,
    `— The SyncCircle Team`,
  ].join('\n');

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Reminder - SyncCircle</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f7; color: #333333;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f7; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color: #4f46e5; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">SyncCircle</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; color: #1a1a2e;">Task Reminder</h2>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #4a4a68;">
                Hi there! This is a friendly reminder that your task <strong>"${taskTitle}"</strong> is due on <strong>${dueDate}</strong>.
              </p>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #4a4a68;">
                Make sure to complete it before the deadline. You've got this!
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                &copy; ${new Date().getFullYear()} SyncCircle. You received this email because you have a task due soon.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, textBody, htmlBody };
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // 1. Parse request body
  let body: unknown;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return error(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid JSON body');
  }

  // 2. Validate request body
  const validation = validateNotifyRequest(body);
  if (!validation.valid) {
    return error(400, ERROR_CODES.VALIDATION_ERROR, validation.errorMessage!, validation.errorField);
  }

  const { taskTitle, dueDate } = validation;

  // 3. Extract userId from Cognito authorizer claims
  const userId = event.requestContext.authorizer?.claims?.sub as string | undefined;
  if (!userId) {
    return error(401, ERROR_CODES.UNAUTHORIZED, 'Missing authentication');
  }

  try {
    // 4. Look up user profile from DynamoDB
    const getResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { userId },
      }),
    );

    if (!getResult.Item) {
      return error(404, ERROR_CODES.NOT_FOUND, 'User profile not found');
    }

    const userEmail = getResult.Item.email as string;

    // 5. Compose and send reminder email via SES
    const { subject, textBody, htmlBody } = composeReminderEmail(taskTitle!, dueDate!);

    const sendCommand = new SendEmailCommand({
      Source: SES_SENDER_EMAIL,
      Destination: {
        ToAddresses: [userEmail],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
        },
      },
    });

    await sesClient.send(sendCommand);

    logger.info('Task reminder email sent successfully', {
      userId,
      taskTitle: taskTitle!,
      dueDate: dueDate!,
    });

    return success({ message: 'Reminder email sent successfully' });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    logger.error('Failed to send reminder email', {
      userId,
      errorMessage,
    });

    return error(500, ERROR_CODES.INTERNAL_ERROR, 'Failed to send reminder email');
  }
}
