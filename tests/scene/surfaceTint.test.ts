import { describe, expect, it } from 'vitest';
import { surfaceTint, tintKey } from '../../src/scene/surfaceTint';

const t = (uDay: number, uNight: number, uLight: number) => surfaceTint({ uDay, uNight, uLight });

describe('surfaceTint', () => {
  it('is full brightness in daylight', () => {
    expect(t(1, 0, 0).brightness).toBeCloseTo(1);
  });
  it('is dimmer at night with the lamp off than by day', () => {
    expect(t(0, 1, 0).brightness).toBeLessThan(t(1, 0, 0).brightness);
  });
  it('the lamp brightens a night scene and warms it', () => {
    expect(t(0, 1, 1).brightness).toBeGreaterThan(t(0, 1, 0).brightness);
    expect(t(0, 1, 1).warmth).toBeGreaterThan(t(0, 1, 0).warmth);
  });
  it('is monotonic in each input', () => {
    for (const [a, b] of [
      [0, 0.5],
      [0.5, 1],
    ]) {
      expect(t(a, 0, 0).brightness).toBeLessThanOrEqual(t(b, 0, 0).brightness);
      expect(t(0, a, 0).brightness).toBeLessThanOrEqual(t(0, b, 0).brightness);
      expect(t(0, 0, a).brightness).toBeLessThanOrEqual(t(0, 0, b).brightness);
      expect(t(0, 0, a).warmth).toBeLessThanOrEqual(t(0, 0, b).warmth);
    }
  });
  it('stays clamped for out-of-range inputs', () => {
    for (const v of [t(5, 5, 5), t(-3, -3, -3)]) {
      expect(v.brightness).toBeGreaterThan(0);
      expect(v.brightness).toBeLessThanOrEqual(1);
      expect(v.warmth).toBeGreaterThanOrEqual(0);
      expect(v.warmth).toBeLessThanOrEqual(1);
    }
  });
  it('tintKey is equal for imperceptibly different tints', () => {
    expect(tintKey(t(1, 0, 0))).toBe(tintKey(t(1, 0.0001, 0)));
    expect(tintKey(t(1, 0, 0))).not.toBe(tintKey(t(0, 1, 0)));
  });
});
