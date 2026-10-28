// Frame of a flat, rectangular content surface (the laptop screen): where it is, which way is
// right/up, and how big it is. Drives the CSS3D placement and the preview texture's UVs (A-4).
import { Box3, Matrix3, Matrix4, Quaternion, Vector2, Vector3 } from 'three';
import { planeNormal } from '../camera/focusPose';

export interface ScreenFrame {
  center: Vector3;
  right: Vector3;
  up: Vector3;
  /** Faces the viewer. */
  normal: Vector3;
  width: number;
  height: number;
}

/** Axes from world up projected onto the plane; right = up x normal, as for a CSS3D element. */
export function screenFrame(points: readonly Vector3[], toward: Vector3): ScreenFrame {
  const normal = planeNormal(points, toward);
  const up = new Vector3(0, 1, 0).addScaledVector(normal, -normal.y).normalize();
  const right = new Vector3().crossVectors(up, normal).normalize();
  const c = new Box3().setFromPoints([...points]).getCenter(new Vector3());
  const range = (axis: Vector3) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of points) {
      const d = p.clone().sub(c).dot(axis);
      lo = Math.min(lo, d);
      hi = Math.max(hi, d);
    }
    return { lo, hi };
  };
  const r = range(right);
  const u = range(up);
  const center = c
    .clone()
    .addScaledVector(right, (r.lo + r.hi) / 2)
    .addScaledVector(up, (u.lo + u.hi) / 2);
  return { center, right, up, normal, width: r.hi - r.lo, height: u.hi - u.lo };
}

export interface CssPlacement {
  position: Vector3;
  quaternion: Quaternion;
  /** World units per CSS pixel. */
  scale: number;
  pxHeight: number;
}

/** Pose for a CSS3DObject whose element is pxWidth CSS pixels wide, covering the frame. */
export function cssPlacement(frame: ScreenFrame, pxWidth: number): CssPlacement {
  const basis = new Matrix4().makeBasis(frame.right, frame.up, frame.normal);
  return {
    position: frame.center.clone().addScaledVector(frame.normal, 0.0005),
    quaternion: new Quaternion().setFromRotationMatrix(basis),
    scale: frame.width / pxWidth,
    pxHeight: (pxWidth * frame.height) / frame.width,
  };
}

/**
 * Affine UV matrix (for Texture.matrix) mapping the mesh's UVs to image coordinates, with
 * x along frame.right and y along frame.up (0..1). Makes the preview upright whatever the
 * exported UV layout. Least-squares fit over all vertices.
 */
export function uvTransform(
  points: readonly Vector3[],
  uvs: readonly Vector2[],
  frame: ScreenFrame,
): Matrix3 {
  // Normal equations: [u v 1]^T [u v 1] * coeffs = [u v 1]^T target, per output axis.
  const ata = new Matrix3().set(0, 0, 0, 0, 0, 0, 0, 0, 0);
  const atx = new Vector3();
  const aty = new Vector3();
  const a = ata.elements; // column-major, but symmetric
  points.forEach((p, i) => {
    const row = [uvs[i].x, uvs[i].y, 1];
    const d = p.clone().sub(frame.center);
    const x = d.dot(frame.right) / frame.width + 0.5;
    const y = d.dot(frame.up) / frame.height + 0.5;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) a[c * 3 + r] += row[r] * row[c];
    }
    atx.add(new Vector3(...row).multiplyScalar(x));
    aty.add(new Vector3(...row).multiplyScalar(y));
  });
  const inv = ata.clone().invert();
  const cx = atx.applyMatrix3(inv);
  const cy = aty.applyMatrix3(inv);
  return new Matrix3().set(cx.x, cx.y, cx.z, cy.x, cy.y, cy.z, 0, 0, 1);
}

/**
 * World matrix of a camera moved into the surface's frame, so the CSS3D element can sit at the
 * origin facing +Z. Seen through it, the element lands where the real camera sees the surface.
 * Keeps the CSS camera from looking edge-on at its own plane (top-down views; BUG-003).
 */
export function surfaceCameraMatrix(
  placement: Pick<CssPlacement, 'position' | 'quaternion'>,
  cameraWorld: Matrix4,
): Matrix4 {
  return new Matrix4()
    .compose(placement.position, placement.quaternion, new Vector3(1, 1, 1))
    .invert()
    .multiply(cameraWorld);
}
