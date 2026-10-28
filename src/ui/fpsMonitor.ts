// Frame-time monitor for the auto-fallback (A-14): median fps < 25 over 5 s after load.
export const FPS_THRESHOLD = 25;
export const MONITOR_WINDOW_MS = 5000;
export const FORCE_3D_KEY = 'force3d';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** sessionStorage, or null when the browser blocks access to it. */
export function safeSessionStorage(): StorageLike | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** True when the visitor chose "Try 3D anyway" this session. */
export function isForce3d(storage: StorageLike | null = safeSessionStorage()): boolean {
  try {
    return storage?.getItem(FORCE_3D_KEY) === '1';
  } catch {
    return false;
  }
}

/** Remembers "Try 3D anyway" for the rest of the session; silently ignored if storage fails. */
export function setForce3d(storage: StorageLike | null = safeSessionStorage()): void {
  try {
    storage?.setItem(FORCE_3D_KEY, '1');
  } catch {
    // storage blocked: the check simply stays on after reload
  }
}

/** Median of the per-frame fps for the given frame times (ms); null without a usable frame. */
export function medianFps(frameTimesMs: number[]): number | null {
  const fps = frameTimesMs
    .filter((dt) => dt > 0)
    .map((dt) => 1000 / dt)
    .sort((a, b) => a - b);
  if (fps.length === 0) return null;
  const mid = fps.length >> 1;
  return fps.length % 2 ? fps[mid] : (fps[mid - 1] + fps[mid]) / 2;
}

export interface FpsMonitorOptions {
  onSlow: () => void;
  /** Skip all checks (the "Try 3D anyway" flag is set). */
  disabled?: boolean;
  windowMs?: number;
  thresholdFps?: number;
}

/**
 * Feed every rendered frame's timestamp. Calls onSlow once when a full window's median fps is
 * below the threshold. Hidden frames are ignored and restart the window.
 */
export function createFpsMonitor(opts: FpsMonitorOptions) {
  const windowMs = opts.windowMs ?? MONITOR_WINDOW_MS;
  const threshold = opts.thresholdFps ?? FPS_THRESHOLD;
  let last: number | null = null;
  let start = 0;
  let samples: number[] = [];
  let fired = false;
  return {
    frame(nowMs: number, hidden: boolean): void {
      if (opts.disabled || fired) return;
      if (hidden || last === null) {
        // First frame, or the first one after being hidden: begin a fresh window.
        last = hidden ? null : nowMs;
        start = nowMs;
        samples = [];
        return;
      }
      samples.push(nowMs - last);
      last = nowMs;
      if (nowMs - start < windowMs) return;
      const median = medianFps(samples);
      start = nowMs;
      samples = [];
      if (median !== null && median < threshold) {
        fired = true;
        opts.onSlow();
      }
    },
  };
}
