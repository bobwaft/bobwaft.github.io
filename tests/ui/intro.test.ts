import { describe, expect, it } from 'vitest';
import { INTRO_SECONDS, INTRO_START_PITCH, REDUCED_SECONDS, introFrame } from '../../src/ui/intro';

describe('introFrame (eyes open, then the camera pans up)', () => {
  it('starts with the lids shut, a heavy blur and the camera looking down', () => {
    const f = introFrame(0, false);
    expect(f.lidOpen).toBe(0);
    expect(f.blurPx).toBeGreaterThan(8);
    expect(f.pitch).toBe(INTRO_START_PITCH);
    expect(INTRO_START_PITCH).toBeLessThan(0); // negative pitch looks down
    expect(f.done).toBe(false);
  });

  it('ends fully open, sharp and level, and is done', () => {
    const f = introFrame(INTRO_SECONDS, false);
    expect(f).toMatchObject({ lidOpen: 1, blurPx: 0, pitch: 0, veil: 1, done: true });
  });

  it('opens the lids, sharpens and tilts up monotonically', () => {
    let prev = introFrame(0, false);
    for (let t = 0.05; t <= INTRO_SECONDS; t += 0.05) {
      const f = introFrame(t, false);
      expect(f.lidOpen).toBeGreaterThanOrEqual(prev.lidOpen);
      expect(f.blurPx).toBeLessThanOrEqual(prev.blurPx);
      expect(f.pitch).toBeGreaterThanOrEqual(prev.pitch);
      prev = f;
    }
  });

  it('opens the eyes before the camera pans (the pan starts once the lids are mostly open)', () => {
    const mid = introFrame(1.0, false);
    expect(mid.lidOpen).toBeGreaterThan(0.5);
    expect(mid.pitch).toBe(INTRO_START_PITCH);
  });

  it('clamps times outside the timeline', () => {
    expect(introFrame(-1, false)).toEqual(introFrame(0, false));
    expect(introFrame(99, false)).toEqual(introFrame(INTRO_SECONDS, false));
  });

  it('reduced motion: a plain quick fade, no lids, blur or camera move', () => {
    const start = introFrame(0, true);
    expect(start).toMatchObject({ lidOpen: 0, blurPx: 0, pitch: 0, veil: 1, done: false });
    const mid = introFrame(REDUCED_SECONDS / 2, true);
    expect(mid.veil).toBeGreaterThan(0);
    expect(mid.veil).toBeLessThan(1);
    expect(mid.pitch).toBe(0);
    expect(introFrame(REDUCED_SECONDS, true)).toMatchObject({ veil: 0, done: true });
    expect(REDUCED_SECONDS).toBeLessThan(INTRO_SECONDS);
  });
});
