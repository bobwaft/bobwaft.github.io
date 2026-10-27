import { describe, expect, it } from 'vitest';
import { createFpsCounter, formatPerfReadout, fpsFromFrames, isDebug } from '../../src/ui/fpsCalc';

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

describe('formatPerfReadout', () => {
  it('shows fps, pixel ratio, buffer size, draw calls, triangles and GPU', () => {
    expect(
      formatPerfReadout({
        fps: 23.6,
        pixelRatio: 2,
        width: 3840,
        height: 2160,
        calls: 142,
        triangles: 512345,
        gpu: 'ANGLE (Intel, Iris Xe)',
      }),
    ).toBe('24 fps · dpr 2 · 3840×2160 · 142 calls · 512k tris\nGPU: ANGLE (Intel, Iris Xe)');
  });

  it('omits the GPU line when unknown', () => {
    expect(
      formatPerfReadout({
        fps: 60,
        pixelRatio: 1.25,
        width: 1600,
        height: 900,
        calls: 10,
        triangles: 900,
        gpu: null,
      }),
    ).toBe('60 fps · dpr 1.25 · 1600×900 · 10 calls · 1k tris');
  });
});
