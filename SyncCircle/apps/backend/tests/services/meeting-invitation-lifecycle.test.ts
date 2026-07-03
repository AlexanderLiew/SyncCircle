import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external dependencies before importing the service
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: () => ({ send: vi.fn().mockResolvedValue({ Item: { userId: 'user-123', classes: [] } }) }),
  },
  GetCommand: vi.fn(),
  PutCommand: vi.fn(),
  QueryCommand: vi.fn(),
  UpdateCommand: vi.fn(),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../src/utils/canonical-pair.js', () => ({
  canonicalPair: (a: string, b: string) => {
    const [low, high] = [a, b].sort();
    return { userIdLow: low, userIdHigh: high };
  },
}));

vi.mock('../../src/repositories/planning-session.repo.js', () => ({
  create: vi.fn().mockResolvedValue(undefined),
  getById: vi.fn().mockResolvedValue(undefined),
  updateStatus: vi.fn().mockResolvedValue(undefined),
  updateOptions: vi.fn().mockResolvedValue(undefined),
  setAcceptedOption: vi.fn().mockResolvedValue(undefined),
  addExcludedOptions: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/repositories/calendar-event.repo.js', () => ({
  getByUserAndDateRange: vi.fn().mockResolvedValue([]),
  getByEventId: vi.fn().mockResolvedValue(undefined),
  create: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/repositories/meeting-invitation.repo.js', () => ({
  create: vi.fn().mockResolvedValue(undefined),
  getById: vi.fn().mockResolvedValue(undefined),
  updateStatus: vi.fn().mockResolvedValue(undefined),
  queryByReceiverUserId: vi.fn().mockResolvedValue([]),
  queryByPlanningSessionId: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../src/repositories/timetable-privacy.repo.js', () => ({
  get: vi.fn().mockResolvedValue({ userId: 'test', visibility: 'friends', updatedAt: '' }),
}));

vi.mock('../../src/repositories/friendship.repo.js', () => ({
  getByCanonicalPair: vi.fn().mockResolvedValue({ status: 'active' }),
}));

vi.mock('../../src/services/availability-calculator.js', () => ({
  computeFreePeriods: vi.fn().mockReturnValue([]),
  intersectFreePeriods: vi.fn().mockReturnValue([]),
}));

vi.mock('../../src/services/ai-integration.service.js', () => ({
  rankTimeSlots: vi.fn().mockResolvedValue({ options: [], aiAvailable: true }),
}));

import {
  acceptInvitation,
  rejectInvitation,
} from '../../src/services/planning-session.service.js';
import * as meetingInvitationRepo from '../../src/repositories/meeting-invitation.repo.js';
import * as calendarEventRepo from '../../src/repositories/calendar-event.repo.js';
import * as planningSessionRepo from '../../src/repositories/planning-session.repo.js';

/**
 * Tests for Meeting Invitation Lifecycle
 * Validates Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 12.5
 */

const RECEIVER_USER_ID = 'receiver-user-1';
const SENDER_USER_ID = 'sender-user-1';
const INVITATION_ID = 'invitation-123';
const SESSION_ID = 'session-456';
const EVENT_ID = 'event-789';

function buildPendingInvitation(overrides?: Partial<any>) {
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  return {
    invitationId: INVITATION_ID,
    planningSessionId: SESSION_ID,
    eventId: EVENT_ID,
    senderUserId: SENDER_USER_ID,
    receiverUserId: RECEIVER_USER_ID,
    status: 'pending',
    createdAt,
    expiresAt,
    ...overrides,
  };
}

function buildCreatorEvent() {
  return {
    userId: SENDER_USER_ID,
    startDateTime: '2025-01-20T09:00:00.000Z',
    eventId: EVENT_ID,
    title: 'Group Study Session',
    endDateTime: '2025-01-20T10:00:00.000Z',
    durationMinutes: 60,
    location: 'Library Room 3',
    planningSessionId: SESSION_ID,
    participantUserIds: [RECEIVER_USER_ID, 'other-user'],
    status: 'active',
    createdAt: '2025-01-19T10:00:00.000Z',
    updatedAt: '2025-01-19T10:00:00.000Z',
  };
}

describe('acceptInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns NOT_FOUND when invitation does not exist', async () => {
    vi.mocked(meetingInvitationRepo.getById).mockResolvedValue(undefined);

    const result = await acceptInvitation(RECEIVER_USER_ID, 'nonexistent-id');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('returns FORBIDDEN when userId does not match receiverUserId (Requirement 12.5)', async () => {
    vi.mocked(meetingInvitationRepo.getById).mockResolvedValue(buildPendingInvitation() as any);

    const result = await acceptInvitation('wrong-user-id', INVITATION_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('returns current status when already accepted (idempotent)', async () => {
    const respondedAt = '2025-01-19T15:00:00.000Z';
    vi.mocked(meetingInvitationRepo.getById).mockResolvedValue(
      buildPendingInvitation({ status: 'accepted', respondedAt }) as any,
    );

    const result = await acceptInvitation(RECEIVER_USER_ID, INVITATION_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('accepted');
      expect(result.data.respondedAt).toBe(respondedAt);
    }
  });

  it('returns current status when already rejected (idempotent)', async () => {
    const respondedAt = '2025-01-19T15:00:00.000Z';
    vi.mocked(meetingInvitationRepo.getById).mockResolvedValue(
      buildPendingInvitation({ status: 'rejected', respondedAt }) as any,
    );

    const result = await acceptInvitation(RECEIVER_USER_ID, INVITATION_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('rejected');
      expect(result.data.respondedAt).toBe(respondedAt);
    }
  });

  it('returns EXPIRED when invitation has expired (Requirement 5.5)', async () => {
    const expiredInvitation = buildPendingInvitation({
      expiresAt: new Date(Date.now() - 1000).toISOString(), // already expired
    });
    vi.mocked(meetingInvitationRepo.getById).mockResolvedValue(expiredInvitation as any);

    const result = await acceptInvitation(RECEIVER_USER_ID, INVITATION_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('EXPIRED');
    }
    // Verify it marked the invitation as expired
    expect(meetingInvitationRepo.updateStatus).toHaveBeenCalledWith(
      INVITATION_ID,
      'expired',
      expect.any(String),
    );
  });

  it('accepts invitation, creates CalendarEvent, and returns response (Requirement 5.2)', async () => {
    vi.mocked(meetingInvitationRepo.getById).mockResolvedValue(buildPendingInvitation() as any);
    vi.mocked(calendarEventRepo.getByEventId).mockResolvedValue(buildCreatorEvent() as any);
    vi.mocked(meetingInvitationRepo.queryByPlanningSessionId).mockResolvedValue([
      buildPendingInvitation({ status: 'accepted' }) as any,
    ]);

    const result = await acceptInvitation(RECEIVER_USER_ID, INVITATION_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('accepted');
      expect(result.data.respondedAt).toBeDefined();
      expect(result.data.event).toBeDefined();
      expect(result.data.event!.userId).toBe(RECEIVER_USER_ID);
      expect(result.data.event!.title).toBe('Group Study Session');
      expect(result.data.event!.startDateTime).toBe('2025-01-20T09:00:00.000Z');
    }

    // Verify invitation status was updated
    expect(meetingInvitationRepo.updateStatus).toHaveBeenCalledWith(
      INVITATION_ID,
      'accepted',
      expect.any(String),
    );
    // Verify CalendarEvent was created
    expect(calendarEventRepo.create).toHaveBeenCalled();
  });

  it('triggers session rollup to confirmed when all invitations responded with at least one accepted (Requirement 5.4)', async () => {
    vi.mocked(meetingInvitationRepo.getById).mockResolvedValue(buildPendingInvitation() as any);
    vi.mocked(calendarEventRepo.getByEventId).mockResolvedValue(buildCreatorEvent() as any);
    // All invitations responded — one accepted, one rejected
    vi.mocked(meetingInvitationRepo.queryByPlanningSessionId).mockResolvedValue([
      buildPendingInvitation({ status: 'accepted' }) as any,
      buildPendingInvitation({ invitationId: 'inv-2', status: 'rejected', receiverUserId: 'other-user' }) as any,
    ]);

    await acceptInvitation(RECEIVER_USER_ID, INVITATION_ID);

    // Session should be updated to 'confirmed'
    expect(planningSessionRepo.updateStatus).toHaveBeenCalledWith(
      SESSION_ID,
      'confirmed',
      expect.any(String),
    );
  });
});

describe('rejectInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns NOT_FOUND when invitation does not exist', async () => {
    vi.mocked(meetingInvitationRepo.getById).mockResolvedValue(undefined);

    const result = await rejectInvitation(RECEIVER_USER_ID, 'nonexistent-id');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('returns FORBIDDEN when userId does not match receiverUserId (Requirement 12.5)', async () => {
    vi.mocked(meetingInvitationRepo.getById).mockResolvedValue(buildPendingInvitation() as any);

    const result = await rejectInvitation('wrong-user-id', INVITATION_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('returns current status when already rejected (idempotent)', async () => {
    const respondedAt = '2025-01-19T15:00:00.000Z';
    vi.mocked(meetingInvitationRepo.getById).mockResolvedValue(
      buildPendingInvitation({ status: 'rejected', respondedAt }) as any,
    );

    const result = await rejectInvitation(RECEIVER_USER_ID, INVITATION_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('rejected');
      expect(result.data.respondedAt).toBe(respondedAt);
    }
  });

  it('returns EXPIRED when invitation has expired (Requirement 5.5)', async () => {
    const expiredInvitation = buildPendingInvitation({
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    vi.mocked(meetingInvitationRepo.getById).mockResolvedValue(expiredInvitation as any);

    const result = await rejectInvitation(RECEIVER_USER_ID, INVITATION_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('EXPIRED');
    }
  });

  it('rejects invitation and returns response without event (Requirement 5.3)', async () => {
    vi.mocked(meetingInvitationRepo.getById).mockResolvedValue(buildPendingInvitation() as any);
    vi.mocked(meetingInvitationRepo.queryByPlanningSessionId).mockResolvedValue([
      buildPendingInvitation({ status: 'rejected' }) as any,
    ]);

    const result = await rejectInvitation(RECEIVER_USER_ID, INVITATION_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('rejected');
      expect(result.data.respondedAt).toBeDefined();
      expect(result.data.event).toBeUndefined();
    }

    // Verify invitation status was updated
    expect(meetingInvitationRepo.updateStatus).toHaveBeenCalledWith(
      INVITATION_ID,
      'rejected',
      expect.any(String),
    );
  });

  it('triggers session rollup to rejected when all invitations rejected/expired (Requirement 5.4)', async () => {
    vi.mocked(meetingInvitationRepo.getById).mockResolvedValue(buildPendingInvitation() as any);
    // All invitations rejected
    vi.mocked(meetingInvitationRepo.queryByPlanningSessionId).mockResolvedValue([
      buildPendingInvitation({ status: 'rejected' }) as any,
      buildPendingInvitation({ invitationId: 'inv-2', status: 'expired', receiverUserId: 'other-user' }) as any,
    ]);

    await rejectInvitation(RECEIVER_USER_ID, INVITATION_ID);

    // Session should be updated to 'rejected'
    expect(planningSessionRepo.updateStatus).toHaveBeenCalledWith(
      SESSION_ID,
      'rejected',
      expect.any(String),
    );
  });

  it('does NOT trigger session rollup when some invitations are still pending', async () => {
    vi.mocked(meetingInvitationRepo.getById).mockResolvedValue(buildPendingInvitation() as any);
    // One rejected, one still pending
    vi.mocked(meetingInvitationRepo.queryByPlanningSessionId).mockResolvedValue([
      buildPendingInvitation({ status: 'rejected' }) as any,
      buildPendingInvitation({ invitationId: 'inv-2', status: 'pending', receiverUserId: 'other-user' }) as any,
    ]);

    await rejectInvitation(RECEIVER_USER_ID, INVITATION_ID);

    // Session status should NOT be updated
    expect(planningSessionRepo.updateStatus).not.toHaveBeenCalled();
  });
});
