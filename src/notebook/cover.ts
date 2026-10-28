// Notebook cover (A-8): Notebook_Cover hinges on its local X axis at the spine and opens with
// rotateX(+angle). Its inside face (local y = face.y) is a page: under the closed cover it is
// the first page, swung open it is the cover's inside. Both pages' frames come from that one
// face, so the projects spread is placed from the cover's transform alone.
import { Matrix4, Vector3 } from 'three';
import { easeInOutCubic } from '../camera/focusTween';
import type { ScreenFrame } from '../scene/screenFrame';

const DEG = Math.PI / 180;
/** Open angle: 180 deg floats the cover above the desk (MEMORY.md). */
export const COVER_OPEN_ANGLE = 165 * DEG;
/** Duration of a full swing, open or closed. */
export const COVER_SECONDS = 0.8;

/** The cover's inside face in cover-local coordinates. */
export interface CoverFace {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
}

function faceCorners(base: Matrix4, face: CoverFace, angle: number): Vector3[] {
  const m = base.clone().multiply(new Matrix4().makeRotationX(angle));
  return [
    [face.minX, face.minZ],
    [face.maxX, face.minZ],
    [face.maxX, face.maxZ],
    [face.minX, face.maxZ],
  ].map(([x, z]) => new Vector3(x, face.y, z).applyMatrix4(m));
}

/**
 * Frame of the inside face with the cover opened by angle (0 = the page under the closed
 * cover). Faces up; up runs along the spine, away from the viewer, so the spread reads with
 * the spine vertical.
 * @param base the cover's world matrix when closed
 */
export function pageFrame(
  base: Matrix4,
  face: CoverFace,
  angle: number,
  viewer: Vector3,
): ScreenFrame {
  const m = base.clone().multiply(new Matrix4().makeRotationX(angle));
  const corners = faceCorners(base, face, angle);
  const [a, b, , d] = corners;
  const center = corners.reduce((s, p) => s.add(p), new Vector3()).divideScalar(4);
  const normal = new Vector3().setFromMatrixColumn(m, 1).normalize();
  if (normal.y < 0) normal.negate();
  const up = b.clone().sub(a).normalize();
  if (up.dot(center.clone().sub(viewer).setY(0)) < 0) up.negate();
  const right = new Vector3().crossVectors(up, normal).normalize();
  return { center, right, up, normal, width: d.distanceTo(a), height: b.distanceTo(a) };
}

export interface SpreadFrames {
  left: ScreenFrame;
  right: ScreenFrame;
  /** Camera up for the focus view. */
  up: Vector3;
  /** Both pages' corners, for framing the camera on the open spread. */
  points: Vector3[];
}

/** The two pages of the open notebook, sorted left/right as seen with `up` pointing up. */
export function spreadFrames(
  base: Matrix4,
  face: CoverFace,
  openAngle: number,
  viewer: Vector3,
): SpreadFrames {
  const first = pageFrame(base, face, 0, viewer);
  const inside = pageFrame(base, face, openAngle, viewer);
  const coverOnLeft = inside.center.dot(first.right) < first.center.dot(first.right);
  return {
    left: coverOnLeft ? inside : first,
    right: coverOnLeft ? first : inside,
    up: first.up.clone(),
    points: [...faceCorners(base, face, 0), ...faceCorners(base, face, openAngle)],
  };
}

export interface CoverAnimator {
  /** Current angle in radians; 0 = closed. */
  readonly angle: number;
  /** Swings open; done runs once fully open, and not at all if a close() supersedes it. */
  open(done?: () => void): void;
  close(done?: () => void): void;
  step(dt: number): void;
}

export interface CoverAnimatorOptions {
  openAngle: number;
  /** Duration of a full swing (0 = cut, for reduced motion). */
  seconds(): number;
  onChange(angle: number): void;
}

export function createCoverAnimator(opts: CoverAnimatorOptions): CoverAnimator {
  let angle = 0;
  let move: { from: number; to: number; t: number; duration: number; done?: () => void } | null =
    null;

  const finish = (to: number, done?: () => void) => {
    move = null;
    angle = to;
    opts.onChange(angle);
    done?.();
  };
  const start = (to: number, done?: () => void) => {
    // A partial swing takes its share of the full duration.
    const duration = (opts.seconds() * Math.abs(to - angle)) / opts.openAngle;
    if (duration <= 0) {
      move = null;
      if (angle === to) done?.();
      else finish(to, done);
      return;
    }
    move = { from: angle, to, t: 0, duration, done };
  };
  return {
    get angle() {
      return angle;
    },
    open: (done) => start(opts.openAngle, done),
    close: (done) => start(0, done),
    step(dt) {
      if (!move) return;
      move.t = Math.min(1, move.t + dt / move.duration);
      if (move.t >= 1) return finish(move.to, move.done);
      angle = move.from + (move.to - move.from) * easeInOutCubic(move.t);
      opts.onChange(angle);
    },
  };
}
