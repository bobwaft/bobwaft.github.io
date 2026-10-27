import { describe, expect, it } from 'vitest';
import { isReady, monotonicProgress, progressFraction } from '../../src/ui/loadingProgress';

describe('progressFraction', () => {
  it('is loaded/total', () => {
    expect(progressFraction(1, 4)).toBe(0.25);
    expect(progressFraction(4, 4)).toBe(1);
  });

  it('is 0 for 0/0', () => {
    expect(progressFraction(0, 0)).toBe(0);
  });

  it('is clamped to 1', () => {
    expect(progressFraction(5, 4)).toBe(1);
  });
});

describe('monotonicProgress', () => {
  it('advances when progress increases', () => {
    expect(monotonicProgress(0.2, 3, 4)).toBe(0.75);
  });

  it('does not decrease when the total grows', () => {
    // 2/2 = 1.0 shown, then 10 lightmaps are queued: 2/12
    const shown = monotonicProgress(0, 2, 2);
    expect(monotonicProgress(shown, 2, 12)).toBe(1);
  });

  it('keeps the previous value on 0/0', () => {
    expect(monotonicProgress(0.5, 0, 0)).toBe(0.5);
    expect(monotonicProgress(0, 0, 0)).toBe(0);
  });
});

describe('isReady', () => {
  it('needs the scene resolved and nothing pending', () => {
    expect(isReady(true, 12, 12)).toBe(true);
    expect(isReady(false, 12, 12)).toBe(false);
    expect(isReady(true, 2, 12)).toBe(false);
  });

  it('is not ready with nothing queued', () => {
    expect(isReady(true, 0, 0)).toBe(false);
  });
});
