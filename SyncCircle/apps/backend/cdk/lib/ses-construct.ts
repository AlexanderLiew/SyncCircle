import { EmailIdentity, Identity } from 'aws-cdk-lib/aws-ses';
import { Construct } from 'constructs';

export interface SesConstructProps {
  /** The email address to verify as an SES sender identity. */
  senderEmail: string;
}

/**
 * SesConstruct configures a verified SES sender identity so the
 * Friends Backend can send invitation emails.
 *
 * In SES sandbox mode, both sender and recipient must be verified.
 * This construct handles the sender side. Recipients must be verified
 * manually in the AWS console or by requesting production access.
 */
export class SesConstruct extends Construct {
  public readonly emailIdentity: EmailIdentity;

  constructor(scope: Construct, id: string, props: SesConstructProps) {
    super(scope, id);

    this.emailIdentity = new EmailIdentity(this, 'SenderIdentity', {
      identity: Identity.email(props.senderEmail),
    });
  }
}
