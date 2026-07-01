/**
 * Internal handler types for the friends backend Lambda functions.
 */

// Re-export shared types for convenience within the backend
export type {
  UserProfile,
  FriendRequest,
  Friendship,
  FriendshipAccessResult,
  ErrorResponse,
} from '@synccircle/shared';

/** Authenticated user context extracted from Cognito JWT by API Gateway */
export interface AuthContext {
  userId: string;
  email: string;
  normalizedEmail: string;
}

/** Standard Lambda handler event with auth context */
export interface AuthenticatedEvent {
  body?: string;
  pathParameters?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
  requestContext: {
    authorizer: {
      claims: {
        sub: string;
        email: string;
        [key: string]: string;
      };
    };
  };
}
