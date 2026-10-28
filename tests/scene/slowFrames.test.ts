import { describe, expect, it } from 'vitest';
import {
  busyWait,
  DEFAULT_SLOW_MS,
  MAX_SLOW_MS,
  MIN_SLOW_MS,
  slowFrameMs,
} from '../../src/scene/slowFrames';

describe('slowFrameMs', () => {
  it('is null when ?slow is absent', () => {
    expect(slowFrameMs('')).toBeNull();
    expect(slowFrameMs('?debug&dpr=1')).toBeNull();
  });
  it('defaults for bare or invalid ?slow', () => {
    expect(slowFrameMs('?slow')).toBe(DEFAULT_SLOW_MS);
    expect(slowFrameMs('?slow=')).toBe(DEFAULT_SLOW_MS);
    expect(slowFrameMs('?slow=abc')).toBe(DEFAULT_SLOW_MS);
  });
  it('reads ?slow=<ms> and clamps it', () => {
    expect(slowFrameMs('?debug&slow=120')).toBe(120);
    expect(slowFrameMs('?slow=0')).toBe(MIN_SLOW_MS);
    expect(slowFrameMs('?slow=-5')).toBe(MIN_SLOW_MS);
    expect(slowFrameMs('?slow=99999')).toBe(MAX_SLOW_MS);
  });
});

describe('busyWait', () => {
  it('blocks for at least the given time', () => {
    const t = performance.now();
    busyWait(20);
    expect(performance.now() - t).toBeGreaterThanOrEqual(19);
  });
});
