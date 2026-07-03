/**
 * Privacy enforcement tests for group planning flow.
 *
 * Validates Requirements: 8.3, 8.4, 18.1, 18.2, 18.3, 18.4
 *
 * Verifies that:
 * - Group planning API responses never include individual TimetableClass titles, module codes, or locations
 * - Only common FreePeriod time ranges are returned without participant attribution
 * - When privacy is "none", availability is indicated as "unknown" without revealing timetable existence
 * - AI model prompts contain only computed FreePeriods, never participant timetable details
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: () => ({
      send: vi.fn().mockResolvedValue({
        Item: {
          userId: 'creator-1',
          classes: [
            {
              id: 'class-1',
              title: 'Advanced Algorithms',
              moduleCode: 'CS3230',
              location: 'COM1-0212',
              dayOfWeek: 0,
              startTime: '10:00',
              endTime: '12:00',
              color: '#ff0000',
              source: 'nusmods',
            },
          ],
        },
      }),
    }),
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
}));

vi.mock('../../src/repositories/calendar-event.repo.js', () => ({
  create: vi.fn().mockResolvedValue(undefined),
  getByUserAndDateRange: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../src/repositories/meeting-invitation.repo.js', () => ({
  create: vi.fn().mockResolvedValue(undefined),
  queryByPlanningSessionId: vi.fn().mockResolvedValue([]),
}));

const mockPrivacyGet = vi.fn();
vi.mock('../../src/repositories/timetable-privacy.repo.js', () => ({
  get: (...args: any[]) => mockPrivacyGet(...args),
}));

vi.mock('../../src/repositories/friendship.repo.js', () => ({
  getByCanonicalPair: vi.fn().mockResolvedValue({ status: 'active' }),
}));

vi.mock('../../src/services/availability-calculator.js', () => ({
  computeFreePeriods: vi.fn().mockReturnValue([
    { start: '2025-01-20T09:00:00.000Z', end: '2025-01-20T11:00:00.000Z', durationMinutes: 120 },
    { start: '2025-01-20T14:00:00.000Z', end: '2025-01-20T17:00:00.000Z', durationMinutes: 180 },
  ]),
  intersectFreePeriods: vi.fn().mockReturnValue([
    { start: '2025-01-20T14:00:00.000Z', end: '2025-01-20T16:00:00.000Z', durationMinutes: 120 },
  ]),
}));

const mockRankTimeSlots = vi.fn().mockResolvedValue({
  options: [
    {
      start: '2025-01-20T14:00:00.000Z',
      end: '2025-01-20T15:00:00.000Z',
      explanation: 'Good afternoon slot for group study',
      score: 90,
    },
  ],
  aiAvailable: true,
});

vi.mock('../../src/services/ai-integration.service.js', () => ({
  rankTimeSlots: (...args: any[]) => mockRankTimeSlots(...args),
}));

import {
  createGroupSession,
  type CreateGroupSessionParams,
} from '../../src/services/planning-session.service.js';
import type { CreateSessionResponse, FreePeriod } from '../../src/types/ai-planner.types.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildGroupParams(overrides?: Partial<CreateGroupSessionParams>): CreateGroupSessionParams {
  const today = new Date();
  const startDate = today.toISOString().slice(0, 10);
  const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return {
    userId: 'creator-1',
    activity: 'Group study session',
    durationMinutes: 60,
    dateRangeStart: startDate,
    dateRangeEnd: endDate,
    participantUserIds: ['friend-1', 'friend-2'],
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Group Planning Privacy Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: all participants have "friends" privacy
    mockPrivacyGet.mockResolvedValue({ userId: 'test', visibility: 'friends', updatedAt: '' });
  });

  describe('Requirement 18.1: No individual timetable class details in response', () => {
    it('response does NOT contain TimetableClass titles, module codes, or locations', async () => {
      const result = await createGroupSession(buildGroupParams());

      expect(result.success).toBe(true);
      if (result.success) {
        const responseJson = JSON.stringify(result.data);

        // Must NOT contain any timetable class details
        expect(responseJson).not.toContain('Advanced Algorithms');
        expect(responseJson).not.toContain('CS3230');
        expect(responseJson).not.toContain('COM1-0212');
        expect(responseJson).not.toContain('moduleCode');
        expect(responseJson).not.toContain('TimetableClass');
      }
    });

    it('response only contains ProposedTimeOption fields (start, end, duration, explanation, score)', async () => {
      const result = await createGroupSession(buildGroupParams());

      expect(result.success).toBe(true);
      if (result.success) {
        const { options } = result.data;
        for (const option of options) {
          // Verify only expected fields are present
          expect(option).toHaveProperty('optionId');
          expect(option).toHaveProperty('start');
          expect(option).toHaveProperty('end');
          expect(option).toHaveProperty('durationMinutes');
          expect(option).toHaveProperty('explanation');
          expect(option).toHaveProperty('score');
          expect(option).toHaveProperty('status');

          // Verify no timetable data leaks through
          expect(option).not.toHaveProperty('title');
          expect(option).not.toHaveProperty('moduleCode');
          expect(option).not.toHaveProperty('location');
          expect(option).not.toHaveProperty('classes');
          expect(option).not.toHaveProperty('timetable');
        }
      }
    });
  });

  describe('Requirement 18.2: Only common FreePeriod time ranges without attribution', () => {
    it('response options represent common time slots, not per-user availability', async () => {
      const result = await createGroupSession(buildGroupParams());

      expect(result.success).toBe(true);
      if (result.success) {
        // Response should not contain any per-user free period mapping
        const responseJson = JSON.stringify(result.data);
        expect(responseJson).not.toContain('friend-1');
        expect(responseJson).not.toContain('friend-2');

        // Options should only have time ranges
        for (const option of result.data.options) {
          expect(new Date(option.start).getTime()).not.toBeNaN();
          expect(new Date(option.end).getTime()).not.toBeNaN();
        }
      }
    });

    it('response does not include individual user free periods arrays', async () => {
      const result = await createGroupSession(buildGroupParams());

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as any;
        // No per-user free periods in response
        expect(data.freePeriodsByUser).toBeUndefined();
        expect(data.individualAvailability).toBeUndefined();
        expect(data.periodsPerUser).toBeUndefined();
      }
    });
  });

  describe('Requirement 18.3: Privacy "none" indicates unknown without revealing timetable', () => {
    it('excludes participant with privacy "none" and lists them in privacyExclusions', async () => {
      // friend-1 has privacy "none"
      mockPrivacyGet.mockImplementation(async (userId: string) => {
        if (userId === 'friend-1') {
          return { userId: 'friend-1', visibility: 'none', updatedAt: '' };
        }
        return { userId, visibility: 'friends', updatedAt: '' };
      });

      const result = await createGroupSession(buildGroupParams());

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.privacyExclusions).toBeDefined();
        expect(result.data.privacyExclusions).toContain('friend-1');
      }
    });

    it('does NOT reveal whether excluded participant has a timetable configured', async () => {
      // friend-1 has privacy "none"
      mockPrivacyGet.mockImplementation(async (userId: string) => {
        if (userId === 'friend-1') {
          return { userId: 'friend-1', visibility: 'none', updatedAt: '' };
        }
        return { userId, visibility: 'friends', updatedAt: '' };
      });

      const result = await createGroupSession(buildGroupParams());

      expect(result.success).toBe(true);
      if (result.success) {
        const responseJson = JSON.stringify(result.data);

        // privacyExclusions contains only the user ID — no metadata about timetable existence
        expect(responseJson).not.toContain('timetable');
        expect(responseJson).not.toContain('hasTimetable');
        expect(responseJson).not.toContain('timetableConfigured');
        expect(responseJson).not.toContain('classCount');
      }
    });

    it('no-availability suggestion does NOT mention timetable exclusion', async () => {
      const { intersectFreePeriods } = await import('../../src/services/availability-calculator.js');
      vi.mocked(intersectFreePeriods).mockReturnValueOnce([]);

      mockPrivacyGet.mockImplementation(async (userId: string) => {
        if (userId === 'friend-1') {
          return { userId: 'friend-1', visibility: 'none', updatedAt: '' };
        }
        return { userId, visibility: 'friends', updatedAt: '' };
      });

      const result = await createGroupSession(buildGroupParams());

      expect(result.success).toBe(false);
      if (!result.success && result.error.code === 'NO_AVAILABILITY') {
        const suggestionsStr = JSON.stringify(result.error.suggestions);
        // Should say "unknown availability", NOT "timetable excluded"
        expect(suggestionsStr).not.toContain('timetable excluded');
        expect(suggestionsStr).toContain('unknown availability');
      }
    });
  });

  describe('Requirement 18.4: AI model receives only FreePeriods, never timetable details', () => {
    it('rankTimeSlots receives only FreePeriods without timetable data', async () => {
      await createGroupSession(buildGroupParams());

      expect(mockRankTimeSlots).toHaveBeenCalledTimes(1);

      const aiRequest = mockRankTimeSlots.mock.calls[0]![0];

      // AI receives only FreePeriods
      expect(aiRequest.freePeriods).toBeDefined();
      expect(Array.isArray(aiRequest.freePeriods)).toBe(true);

      // Each FreePeriod should only have start, end, durationMinutes
      for (const fp of aiRequest.freePeriods as FreePeriod[]) {
        expect(fp).toHaveProperty('start');
        expect(fp).toHaveProperty('end');
        expect(fp).toHaveProperty('durationMinutes');
        expect(Object.keys(fp)).toHaveLength(3);
      }

      // AI request should NOT contain timetable data
      const requestJson = JSON.stringify(aiRequest);
      expect(requestJson).not.toContain('title');
      expect(requestJson).not.toContain('moduleCode');
      expect(requestJson).not.toContain('location');
      expect(requestJson).not.toContain('timetableClasses');
      expect(requestJson).not.toContain('Advanced Algorithms');
      expect(requestJson).not.toContain('CS3230');
      expect(requestJson).not.toContain('COM1-0212');
    });

    it('AI request contains activity, duration, preferences, and participantCount only', async () => {
      await createGroupSession(buildGroupParams());

      const aiRequest = mockRankTimeSlots.mock.calls[0]![0];

      // Allowed fields in AI request
      expect(aiRequest).toHaveProperty('freePeriods');
      expect(aiRequest).toHaveProperty('activity');
      expect(aiRequest).toHaveProperty('durationMinutes');
      expect(aiRequest).toHaveProperty('preferences');
      expect(aiRequest).toHaveProperty('participantCount');

      // No timetable-related fields
      expect(aiRequest).not.toHaveProperty('timetableClasses');
      expect(aiRequest).not.toHaveProperty('calendarEvents');
      expect(aiRequest).not.toHaveProperty('classes');
      expect(aiRequest).not.toHaveProperty('userTimetables');
    });
  });

  describe('Requirement 8.3: Excluded participants do not affect calculations', () => {
    it('excluded participant timetable is not passed to computeFreePeriods', async () => {
      const { computeFreePeriods } = await import('../../src/services/availability-calculator.js');

      mockPrivacyGet.mockImplementation(async (userId: string) => {
        if (userId === 'friend-1') {
          return { userId: 'friend-1', visibility: 'none', updatedAt: '' };
        }
        return { userId, visibility: 'friends', updatedAt: '' };
      });

      await createGroupSession(buildGroupParams());

      // computeFreePeriods should be called for creator + friend-2 only (not friend-1)
      // creator-1 and friend-2 = 2 calls
      expect(computeFreePeriods).toHaveBeenCalledTimes(2);
    });
  });
});
