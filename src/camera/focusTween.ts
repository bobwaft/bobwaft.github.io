import { Quaternion, Vector3 } from 'three';

export interface Pose {
  position: Vector3;
  quaternion: Quaternion;
}

/** Cubic ease-in-out for t in [0,1]. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Writes the lerp/slerp blend of a and b at t (clamped to 0..1) into out. */
export function interpolatePose(a: Pose, b: Pose, t: number, out: Pose): Pose {
  const k = Math.max(0, Math.min(1, t));
  out.position.lerpVectors(a.position, b.position, k);
  out.quaternion.slerpQuaternions(a.quaternion, b.quaternion, k);
  return out;
}

export interface PoseTween {
  readonly active: boolean;
  readonly current: Pose;
  start(from: Pose, to: Pose, durationS: number): void;
  step(dt: number): Pose;
}

const clonePose = (p: Pose): Pose => ({
  position: p.position.clone(),
  quaternion: p.quaternion.clone(),
});

/** Eased tween between two poses; a zero duration cuts instantly on the next step. */
export function createPoseTween(initial: Pose): PoseTween {
  const current = clonePose(initial);
  let from = clonePose(initial);
  let to = clonePose(initial);
  let duration = 0;
  let elapsed = 0;
  let active = false;
  return {
    get active() {
      return active;
    },
    current,
    start(f, t, durationS) {
      from = clonePose(f);
      to = clonePose(t);
      duration = durationS;
      elapsed = 0;
      active = true;
    },
    step(dt) {
      if (!active) return current;
      elapsed += Math.max(0, dt);
      const t = duration > 0 ? elapsed / duration : 1;
      interpolatePose(from, to, t >= 1 ? 1 : easeInOutCubic(t), current);
      if (t >= 1) active = false;
      return current;
    },
  };
}
