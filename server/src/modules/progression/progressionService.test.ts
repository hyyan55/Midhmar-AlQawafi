import { describe, expect, it } from 'vitest';
import { computeNextStreak, normalizeLastPlayedDate } from './progressionService.ts';

describe('normalizeLastPlayedDate', () => {
  it('keeps ISO calendar-date strings unchanged', () => {
    expect(normalizeLastPlayedDate('2026-11-21')).toBe('2026-11-21');
  });

  it('normalizes PostgreSQL Date values using their local calendar components', () => {
    const pgDate = new Date(2026, 10, 21);
    expect(normalizeLastPlayedDate(pgDate)).toBe('2026-11-21');
  });

  it('returns null for missing or invalid dates', () => {
    expect(normalizeLastPlayedDate(null)).toBeNull();
    expect(normalizeLastPlayedDate(new Date(Number.NaN))).toBeNull();
    expect(normalizeLastPlayedDate('not-a-date')).toBeNull();
  });
});

describe('computeNextStreak', () => {
  it('continues a streak when PostgreSQL supplies a Date object for yesterday', () => {
    const yesterday = new Date(2026, 10, 21);
    expect(computeNextStreak(yesterday, 4, 7, '2026-11-22')).toEqual({
      currentStreak: 5,
      longestStreak: 7,
    });
  });

  it('keeps the current streak when the last play was today', () => {
    expect(computeNextStreak(new Date(2026, 10, 22), 4, 7, '2026-11-22')).toEqual({
      currentStreak: 4,
      longestStreak: 7,
    });
  });

  it('starts a new streak instead of throwing for an invalid stored date', () => {
    expect(computeNextStreak(new Date(Number.NaN), 4, 7, '2026-11-22')).toEqual({
      currentStreak: 1,
      longestStreak: 7,
    });
  });
});
