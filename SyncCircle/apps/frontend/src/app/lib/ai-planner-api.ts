/**
 * API service layer for the AI Planner Integration feature.
 *
 * Provides typed functions for all AI Planner backend endpoints including
 * planning sessions, meeting invitations, and timetable privacy settings.
 *
 * Uses the existing apiClient which handles JWT auth tokens, error responses,
 * and JSON parsing automatically.
 *
 * @see Requirements 14.3, 14.4, 15.3, 15.4
 */

import { apiClient } from './api-client';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Lifecycle status of a planning session. */
export type PlanningSessionStatus =
  | 'draft'
  | 'generating'
  | 'options-generated'
  | 'creator-accepted'
  | 'confirmed'
  | 'cancelled'
  | 'rejected';

/** Planning session mode. */
export type PlanningMode = 'personal' | 'group';

/** Status of a proposed time option within a session. */
export type ProposedOptionStatus = 'proposed' | 'accepted' | 'rejected';

/** Status of a meeting invitation. */
export type MeetingInvitationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'cancelled';

/** Status of a calendar event. */
export type CalendarEventStatus = 'active' | 'cancelled';

/** Timetable visibility for group planning. */
export type TimetableVisibility = 'friends' | 'none';

/** User preferences that influence AI recommendations. */
export interface AIPreferences {
  responseStyle: 'concise' | 'detailed';
  planningAggressiveness: 'relaxed' | 'moderate' | 'aggressive';
}

/** A proposed time option stored on a planning session. */
export interface ProposedTimeOption {
  optionId: string;
  start: string;
  end: string;
  durationMinutes: number;
  explanation: string;
  score: number;
  status: ProposedOptionStatus;
}

/** A contiguous time range. */
export interface TimeSlot {
  start: string;
  end: string;
}

/** A planning session record. */
export interface PlanningSession {
  sessionId: string;
  creatorUserId: string;
  mode: PlanningMode;
  status: PlanningSessionStatus;
  activity: string;
  durationMinutes: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  participantUserIds: string[];
  proposedOptions: ProposedTimeOption[];
  excludedOptions: TimeSlot[];
  acceptedOptionId?: string;
  privacyExclusions: string[];
  preferences: AIPreferences;
  createdAt: string;
  updatedAt: string;
}

/** A calendar event record. */
export interface CalendarEvent {
  userId: string;
  startDateTime: string;
  eventId: string;
  title: string;
  endDateTime: string;
  durationMinutes: number;
  location?: string;
  planningSessionId?: string;
  participantUserIds: string[];
  status: CalendarEventStatus;
  createdAt: string;
  updatedAt: string;
}

/** A meeting invitation record. */
export interface MeetingInvitation {
  invitationId: string;
  planningSessionId: string;
  eventId: string;
  senderUserId: string;
  receiverUserId: string;
  status: MeetingInvitationStatus;
  createdAt: string;
  respondedAt?: string;
  expiresAt: string;
}

// ─── Request Types ───────────────────────────────────────────────────────────

/** POST /ai-planner/personal — request body */
export interface CreatePersonalSessionRequest {
  activity: string;
  durationMinutes: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  preferences?: AIPreferences;
}

/** POST /ai-planner/group — request body */
export interface CreateGroupSessionRequest extends CreatePersonalSessionRequest {
  participantUserIds: string[];
}

/** POST /planning-sessions/{sessionId}/accept-option — request body */
export interface AcceptOptionRequest {
  optionId: string;
}

/** POST /planning-sessions/{sessionId}/reject-option — request body */
export interface RejectOptionRequest {
  optionId: string;
}

/** PUT /timetable/privacy — request body */
export interface UpdatePrivacySettingRequest {
  visibility: TimetableVisibility;
}

// ─── Response Types ──────────────────────────────────────────────────────────

/** Response for session creation (personal or group). */
export interface CreateSessionResponse {
  sessionId: string;
  status: PlanningSessionStatus;
  options: ProposedTimeOption[];
  aiAvailable: boolean;
  privacyExclusions?: string[];
}

/** Response for accept-option endpoint. */
export interface AcceptOptionResponse {
  sessionId: string;
  status: PlanningSessionStatus;
  event: CalendarEvent;
  invitations?: MeetingInvitation[];
}

/** Response for reject-option endpoint. */
export interface RejectOptionResponse {
  sessionId: string;
  status: PlanningSessionStatus;
  rejectedOptionId: string;
}

/** Response for next-option endpoint. */
export interface NextOptionResponse {
  sessionId: string;
  status: PlanningSessionStatus;
  options: ProposedTimeOption[];
  aiAvailable: boolean;
  message?: string;
}

/** Response for cancel-session endpoint. */
export interface CancelSessionResponse {
  sessionId: string;
  status: 'cancelled';
}

/** Response for list-sessions endpoint. */
export interface ListSessionsResponse {
  sessions: PlanningSession[];
}

/** Response for get-session endpoint. */
export interface GetSessionResponse {
  session: PlanningSession;
}

/** Response for accept/reject invitation endpoints. */
export interface InvitationActionResponse {
  invitationId: string;
  status: MeetingInvitationStatus;
  respondedAt: string;
  event?: CalendarEvent;
}

/** Response for list-invitations endpoint. */
export interface ListInvitationsResponse {
  invitations: MeetingInvitation[];
}

/** Response for get-invitation endpoint. */
export interface GetInvitationResponse {
  invitation: MeetingInvitation;
  event?: CalendarEvent;
}

/** Response for get/put privacy setting endpoints. */
export interface PrivacySettingResponse {
  userId: string;
  visibility: TimetableVisibility;
  updatedAt: string;
}

// ─── API Paths ───────────────────────────────────────────────────────────────

const AI_PLANNER_PATHS = {
  PERSONAL: '/ai-planner/personal',
  GROUP: '/ai-planner/group',
  SESSIONS: '/planning-sessions',
  SESSION_DETAIL: (sessionId: string) => `/planning-sessions/${sessionId}`,
  ACCEPT_OPTION: (sessionId: string) => `/planning-sessions/${sessionId}/accept-option`,
  REJECT_OPTION: (sessionId: string) => `/planning-sessions/${sessionId}/reject-option`,
  NEXT_OPTION: (sessionId: string) => `/planning-sessions/${sessionId}/next-option`,
  CANCEL_SESSION: (sessionId: string) => `/planning-sessions/${sessionId}/cancel`,
  INVITATIONS: '/meeting-invitations',
  INVITATION_DETAIL: (invitationId: string) => `/meeting-invitations/${invitationId}`,
  ACCEPT_INVITATION: (invitationId: string) => `/meeting-invitations/${invitationId}/accept`,
  REJECT_INVITATION: (invitationId: string) => `/meeting-invitations/${invitationId}/reject`,
  PRIVACY: '/timetable/privacy',
} as const;

// ─── Planning Session Endpoints ──────────────────────────────────────────────

/**
 * Create a personal planning session.
 * POST /ai-planner/personal
 */
export function createPersonalSession(
  request: CreatePersonalSessionRequest,
): Promise<CreateSessionResponse> {
  return apiClient.post<CreateSessionResponse>(AI_PLANNER_PATHS.PERSONAL, request);
}

/**
 * Create a group planning session.
 * POST /ai-planner/group
 */
export function createGroupSession(
  request: CreateGroupSessionRequest,
): Promise<CreateSessionResponse> {
  return apiClient.post<CreateSessionResponse>(AI_PLANNER_PATHS.GROUP, request);
}

/**
 * List all planning sessions for the authenticated user.
 * GET /planning-sessions
 */
export function listSessions(): Promise<ListSessionsResponse> {
  return apiClient.get<ListSessionsResponse>(AI_PLANNER_PATHS.SESSIONS);
}

/**
 * Get a specific planning session by ID.
 * GET /planning-sessions/{sessionId}
 */
export function getSession(sessionId: string): Promise<GetSessionResponse> {
  return apiClient.get<GetSessionResponse>(AI_PLANNER_PATHS.SESSION_DETAIL(sessionId));
}

/**
 * Accept a proposed time option on a planning session.
 * POST /planning-sessions/{sessionId}/accept-option
 */
export function acceptOption(
  sessionId: string,
  request: AcceptOptionRequest,
): Promise<AcceptOptionResponse> {
  return apiClient.post<AcceptOptionResponse>(
    AI_PLANNER_PATHS.ACCEPT_OPTION(sessionId),
    request,
  );
}

/**
 * Reject a proposed time option on a planning session.
 * POST /planning-sessions/{sessionId}/reject-option
 */
export function rejectOption(
  sessionId: string,
  request: RejectOptionRequest,
): Promise<RejectOptionResponse> {
  return apiClient.post<RejectOptionResponse>(
    AI_PLANNER_PATHS.REJECT_OPTION(sessionId),
    request,
  );
}

/**
 * Request new time options for a planning session (excludes previously rejected).
 * POST /planning-sessions/{sessionId}/next-option
 */
export function nextOption(sessionId: string): Promise<NextOptionResponse> {
  return apiClient.post<NextOptionResponse>(AI_PLANNER_PATHS.NEXT_OPTION(sessionId));
}

/**
 * Cancel a planning session.
 * POST /planning-sessions/{sessionId}/cancel
 */
export function cancelSession(sessionId: string): Promise<CancelSessionResponse> {
  return apiClient.post<CancelSessionResponse>(AI_PLANNER_PATHS.CANCEL_SESSION(sessionId));
}

// ─── Meeting Invitation Endpoints ────────────────────────────────────────────

/**
 * List all meeting invitations for the authenticated user.
 * GET /meeting-invitations
 */
export function listInvitations(): Promise<ListInvitationsResponse> {
  return apiClient.get<ListInvitationsResponse>(AI_PLANNER_PATHS.INVITATIONS);
}

/**
 * Get a specific meeting invitation by ID.
 * GET /meeting-invitations/{invitationId}
 */
export function getInvitation(invitationId: string): Promise<GetInvitationResponse> {
  return apiClient.get<GetInvitationResponse>(
    AI_PLANNER_PATHS.INVITATION_DETAIL(invitationId),
  );
}

/**
 * Accept a meeting invitation.
 * POST /meeting-invitations/{invitationId}/accept
 */
export function acceptInvitation(invitationId: string): Promise<InvitationActionResponse> {
  return apiClient.post<InvitationActionResponse>(
    AI_PLANNER_PATHS.ACCEPT_INVITATION(invitationId),
  );
}

/**
 * Reject a meeting invitation.
 * POST /meeting-invitations/{invitationId}/reject
 */
export function rejectInvitation(invitationId: string): Promise<InvitationActionResponse> {
  return apiClient.post<InvitationActionResponse>(
    AI_PLANNER_PATHS.REJECT_INVITATION(invitationId),
  );
}

// ─── Privacy Settings Endpoints ──────────────────────────────────────────────

/**
 * Get the authenticated user's timetable privacy settings.
 * GET /timetable/privacy
 */
export function getPrivacySettings(): Promise<PrivacySettingResponse> {
  return apiClient.get<PrivacySettingResponse>(AI_PLANNER_PATHS.PRIVACY);
}

/**
 * Update the authenticated user's timetable privacy settings.
 * PUT /timetable/privacy
 */
export function updatePrivacySettings(
  request: UpdatePrivacySettingRequest,
): Promise<PrivacySettingResponse> {
  return apiClient.put<PrivacySettingResponse>(AI_PLANNER_PATHS.PRIVACY, request);
}
