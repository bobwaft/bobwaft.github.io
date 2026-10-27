import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Quaternion, Vector3, Euler } from 'three';
import {
  applyLook,
  centreInput,
  damp,
  leftWindow,
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
