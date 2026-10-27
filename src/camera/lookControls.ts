import { Euler, type PerspectiveCamera, type Quaternion, type Vector3 } from 'three';

export interface LookRange {
  yaw: number;
  pitch: number;
}

export interface LookPose {
  position: Vector3;
  quaternion: Quaternion;
}

const DEG = Math.PI / 180;

/** Idle look range in radians: yaw +-25 deg, pitch +-12 deg. */
export const IDLE_RANGE: LookRange = { yaw: 25 * DEG, pitch: 12 * DEG };

/** Damping rate (1/s); low enough to feel weighty. */
export const DAMPING = 4;

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

/** Maps NDC-like input in [-1,1] to a target yaw/pitch within the range. */
export function targetFromInput(x: number, y: number, range: LookRange): LookRange {
  return { yaw: -clamp1(x) * range.yaw, pitch: clamp1(y) * range.pitch };
}

/** Frame-rate independent exponential approach of current toward target. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  if (!(dt > 0)) return current;
  return target + (current - target) * Math.exp(-lambda * dt);
}

/** Sets the camera to the base pose with yaw/pitch offsets added (YXZ order). */
export function applyLook(
  camera: PerspectiveCamera,
  base: LookPose,
  yaw: number,
  pitch: number,
): void {
  camera.position.copy(base.position);
  const e = new Euler().setFromQuaternion(base.quaternion, 'YXZ');
  e.y += yaw;
  e.x += pitch;
  camera.quaternion.setFromEuler(e);
}

/** The neutral (centred) input. */
export function centreInput(): { x: number; y: number } {
  return { x: 0, y: 0 };
}

/** True when a mouseout's relatedTarget shows the pointer left the window. */
export function leftWindow(relatedTarget: EventTarget | null): boolean {
  return relatedTarget === null;
}

export interface LookControlsOptions {
  range?: LookRange;
}

export interface LookControls {
  /** Advances damping by dt seconds and returns the current yaw/pitch. */
  update(dt: number): LookRange;
  setRange(range: LookRange): void;
  setEnabled(enabled: boolean): void;
  dispose(): void;
}

/** Thin DOM glue: pointer input -> damped yaw/pitch offsets. */
export function createLookControls(
  element: HTMLElement,
  opts: LookControlsOptions = {},
): LookControls {
  let range = opts.range ?? IDLE_RANGE;
  let enabled = true;
  let inputX = 0;
  let inputY = 0;
  const current = { yaw: 0, pitch: 0 };

  const onMove = (e: PointerEvent) => {
    if (!enabled || e.pointerType !== 'mouse') return;
    inputX = (e.clientX / window.innerWidth) * 2 - 1;
    inputY = 1 - (e.clientY / window.innerHeight) * 2;
  };
  const recentre = () => {
    ({ x: inputX, y: inputY } = centreInput());
  };
  const onMouseOut = (e: MouseEvent) => {
    if (leftWindow(e.relatedTarget)) recentre();
  };
  element.addEventListener('pointermove', onMove);
  document.addEventListener('mouseout', onMouseOut);
  window.addEventListener('blur', recentre);

  return {
    update(dt) {
      const t = targetFromInput(inputX, inputY, range);
      current.yaw = damp(current.yaw, t.yaw, DAMPING, dt);
      current.pitch = damp(current.pitch, t.pitch, DAMPING, dt);
      return current;
    },
    setRange(r) {
      range = r;
    },
    setEnabled(v) {
      enabled = v;
    },
    dispose() {
      element.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseout', onMouseOut);
      window.removeEventListener('blur', recentre);
    },
  };
}
