import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { createPoseTween, easeInOutCubic, interpolatePose } from '../../src/camera/focusTween';

const a = { position: new Vector3(0, 0, 0), quaternion: new Quaternion() };
const b = {
  position: new Vector3(2, 4, 6),
  quaternion: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2),
};
const fresh = () => ({ position: new Vector3(), quaternion: new Quaternion() });

describe('easeInOutCubic', () => {
  it('hits endpoints and midpoint', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
  });

  it('is slow at the ends', () => {
    expect(easeInOutCubic(0.1)).toBeLessThan(0.1);
    expect(easeInOutCubic(0.9)).toBeGreaterThan(0.9);
  });
});

describe('interpolatePose', () => {
  it('returns exact endpoints', () => {
    const out = fresh();
    interpolatePose(a, b, 0, out);
    expect(out.position.toArray()).toEqual([0, 0, 0]);
    interpolatePose(a, b, 1, out);
    expect(out.position.toArray()).toEqual([2, 4, 6]);
    expect(out.quaternion.angleTo(b.quaternion)).toBeCloseTo(0);
  });

  it('lerps position and slerps quaternion at the midpoint', () => {
    const out = fresh();
    interpolatePose(a, b, 0.5, out);
    expect(out.position.toArray()).toEqual([1, 2, 3]);
    expect(out.quaternion.angleTo(a.quaternion)).toBeCloseTo(Math.PI / 4);
  });

  it('clamps t to 0..1', () => {
    const out = fresh();
    interpolatePose(a, b, -3, out);
    expect(out.position.toArray()).toEqual([0, 0, 0]);
    interpolatePose(a, b, 7, out);
    expect(out.position.toArray()).toEqual([2, 4, 6]);
  });
});

describe('createPoseTween', () => {
  it('is inactive until started and holds the initial pose', () => {
    const tw = createPoseTween(a);
    expect(tw.active).toBe(false);
    expect(tw.step(0.1).position.toArray()).toEqual([0, 0, 0]);
  });

  it('runs to the target over the duration, then deactivates', () => {
    const tw = createPoseTween(a);
    tw.start(a, b, 1);
    expect(tw.active).toBe(true);
    expect(tw.step(0.5).position.x).toBeCloseTo(1);
    expect(tw.active).toBe(true);
    expect(tw.step(0.6).position.toArray()).toEqual([2, 4, 6]);
    expect(tw.active).toBe(false);
  });

  it('duration 0 cuts instantly', () => {
    const tw = createPoseTween(a);
    tw.start(a, b, 0);
    expect(tw.step(0).position.toArray()).toEqual([2, 4, 6]);
    expect(tw.active).toBe(false);
  });

  it('restarting begins from the given pose', () => {
    const tw = createPoseTween(a);
    tw.start(a, b, 1);
    tw.step(0.5);
    tw.start(tw.current, a, 1);
    expect(tw.step(0).position.x).toBeCloseTo(1);
  });
});
