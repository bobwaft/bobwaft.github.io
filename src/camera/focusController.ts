// Moves the camera between the idle pose and an object's focus pose (D-3).
import type { Pose, PoseTween } from './focusTween';

export interface FocusControllerOptions {
  tween: PoseTween;
  /** Current idle pose (landscape or portrait). */
  idlePose(): Pose;
  /** Focus pose for an object id, or null when it has none. */
  focusPose(id: string): Pose | null;
  /** Duration of a focus move in seconds (0 = cut). */
  seconds(): number;
  /** Called once when an enter or exit move finishes. */
  onArrived(): void;
}

export interface FocusController {
  /** Starts the move to id's focus pose; false (and no move) when it has none. */
  enter(id: string): boolean;
  /** Starts the move back to the idle pose. */
  exit(): void;
  /** Re-aims at the current destination (resize, motion preference); animated or cut. */
  retarget(animated?: boolean): void;
  step(dt: number): void;
}

export function createFocusController(opts: FocusControllerOptions): FocusController {
  const { tween } = opts;
  let mode: 'idle' | 'in' | 'focused' | 'out' = 'idle';
  let id: string | null = null;

  const destination = (): Pose => (id !== null && opts.focusPose(id)) || opts.idlePose();
  return {
    enter(next) {
      const target = opts.focusPose(next);
      if (!target) return false;
      id = next;
      mode = 'in';
      tween.start(tween.current, target, opts.seconds());
      return true;
    },
    exit() {
      id = null;
      mode = 'out';
      tween.start(tween.current, opts.idlePose(), opts.seconds());
    },
    retarget(animated = false) {
      const moving = mode === 'in' || mode === 'out';
      tween.start(tween.current, destination(), moving || animated ? opts.seconds() : 0);
    },
    step(dt) {
      const was = tween.active;
      tween.step(dt);
      if (was && !tween.active && (mode === 'in' || mode === 'out')) {
        mode = mode === 'in' ? 'focused' : 'idle';
        opts.onArrived();
      }
    },
  };
}
