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
  /** Frames this long after load (shader compile, first texture uploads) are not measured. */
  warmupMs?: number;
  /** A window needs at least this many frames before it can trigger. */
  minSamples?: number;
  /** A frame gap above this is a stall or tab switch: the window restarts instead. */
  maxGapMs?: number;
}

export const MONITOR_WARMUP_MS = 1000;
export const MONITOR_MIN_SAMPLES = 20;
/**
 * A gap this long is a stall or suspended tab, not slowness. Hidden tabs are handled by the hidden
 * flag / visibilitychange; heavy CPU throttling can put frames 1-2 s apart, which must still count.
 */
export const MONITOR_MAX_GAP_MS = 5000;
/** Below this median fps the device is hopeless: a window needs only a few frames, not minSamples. */
export const MONITOR_VERY_SLOW_FPS = 4;
const VERY_SLOW_MIN_SAMPLES = 3;

export type MonitorState = 'disabled' | 'warming' | 'measuring' | 'fired';

/**
 * Feed every rendered frame's timestamp. Calls onSlow once when a full window's median fps is
 * below the threshold. Warm-up frames, hidden frames and stalls are not sampled and restart the
 * window. Call reset() when the tab visibility changes (no frames arrive while hidden).
 */
export function createFpsMonitor(opts: FpsMonitorOptions) {
  const windowMs = opts.windowMs ?? MONITOR_WINDOW_MS;
  const threshold = opts.thresholdFps ?? FPS_THRESHOLD;
  const warmupMs = opts.warmupMs ?? MONITOR_WARMUP_MS;
  const minSamples = opts.minSamples ?? MONITOR_MIN_SAMPLES;
  const maxGapMs = opts.maxGapMs ?? MONITOR_MAX_GAP_MS;
  let last: number | null = null;
  let start = 0;
  let warmUntil = 0;
  let warmedUp = false;
  let samples: number[] = [];
  let fired = false;
  const restart = (nowMs: number | null) => {
    last = nowMs;
    start = nowMs ?? 0;
    samples = [];
    if (nowMs !== null && !warmedUp) warmUntil = nowMs + warmupMs;
  };
  return {
    /** Current state and the median fps of the frames sampled in the open window (debug overlay). */
    status(): { state: MonitorState; medianFps: number | null } {
      const state: MonitorState = opts.disabled
        ? 'disabled'
        : fired
          ? 'fired'
          : warmedUp
            ? 'measuring'
            : 'warming';
      return { state, medianFps: medianFps(samples) };
    },
    reset(): void {
      restart(null);
    },
    frame(nowMs: number, hidden: boolean): void {
      if (opts.disabled || fired) return;
      if (hidden) return restart(null);
      if (last === null || nowMs - last > maxGapMs) return restart(nowMs);
      if (!warmedUp) {
        if (nowMs < warmUntil) {
          last = nowMs;
          start = nowMs;
          return;
        }
        warmedUp = true;
      }
      samples.push(nowMs - last);
      last = nowMs;
      if (nowMs - start < windowMs) return;
      const median = medianFps(samples);
      const verySlow = median !== null && median < MONITOR_VERY_SLOW_FPS;
      if (samples.length < (verySlow ? Math.min(minSamples, VERY_SLOW_MIN_SAMPLES) : minSamples)) {
        return;
      }
      start = nowMs;
      samples = [];
      if (median !== null && median < threshold) {
        fired = true;
        opts.onSlow();
      }
    },
  };
}
