import { describe, expect, it } from 'vitest';
import { createFpsCounter, fpsFromFrames, isDebug } from '../../src/ui/fpsCalc';

describe('isDebug', () => {
  it('detects the debug param', () => {
    expect(isDebug('?debug')).toBe(true);
    expect(isDebug('?a=1&debug=1')).toBe(true);
  });

  it('is false otherwise', () => {
    expect(isDebug('')).toBe(false);
    expect(isDebug('?nodebug=1')).toBe(false);
  });
});

describe('fpsFromFrames', () => {
  it('converts frames over ms to fps', () => {
    expect(fpsFromFrames(30, 500)).toBe(60);
  });

  it('is 0 for an empty interval', () => {
    expect(fpsFromFrames(10, 0)).toBe(0);
    expect(fpsFromFrames(0, 500)).toBe(0);
  });
});

describe('createFpsCounter', () => {
  it('emits one smoothed value per window', () => {
    const tick = createFpsCounter(500);
    const out: (number | null)[] = [];
    for (let t = 0; t <= 1000; t += 20) out.push(tick(t));
    const values = out.filter((v): v is number => v !== null);
    expect(values.length).toBe(2);
    for (const v of values) expect(v).toBe(50);
  });

  it('returns null before the window elapses', () => {
    const tick = createFpsCounter(500);
    expect(tick(0)).toBeNull();
    expect(tick(16)).toBeNull();
  });
});
