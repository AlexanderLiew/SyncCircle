/**
 * Email service for sending invitation emails via Amazon SES.
 *
 * Composes invitation emails with sender display name, app branding,
 * invitation link, 7-day expiry note, and login/register instructions.
 * Supports a local adapter mode that logs email content instead of
 * calling SES (controlled by EMAIL_ADAPTER env var).
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { logger } from '../utils/logger.js';

/** Env var: verified SES sender email address. */
const SES_SENDER_EMAIL = process.env.SES_SENDER_EMAIL ?? 'noreply@synccircle.com';

/** Env var: frontend base URL for constructing invitation links. */
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL ?? 'https://app.synccircle.com';

/** Env var: if set to "local", log the email instead of sending via SES. */
const EMAIL_ADAPTER = process.env.EMAIL_ADAPTER ?? '';

const APP_NAME = 'SyncCircle';
const TOKEN_EXPIRY_DAYS = 7;

/** Lazily-initialized SES client (only created when needed). */
let sesClient: SESClient | null = null;

function getSesClient(): SESClient {
  if (!sesClient) {
    sesClient = new SESClient({});
  }
  return sesClient;
}

export interface SendInvitationEmailParams {
  recipientEmail: string;
  senderDisplayName: string;
  token: string;
}

export interface SendInvitationEmailResult {
  emailSent: boolean;
}

/**
 * Constructs the invitation link from the configured base URL and token.
 */
function buildInvitationLink(token: string): string {
  return `${FRONTEND_BASE_URL}/invite/${token}`;
}

/**
 * Composes the plain text version of the invitation email.
 */
function composePlainText(senderDisplayName: string, invitationLink: string): string {
  return [
    `You've been invited to connect on ${APP_NAME}!`,
    '',
    `${senderDisplayName} would like to add you as a friend on ${APP_NAME}.`,
    '',
    `Click the link below to respond to this invitation:`,
    invitationLink,
    '',
    `This invitation link will expire in ${TOKEN_EXPIRY_DAYS} days.`,
    '',
    `If you already have a ${APP_NAME} account, log in to respond.`,
    `If you don't have an account yet, register with this email address to accept the invitation.`,
    '',
    `If you don't know ${senderDisplayName} or don't wish to connect, you can safely ignore this email.`,
  ].join('\n');
}

/**
 * Composes the HTML version of the invitation email.
 */
function composeHtml(senderDisplayName: string, invitationLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Friend Invitation - ${APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f7; color: #333333;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f7; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: #4f46e5; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">${APP_NAME}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; color: #1a1a2e;">You've been invited to connect!</h2>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #4a4a68;">
                <strong>${senderDisplayName}</strong> would like to add you as a friend on ${APP_NAME}.
              </p>
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 24px;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #4f46e5;">
                    <a href="${invitationLink}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">
                      View Invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.5; color: #6b6b80;">
                This invitation link will expire in <strong>${TOKEN_EXPIRY_DAYS} days</strong>.
              </p>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.5; color: #6b6b80;">
                If you already have a ${APP_NAME} account, log in to respond. If you don't have an account yet, register with this email address to accept the invitation.
              </p>
              <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #6b6b80;">
                If you don't know ${senderDisplayName} or don't wish to connect, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                &copy; ${new Date().getFullYear()} ${APP_NAME}. You received this email because someone invited you to connect.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends an invitation email to the recipient.
 *
 * In local adapter mode (EMAIL_ADAPTER=local), logs the full email content
 * instead of calling SES. In production mode, sends via SES with both
 * HTML and plain text parts.
 *
 * Returns `{ emailSent: true }` on success or `{ emailSent: false }` on failure.
 * SES failures are handled gracefully — errors are logged but not thrown.
 */
export async function sendInvitationEmail(
  params: SendInvitationEmailParams,
): Promise<SendInvitationEmailResult> {
  const { recipientEmail, senderDisplayName, token } = params;
  const invitationLink = buildInvitationLink(token);
  const subject = `${senderDisplayName} wants to connect with you on ${APP_NAME}`;
  const plainTextBody = composePlainText(senderDisplayName, invitationLink);
  const htmlBody = composeHtml(senderDisplayName, invitationLink);

  // Local adapter mode: log the email instead of sending via SES
  if (EMAIL_ADAPTER.toLowerCase() === 'local') {
    logger.info('Local email adapter: invitation email composed', {
      recipient: recipientEmail,
      subject,
      plainTextBody,
      htmlBody,
      invitationLink,
    });
    return { emailSent: true };
  }

  // Production mode: send via SES
  try {
    const client = getSesClient();
    const command = new SendEmailCommand({
      Source: SES_SENDER_EMAIL,
      Destination: {
        ToAddresses: [recipientEmail],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: plainTextBody,
            Charset: 'UTF-8',
          },
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
        },
      },
    });

    await client.send(command);

    logger.info('Invitation email sent successfully', {
      recipient: recipientEmail,
    });

    return { emailSent: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error('Failed to send invitation email via SES', {
      errorMessage,
      recipient: recipientEmail,
    });

    return { emailSent: false };
  }
}
