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

/** Look range and pose-tween duration for the user's motion preference (D-13). */
export function lookSettings(reduced: boolean): { range: LookRange; poseTweenSeconds: number } {
  if (!reduced) return { range: IDLE_RANGE, poseTweenSeconds: 0.8 };
  return {
    range: { yaw: IDLE_RANGE.yaw * 0.4, pitch: IDLE_RANGE.pitch * 0.4 },
    poseTweenSeconds: 0,
  };
}

/** Max pointer travel (px) for a touch to still count as a tap. */
export const TAP_THRESHOLD_PX = 10;

/** True when a pointer moved less than the threshold. */
export function isTap(dxPx: number, dyPx: number, threshold = TAP_THRESHOLD_PX): boolean {
  return Math.hypot(dxPx, dyPx) < threshold;
}

/** Input after dragging from startInput; drag right looks left, drag down looks up. */
export function dragInput(
  startInput: { x: number; y: number },
  dxPx: number,
  dyPx: number,
  width: number,
  height: number,
): { x: number; y: number } {
  return {
    x: clamp1(startInput.x - dxPx / (width / 2)),
    y: clamp1(startInput.y + dyPx / (height / 2)),
  };
}

export interface LookControlsOptions {
  range?: LookRange;
  /** Called for a touch/pen tap (movement under the threshold). */
  onTap?: (clientX: number, clientY: number) => void;
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
  let touch: {
    id: number;
    x: number;
    y: number;
    start: { x: number; y: number };
    dragging: boolean;
  } | null = null;
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    touch = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      start: { x: inputX, y: inputY },
      dragging: false,
    };
  };
  const onTouchMove = (e: PointerEvent) => {
    if (!enabled || !touch || e.pointerId !== touch.id) return;
    const dx = e.clientX - touch.x;
    const dy = e.clientY - touch.y;
    if (!touch.dragging && isTap(dx, dy)) return;
    touch.dragging = true;
    ({ x: inputX, y: inputY } = dragInput(
      touch.start,
      dx,
      dy,
      window.innerWidth,
      window.innerHeight,
    ));
  };
  const onUp = (e: PointerEvent) => {
    if (!touch || e.pointerId !== touch.id) return;
    const t = touch;
    touch = null;
    if (!t.dragging && isTap(e.clientX - t.x, e.clientY - t.y)) opts.onTap?.(e.clientX, e.clientY);
  };
  const onCancel = () => {
    touch = null;
  };
  element.addEventListener('pointermove', onMove);
  element.addEventListener('pointermove', onTouchMove);
  element.addEventListener('pointerdown', onDown);
  element.addEventListener('pointerup', onUp);
  element.addEventListener('pointercancel', onCancel);
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
      element.removeEventListener('pointermove', onTouchMove);
      element.removeEventListener('pointerdown', onDown);
      element.removeEventListener('pointerup', onUp);
      element.removeEventListener('pointercancel', onCancel);
      document.removeEventListener('mouseout', onMouseOut);
      window.removeEventListener('blur', recentre);
    },
  };
}
