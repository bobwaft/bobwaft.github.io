import { describe, expect, it } from 'vitest';
import {
  DAY,
  DUSK,
  NIGHT,
  createTimeOfDay,
  dayValue,
  nextPreset,
  timeFromClock,
} from '../../src/scene/timeOfDay';

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

describe('presets', () => {
  it('give day ~1, a mixed dusk, night ~0', () => {
    expect(dayValue(DAY)).toBeGreaterThan(0.99);
    expect(dayValue(DUSK)).toBeGreaterThan(0.3);
    expect(dayValue(DUSK)).toBeLessThan(0.7);
    expect(dayValue(NIGHT)).toBeLessThan(0.01);
  });
});

describe('nextPreset', () => {
  it('cycles day -> dusk -> night -> day', () => {
    expect(nextPreset(DAY)).toBe(DUSK);
    expect(nextPreset(DUSK)).toBe(NIGHT);
    expect(nextPreset(NIGHT)).toBe(DAY);
  });
  it('classifies an arbitrary clock time by its day value first', () => {
    expect(nextPreset(timeFromClock(at(12, 30)))).toBe(DUSK); // bright afternoon = day
    expect(nextPreset(timeFromClock(at(18)))).toBe(NIGHT); // dusk
    expect(nextPreset(timeFromClock(at(2)))).toBe(DAY); // deep night
    expect(nextPreset(timeFromClock(at(6)))).toBe(NIGHT); // morning dusk
  });
});

function make(initial: number, seconds = 1.2) {
  const applied: number[] = [];
  const c = createTimeOfDay({ initial, apply: (t) => applied.push(t), durationS: () => seconds });
  return { c, applied };
}

describe('createTimeOfDay', () => {
  it('applies the initial value immediately', () => {
    const { applied } = make(0.3);
    expect(applied).toEqual([0.3]);
  });
  it('tweens to the next preset and ends exactly on it', () => {
    const { c, applied } = make(DAY);
    c.cycle();
    c.update(0.9);
    const mid = dayValue(applied[applied.length - 1]);
    expect(mid).toBeGreaterThan(dayValue(DUSK) - 0.2);
    expect(mid).toBeLessThan(1);
    c.update(1);
    expect(dayValue(applied[applied.length - 1])).toBeCloseTo(dayValue(DUSK), 9);
    expect(c.target).toBe(DUSK);
  });
  it('is instant with a zero duration', () => {
    const { c, applied } = make(DAY, 0);
    c.cycle();
    c.update(0);
    expect(dayValue(applied[applied.length - 1])).toBeCloseTo(dayValue(DUSK), 9);
  });
  it('goes night -> day without flicker through the wraparound', () => {
    const { c, applied } = make(NIGHT);
    c.cycle();
    for (let i = 0; i < 200; i++) c.update(0.01);
    const days = applied.map(dayValue);
    for (let i = 1; i < days.length; i++) {
      expect(Math.abs(days[i] - days[i - 1])).toBeLessThan(0.15);
    }
    // monotonic rise: no dip back through night
    for (let i = 1; i < days.length; i++)
      expect(days[i]).toBeGreaterThanOrEqual(days[i - 1] - 1e-9);
    expect(days[days.length - 1]).toBeGreaterThan(0.99);
  });
  it('a click mid-tween advances from the target, not the current value', () => {
    const { c } = make(DAY);
    c.cycle();
    c.update(0.3);
    c.cycle();
    expect(c.target).toBe(NIGHT);
  });
});
