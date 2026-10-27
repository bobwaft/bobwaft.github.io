import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Quaternion, Vector3, Euler } from 'three';
import {
  applyLook,
  centreInput,
  damp,
  dragInput,
  isTap,
  TAP_THRESHOLD_PX,
  leftWindow,
  lookSettings,
  DAMPING,
  IDLE_RANGE,
  targetFromInput,
} from '../../src/camera/lookControls';

const deg = (d: number) => (d * Math.PI) / 180;

describe('targetFromInput', () => {
  it('is zero at centre', () => {
    const t = targetFromInput(0, 0, IDLE_RANGE);
    expect(t.yaw).toBeCloseTo(0);
    expect(t.pitch).toBeCloseTo(0);
  });

  it('cursor right turns right (negative yaw), cursor up looks up', () => {
    const t = targetFromInput(1, 1, IDLE_RANGE);
    expect(t.yaw).toBeCloseTo(-deg(25));
    expect(t.pitch).toBeCloseTo(deg(12));
  });

  it('clamps out-of-range input', () => {
    const t = targetFromInput(5, -9, IDLE_RANGE);
    expect(t.yaw).toBeCloseTo(-deg(25));
    expect(t.pitch).toBeCloseTo(-deg(12));
  });
});

describe('damp', () => {
  it('is frame-rate independent', () => {
    const once = damp(1, 0, 4, 0.1);
    let v = 1;
    for (let i = 0; i < 10; i++) v = damp(v, 0, 4, 0.01);
    expect(once).toBeCloseTo(v, 10);
  });

  it('leaves current unchanged for dt <= 0', () => {
    expect(damp(0.7, 0, 4, 0)).toBe(0.7);
    expect(damp(0.7, 0, 4, -1)).toBe(0.7);
  });

  it('converges toward target', () => {
    expect(damp(0, 1, 4, 100)).toBeCloseTo(1);
  });
});

describe('applyLook', () => {
  it('copies base position and adds yaw/pitch to the base orientation', () => {
    const camera = new PerspectiveCamera();
    const base = {
      position: new Vector3(0, 1.18, 0),
      quaternion: new Quaternion().setFromEuler(new Euler(-0.2, 0, 0, 'YXZ')),
    };
    applyLook(camera, base, 0.3, 0.1);
    expect(camera.position.toArray()).toEqual([0, 1.18, 0]);
    const e = new Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    expect(e.y).toBeCloseTo(0.3);
    expect(e.x).toBeCloseTo(-0.1);
  });
});

describe('return to centre', () => {
  it('centreInput is the neutral input', () => {
    expect(centreInput()).toEqual({ x: 0, y: 0 });
  });

  it('leftWindow is true only when mouseout has no relatedTarget', () => {
    expect(leftWindow(null)).toBe(true);
    expect(leftWindow({} as EventTarget)).toBe(false);
  });
});

describe('isTap', () => {
  it('threshold is 10 px', () => {
    expect(TAP_THRESHOLD_PX).toBe(10);
  });

  it('9.9 px is a tap, 10 px is a drag', () => {
    expect(isTap(9.9, 0)).toBe(true);
    expect(isTap(0, -9.9)).toBe(true);
    expect(isTap(10, 0)).toBe(false);
  });

  it('uses the diagonal distance', () => {
    expect(isTap(7, 7)).toBe(true); // 9.899
    expect(isTap(7.1, 7.1)).toBe(false); // 10.04
  });

  it('accepts a custom threshold', () => {
    expect(isTap(5, 0, 4)).toBe(false);
  });
});

describe('dragInput', () => {
  it('drag right moves input left, drag down moves input up', () => {
    const r = dragInput({ x: 0, y: 0 }, 100, 50, 400, 200);
    expect(r.x).toBeCloseTo(-0.5);
    expect(r.y).toBeCloseTo(0.5);
  });

  it('offsets from the start input', () => {
    const r = dragInput({ x: 0.5, y: -0.5 }, -100, 0, 400, 200);
    expect(r.x).toBeCloseTo(1);
    expect(r.y).toBeCloseTo(-0.5);
  });

  it('clamps at the edges', () => {
    expect(dragInput({ x: 0.9, y: 0.9 }, -1000, 1000, 400, 200)).toEqual({ x: 1, y: 1 });
    expect(dragInput({ x: -0.9, y: -0.9 }, 1000, -1000, 400, 200)).toEqual({ x: -1, y: -1 });
  });
});

describe('lookSettings', () => {
  it('normal motion uses the full range and 0.8 s tween', () => {
    expect(lookSettings(false)).toEqual({
      range: IDLE_RANGE,
      damping: DAMPING,
      poseTweenSeconds: 0.8,
    });
  });

  it('reduced motion scales the range by 0.4 and cuts instantly', () => {
    const s = lookSettings(true);
    expect(s.range.yaw).toBeCloseTo(IDLE_RANGE.yaw * 0.4);
    expect(s.range.pitch).toBeCloseTo(IDLE_RANGE.pitch * 0.4);
    expect(s.poseTweenSeconds).toBe(0);
  });

  it('reduced motion damps faster (less smoothing lag)', () => {
    expect(lookSettings(true).damping).toBeGreaterThan(DAMPING);
  });
});
