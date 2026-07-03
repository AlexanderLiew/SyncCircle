import { describe, it, expect } from 'vitest';
import {
  mergeBusyPeriods,
  computeFreePeriods,
  intersectFreePeriods,
} from '../../src/services/availability-calculator.js';
import type {
  TimeSlot,
  AvailabilityInput,
  FreePeriod,
  TimetableClass,
  CalendarEvent,
} from '../../src/types/ai-planner.types.js';

// ─── Helper Factories ────────────────────────────────────────────────────────

function makeClass(overrides: Partial<TimetableClass> = {}): TimetableClass {
  return {
    id: 'cls-1',
    title: 'CS101',
    moduleCode: 'CS101',
    location: 'Room A',
    dayOfWeek: 0, // Monday
    startTime: '09:00',
    endTime: '10:00',
    color: '#fff',
    source: 'manual',
    ...overrides,
  };
}

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    userId: 'user-1',
    startDateTime: '2025-01-06T14:00:00.000Z',
    endDateTime: '2025-01-06T15:00:00.000Z',
    eventId: 'evt-1',
    title: 'Meeting',
    durationMinutes: 60,
    participantUserIds: [],
    status: 'active',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeInput(overrides: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return {
    timetableClasses: [],
    calendarEvents: [],
    dateRangeStart: '2025-01-06', // Monday
    dateRangeEnd: '2025-01-06',
    timezone: 'UTC',
    availableHoursStart: '08:00',
    availableHoursEnd: '23:00',
    ...overrides,
  };
}

// ─── mergeBusyPeriods ────────────────────────────────────────────────────────

describe('mergeBusyPeriods', () => {
  it('returns empty array for empty input', () => {
    expect(mergeBusyPeriods([])).toEqual([]);
  });

  it('returns single slot unchanged', () => {
    const slots: TimeSlot[] = [
      { start: '2025-01-06T09:00:00.000Z', end: '2025-01-06T10:00:00.000Z' },
    ];
    expect(mergeBusyPeriods(slots)).toEqual(slots);
  });

  it('merges overlapping slots', () => {
    const slots: TimeSlot[] = [
      { start: '2025-01-06T09:00:00.000Z', end: '2025-01-06T10:30:00.000Z' },
      { start: '2025-01-06T10:00:00.000Z', end: '2025-01-06T11:00:00.000Z' },
    ];
    const result = mergeBusyPeriods(slots);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      start: '2025-01-06T09:00:00.000Z',
      end: '2025-01-06T11:00:00.000Z',
    });
  });

  it('merges adjacent slots (end equals start)', () => {
    const slots: TimeSlot[] = [
      { start: '2025-01-06T09:00:00.000Z', end: '2025-01-06T10:00:00.000Z' },
      { start: '2025-01-06T10:00:00.000Z', end: '2025-01-06T11:00:00.000Z' },
    ];
    const result = mergeBusyPeriods(slots);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      start: '2025-01-06T09:00:00.000Z',
      end: '2025-01-06T11:00:00.000Z',
    });
  });

  it('does not merge non-overlapping slots', () => {
    const slots: TimeSlot[] = [
      { start: '2025-01-06T09:00:00.000Z', end: '2025-01-06T10:00:00.000Z' },
      { start: '2025-01-06T11:00:00.000Z', end: '2025-01-06T12:00:00.000Z' },
    ];
    const result = mergeBusyPeriods(slots);
    expect(result).toHaveLength(2);
  });

  it('handles unsorted input', () => {
    const slots: TimeSlot[] = [
      { start: '2025-01-06T14:00:00.000Z', end: '2025-01-06T15:00:00.000Z' },
      { start: '2025-01-06T09:00:00.000Z', end: '2025-01-06T10:00:00.000Z' },
      { start: '2025-01-06T09:30:00.000Z', end: '2025-01-06T11:00:00.000Z' },
    ];
    const result = mergeBusyPeriods(slots);
    expect(result).toHaveLength(2);
    expect(result[0]!.end).toBe('2025-01-06T11:00:00.000Z');
    expect(result[1]!.start).toBe('2025-01-06T14:00:00.000Z');
  });

  it('merges multiple overlapping slots into one', () => {
    const slots: TimeSlot[] = [
      { start: '2025-01-06T09:00:00.000Z', end: '2025-01-06T10:00:00.000Z' },
      { start: '2025-01-06T09:30:00.000Z', end: '2025-01-06T11:00:00.000Z' },
      { start: '2025-01-06T10:45:00.000Z', end: '2025-01-06T12:00:00.000Z' },
    ];
    const result = mergeBusyPeriods(slots);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      start: '2025-01-06T09:00:00.000Z',
      end: '2025-01-06T12:00:00.000Z',
    });
  });
});

// ─── computeFreePeriods ──────────────────────────────────────────────────────

describe('computeFreePeriods', () => {
  it('returns full day as free when no busy periods exist', () => {
    const input = makeInput();
    const result = computeFreePeriods(input, 30);
    expect(result).toHaveLength(1);
    expect(result[0]!.durationMinutes).toBe(15 * 60); // 08:00 to 23:00 = 900 min
  });

  it('subtracts a timetable class from the available window', () => {
    const input = makeInput({
      timetableClasses: [makeClass({ dayOfWeek: 0, startTime: '09:00', endTime: '10:00' })],
    });
    const result = computeFreePeriods(input, 30);
    // Expect two free periods: 08:00-09:00 and 10:00-23:00
    expect(result).toHaveLength(2);
    expect(result[0]!.durationMinutes).toBe(60); // 08:00-09:00
    expect(result[1]!.durationMinutes).toBe(13 * 60); // 10:00-23:00
  });

  it('filters out free periods shorter than minimum duration', () => {
    const input = makeInput({
      timetableClasses: [
        makeClass({ dayOfWeek: 0, startTime: '08:10', endTime: '09:00' }),
      ],
    });
    // Free period 08:00-08:10 = 10 minutes, should be filtered with minDuration=30
    const result = computeFreePeriods(input, 30);
    // Only 09:00-23:00 should remain
    expect(result).toHaveLength(1);
    expect(result[0]!.start).toContain('09:00');
  });

  it('maps timetable classes to correct days by dayOfWeek', () => {
    // 2025-01-06 is Monday (dayOfWeek=0), 2025-01-07 is Tuesday (dayOfWeek=1)
    const input = makeInput({
      dateRangeStart: '2025-01-06',
      dateRangeEnd: '2025-01-07',
      timetableClasses: [
        makeClass({ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }), // Tuesday only
      ],
    });
    const result = computeFreePeriods(input, 30);
    // Monday should be fully free (1 period), Tuesday has class (2 periods)
    expect(result).toHaveLength(3);
  });

  it('excludes cancelled calendar events', () => {
    const input = makeInput({
      calendarEvents: [
        makeEvent({
          startDateTime: '2025-01-06T14:00:00.000Z',
          endDateTime: '2025-01-06T15:00:00.000Z',
          status: 'cancelled',
        }),
      ],
    });
    const result = computeFreePeriods(input, 30);
    // Should be fully free since event is cancelled
    expect(result).toHaveLength(1);
    expect(result[0]!.durationMinutes).toBe(900);
  });

  it('handles multiple days in date range', () => {
    // Mon-Fri range with no classes
    const input = makeInput({
      dateRangeStart: '2025-01-06',
      dateRangeEnd: '2025-01-10',
    });
    const result = computeFreePeriods(input, 30);
    expect(result).toHaveLength(5); // One free period per day
  });

  it('skips weekends for timetable class mapping but still provides availability', () => {
    // 2025-01-11 is Saturday, 2025-01-12 is Sunday
    const input = makeInput({
      dateRangeStart: '2025-01-11',
      dateRangeEnd: '2025-01-12',
      timetableClasses: [
        makeClass({ dayOfWeek: 0, startTime: '09:00', endTime: '10:00' }), // Monday
      ],
    });
    const result = computeFreePeriods(input, 30);
    // Both days should be fully free (no classes match weekends)
    expect(result).toHaveLength(2);
  });

  it('handles overlapping class and event on same day', () => {
    const input = makeInput({
      timetableClasses: [makeClass({ dayOfWeek: 0, startTime: '09:00', endTime: '10:30' })],
      calendarEvents: [
        makeEvent({
          startDateTime: '2025-01-06T10:00:00.000Z',
          endDateTime: '2025-01-06T11:00:00.000Z',
        }),
      ],
    });
    const result = computeFreePeriods(input, 30);
    // Busy: 09:00-11:00 (merged). Free: 08:00-09:00, 11:00-23:00
    expect(result).toHaveLength(2);
  });
});

// ─── intersectFreePeriods ────────────────────────────────────────────────────

describe('intersectFreePeriods', () => {
  it('returns empty array when input is empty', () => {
    expect(intersectFreePeriods([])).toEqual([]);
  });

  it('returns single user periods filtered by min duration', () => {
    const periods: FreePeriod[][] = [
      [
        { start: '2025-01-06T09:00:00.000Z', end: '2025-01-06T12:00:00.000Z', durationMinutes: 180 },
        { start: '2025-01-06T14:00:00.000Z', end: '2025-01-06T14:10:00.000Z', durationMinutes: 10 },
      ],
    ];
    const result = intersectFreePeriods(periods, 30);
    expect(result).toHaveLength(1);
    expect(result[0]!.durationMinutes).toBe(180);
  });

  it('computes intersection of two users with overlapping free time', () => {
    const periods: FreePeriod[][] = [
      [{ start: '2025-01-06T09:00:00.000Z', end: '2025-01-06T12:00:00.000Z', durationMinutes: 180 }],
      [{ start: '2025-01-06T10:00:00.000Z', end: '2025-01-06T14:00:00.000Z', durationMinutes: 240 }],
    ];
    const result = intersectFreePeriods(periods, 30);
    expect(result).toHaveLength(1);
    expect(result[0]!.start).toBe('2025-01-06T10:00:00.000Z');
    expect(result[0]!.end).toBe('2025-01-06T12:00:00.000Z');
    expect(result[0]!.durationMinutes).toBe(120);
  });

  it('returns empty when no overlap exists', () => {
    const periods: FreePeriod[][] = [
      [{ start: '2025-01-06T09:00:00.000Z', end: '2025-01-06T10:00:00.000Z', durationMinutes: 60 }],
      [{ start: '2025-01-06T11:00:00.000Z', end: '2025-01-06T12:00:00.000Z', durationMinutes: 60 }],
    ];
    const result = intersectFreePeriods(periods, 30);
    expect(result).toHaveLength(0);
  });

  it('handles three users with partial overlap', () => {
    const periods: FreePeriod[][] = [
      [{ start: '2025-01-06T08:00:00.000Z', end: '2025-01-06T14:00:00.000Z', durationMinutes: 360 }],
      [{ start: '2025-01-06T10:00:00.000Z', end: '2025-01-06T16:00:00.000Z', durationMinutes: 360 }],
      [{ start: '2025-01-06T11:00:00.000Z', end: '2025-01-06T13:00:00.000Z', durationMinutes: 120 }],
    ];
    const result = intersectFreePeriods(periods, 30);
    expect(result).toHaveLength(1);
    expect(result[0]!.start).toBe('2025-01-06T11:00:00.000Z');
    expect(result[0]!.end).toBe('2025-01-06T13:00:00.000Z');
    expect(result[0]!.durationMinutes).toBe(120);
  });

  it('filters out short intersections', () => {
    const periods: FreePeriod[][] = [
      [{ start: '2025-01-06T09:00:00.000Z', end: '2025-01-06T09:50:00.000Z', durationMinutes: 50 }],
      [{ start: '2025-01-06T09:40:00.000Z', end: '2025-01-06T10:30:00.000Z', durationMinutes: 50 }],
    ];
    // Overlap: 09:40-09:50 = 10 min, below 30 min threshold
    const result = intersectFreePeriods(periods, 30);
    expect(result).toHaveLength(0);
  });

  it('handles multiple non-contiguous overlaps', () => {
    const periods: FreePeriod[][] = [
      [
        { start: '2025-01-06T09:00:00.000Z', end: '2025-01-06T11:00:00.000Z', durationMinutes: 120 },
        { start: '2025-01-06T14:00:00.000Z', end: '2025-01-06T16:00:00.000Z', durationMinutes: 120 },
      ],
      [
        { start: '2025-01-06T10:00:00.000Z', end: '2025-01-06T12:00:00.000Z', durationMinutes: 120 },
        { start: '2025-01-06T15:00:00.000Z', end: '2025-01-06T17:00:00.000Z', durationMinutes: 120 },
      ],
    ];
    const result = intersectFreePeriods(periods, 30);
    expect(result).toHaveLength(2);
    expect(result[0]!.start).toBe('2025-01-06T10:00:00.000Z');
    expect(result[0]!.end).toBe('2025-01-06T11:00:00.000Z');
    expect(result[1]!.start).toBe('2025-01-06T15:00:00.000Z');
    expect(result[1]!.end).toBe('2025-01-06T16:00:00.000Z');
  });
});
