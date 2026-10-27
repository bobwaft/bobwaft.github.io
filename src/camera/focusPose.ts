// Focus pose maths (D-3): where to put the camera so a content surface fits the viewport.
import {
  Box3,
  Matrix4,
  Quaternion,
  Vector3,
  type BufferAttribute,
  type Mesh,
  type Object3D,
} from 'three';
import type { Pose } from './focusTween';

export interface CameraBasis {
  right: Vector3;
  up: Vector3;
  forward: Vector3;
}

/** Camera axes for a view direction. The up hint is needed when looking along +-Y. */
export function cameraBasis(direction: Vector3, upHint?: Vector3): CameraBasis {
  const forward = direction.clone().normalize();
  let hint = (upHint ?? new Vector3(0, 1, 0)).clone().normalize();
  if (Math.abs(forward.dot(hint)) > 0.999) {
    // Degenerate: pick any axis that is not parallel to the view.
    hint = Math.abs(forward.z) < 0.9 ? new Vector3(0, 0, -1) : new Vector3(0, 1, 0);
  }
  const right = new Vector3().crossVectors(forward, hint).normalize();
  const up = new Vector3().crossVectors(right, forward).normalize();
  return { right, up, forward };
}

/** Camera distance so a width x height surface (facing the camera) fits, times margin. */
export function fitDistance(
  width: number,
  height: number,
  vfovRad: number,
  aspect: number,
  margin: number,
): number {
  const t = Math.tan(vfovRad / 2);
  return Math.max(height / 2 / t, width / 2 / (t * aspect)) * margin;
}

/** Extent of points along the camera right and up axes. */
export function projectedSize(
  points: readonly Vector3[],
  right: Vector3,
  up: Vector3,
): { width: number; height: number } {
  let minR = Infinity;
  let maxR = -Infinity;
  let minU = Infinity;
  let maxU = -Infinity;
  for (const p of points) {
    const r = p.dot(right);
    const u = p.dot(up);
    minR = Math.min(minR, r);
    maxR = Math.max(maxR, r);
    minU = Math.min(minU, u);
    maxU = Math.max(maxU, u);
  }
  return { width: maxR - minR, height: maxU - minU };
}

export interface FocusPoseInput {
  /** World-space points of the surface (e.g. mesh vertices). */
  points: readonly Vector3[];
  /** Direction the camera looks along. */
  viewDirection: Vector3;
  up?: Vector3;
  /** Vertical field of view in radians. */
  vfov: number;
  aspect: number;
  margin: number;
}

/** Camera pose looking at the surface bbox centre from the distance that fits it. */
export function computeFocusPose(input: FocusPoseInput): Pose {
  const { right, up, forward } = cameraBasis(input.viewDirection, input.up);
  const target = new Box3().setFromPoints([...input.points]).getCenter(new Vector3());
  const { width, height } = projectedSize(input.points, right, up);
  const distance = fitDistance(width, height, input.vfov, input.aspect, input.margin);
  const position = target.clone().addScaledVector(forward, -distance);
  const quaternion = new Quaternion().setFromRotationMatrix(
    new Matrix4().makeBasis(right, up, forward.clone().negate()),
  );
  return { position, quaternion };
}

/** World-space vertices of every mesh under obj. */
export function worldVertices(obj: Object3D): Vector3[] {
  obj.updateWorldMatrix(true, true);
  const out: Vector3[] = [];
  obj.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const pos = mesh.geometry.getAttribute('position') as BufferAttribute | undefined;
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) {
      out.push(new Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
    }
  });
  return out;
}

/**
 * Unit normal of a roughly flat vertex set (its smallest principal axis), flipped to face
 * `toward`. Used for the laptop screen, whose tilt is not known ahead of time.
 */
export function planeNormal(points: readonly Vector3[], toward: Vector3): Vector3 {
  const c = new Box3().setFromPoints([...points]).getCenter(new Vector3());
  let xx = 0;
  let xy = 0;
  let xz = 0;
  let yy = 0;
  let yz = 0;
  let zz = 0;
  for (const p of points) {
    const x = p.x - c.x;
    const y = p.y - c.y;
    const z = p.z - c.z;
    xx += x * x;
    xy += x * y;
    xz += x * z;
    yy += y * y;
    yz += y * z;
    zz += z * z;
  }
  const mul = (v: Vector3) =>
    new Vector3(
      xx * v.x + xy * v.y + xz * v.z,
      xy * v.x + yy * v.y + yz * v.z,
      xz * v.x + yz * v.y + zz * v.z,
    );
  // Power iteration for the two largest principal axes; the normal is perpendicular to both.
  const dominant = (start: Vector3, avoid?: Vector3) => {
    let v = start.clone().normalize();
    for (let i = 0; i < 64; i++) {
      v = mul(v);
      if (avoid) v.addScaledVector(avoid, -v.dot(avoid));
      if (v.lengthSq() === 0) break;
      v.normalize();
    }
    return v;
  };
  const v1 = dominant(new Vector3(1, 0.37, 0.21));
  const v2 = dominant(new Vector3(0.13, 1, 0.71), v1);
  const n = new Vector3().crossVectors(v1, v2).normalize();
  if (n.dot(new Vector3().subVectors(toward, c)) < 0) n.negate();
  return n;
}
