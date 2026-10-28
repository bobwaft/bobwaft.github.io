import { describe, expect, it } from 'vitest';
import { timeFromClock } from '../../src/scene/timeOfDay';

const at = (h: number, m = 0) => new Date(2026, 9, 28, h, m, 0);

describe('timeFromClock', () => {
  it('maps noon to 0, midnight to 0.5, 18:00 to 0.25, 06:00 to 0.75', () => {
    expect(timeFromClock(at(12))).toBeCloseTo(0, 6);
    expect(timeFromClock(at(0))).toBeCloseTo(0.5, 6);
    expect(timeFromClock(at(18))).toBeCloseTo(0.25, 6);
    expect(timeFromClock(at(6))).toBeCloseTo(0.75, 6);
  });
  it('is linear in minutes and stays in [0,1)', () => {
    expect(timeFromClock(at(13, 12))).toBeCloseTo(0.05, 6);
    expect(timeFromClock(at(23, 59))).toBeLessThan(1);
    expect(timeFromClock(at(11, 59))).toBeGreaterThan(0.9);
  });
});
