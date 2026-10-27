import { describe, expect, it } from 'vitest';
import { Euler } from 'three';
import {
  idlePoseKind,
  PORTRAIT_ASPECT,
  PORTRAIT_IDLE_POSE,
  poseFromLookAt,
} from '../../src/camera/poses';

describe('idlePoseKind', () => {
  it('is portrait below aspect 1, landscape otherwise', () => {
    expect(PORTRAIT_ASPECT).toBe(1);
    expect(idlePoseKind(0.56)).toBe('portrait');
    expect(idlePoseKind(0.999)).toBe('portrait');
    expect(idlePoseKind(1)).toBe('landscape');
    expect(idlePoseKind(1.78)).toBe('landscape');
  });
});

describe('poseFromLookAt', () => {
  it('looking down -Z gives identity orientation', () => {
    const p = poseFromLookAt([0, 0, 0], [0, 0, -1]);
    expect(p.position.toArray()).toEqual([0, 0, 0]);
    const q = p.quaternion;
    expect(q.x).toBeCloseTo(0);
    expect(q.y).toBeCloseTo(0);
    expect(q.z).toBeCloseTo(0);
    expect(q.w).toBeCloseTo(1);
  });

  it('looking down and forward pitches with negative x rotation', () => {
    const p = poseFromLookAt([0, 1, 0], [0, 0, -1]);
    const e = new Euler().setFromQuaternion(p.quaternion, 'YXZ');
    expect(e.x).toBeCloseTo(-Math.PI / 4);
    expect(e.y).toBeCloseTo(0);
  });

  it('portrait pose looks down and forward', () => {
    const p = poseFromLookAt(PORTRAIT_IDLE_POSE.position, PORTRAIT_IDLE_POSE.target);
    const e = new Euler().setFromQuaternion(p.quaternion, 'YXZ');
    expect(e.x).toBeLessThan(0);
  });
});
