/**
 * POST /friends/search — Lambda handler
 *
 * Searches for a user by email and display name. Returns a status indicating
 * whether the user was found, not registered, name mismatch, already friends,
 * pending request, or self-search.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { SearchRequest, SearchResponse } from '@synccircle/shared';
import { ERROR_CODES } from '@synccircle/shared';
import {
  validateEmail,
  validateDisplayName,
  normalizeEmail,
  compareDisplayNames,
  isSelfAction,
} from '../services/validation.service';
import * as userProfileRepo from '../repositories/user-profile.repo';
import * as friendshipRepo from '../repositories/friendship.repo';
import * as friendRequestRepo from '../repositories/friend-request.repo';
import { canonicalPair } from '../utils/canonical-pair';
import { success, error } from '../utils/response';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // Parse request body
  let body: SearchRequest;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return error(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid JSON body');
  }

  const { email, displayName } = body;

  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    const firstError = emailValidation.errors[0]!;
    return error(400, ERROR_CODES.VALIDATION_ERROR, firstError.message, firstError.field);
  }

  // Validate displayName
  const nameValidation = validateDisplayName(displayName);
  if (!nameValidation.valid) {
    const firstError = nameValidation.errors[0]!;
    return error(400, ERROR_CODES.VALIDATION_ERROR, firstError.message, firstError.field);
  }

  // Extract caller identity from Cognito authorizer
  const callerUserId = event.requestContext.authorizer?.claims?.sub as string;
  const callerEmail = event.requestContext.authorizer?.claims?.email as string;

  // Check self-search
  if (isSelfAction(callerEmail, email)) {
    const response: SearchResponse = {
      status: 'self_search',
      message: 'You cannot search for yourself',
    };
    return success(response);
  }

  // Look up user by normalized email
  const normalizedSearchEmail = normalizeEmail(email);
  const profile = await userProfileRepo.getByNormalizedEmail(normalizedSearchEmail);

  // User not registered
  if (!profile) {
    const response: SearchResponse = {
      status: 'not_registered',
      message: 'This user is not registered on SyncCircle',
    };
    return success(response);
  }

  // Display name mismatch
  if (!compareDisplayNames(displayName, profile.displayName)) {
    const response: SearchResponse = {
      status: 'name_mismatch',
      message: 'The display name does not match the registered user',
    };
    return success(response);
  }

  // Check existing active friendship
  const { userIdLow, userIdHigh } = canonicalPair(callerUserId, profile.userId);
  const existingFriendship = await friendshipRepo.getByCanonicalPair(userIdLow, userIdHigh);

  if (existingFriendship && existingFriendship.status === 'active') {
    const response: SearchResponse = {
      status: 'already_friends',
      message: 'You are already friends with this user',
    };
    return success(response);
  }

  // Check pending friend request in either direction
  const pendingRequests = await friendRequestRepo.queryPendingBetweenUsers(
    callerUserId,
    profile.userId,
  );

  if (pendingRequests.length > 0) {
    const response: SearchResponse = {
      status: 'pending_request',
      message: 'A friend request is already pending between you and this user',
    };
    return success(response);
  }

  // User found — all checks passed
  const response: SearchResponse = {
    status: 'found',
    message: 'User found',
  };
  return success(response);
}
