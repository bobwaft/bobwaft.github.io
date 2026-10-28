// Time of day: the local clock sets the start; the window cycles day -> dusk -> night.
// t is the setTimeOfDay cycle: 0 = noon, 0.5 = midnight, 1 = noon again.
import { easeInOutCubic } from '../camera/focusTween';

/** Preset times. day value (smoothstep of cos): DAY = 1, DUSK = 0.5, NIGHT = 0. */
export const DAY = 0;
export const DUSK = 0.25;
export const NIGHT = 0.5;

export const TIME_TWEEN_SECONDS = 1.2;

const wrap = (x: number) => x - Math.floor(x);

/** Same curve as setTimeOfDay: smoothstep(cos(2*pi*t) * 0.5 + 0.5, 0.25, 0.75). */
export function dayValue(t: number): number {
  const x = Math.min(1, Math.max(0, (Math.cos(t * Math.PI * 2) * 0.5 + 0.5 - 0.25) / 0.5));
  return x * x * (3 - 2 * x);
}

/** Local hours and minutes -> t (12:00 -> 0, 00:00 -> 0.5), in [0, 1). */
export function timeFromClock(date: Date): number {
  const dayFraction = (date.getHours() * 60 + date.getMinutes()) / 1440;
  return wrap(dayFraction + 0.5);
}

/** The preset after the phase nearest to currentT (day -> dusk -> night -> day). */
export function nextPreset(currentT: number): number {
  const day = dayValue(currentT);
  if (day >= 0.75) return DUSK;
  if (day > 0.25) return NIGHT;
  return DAY;
}

export interface TimeOfDayOptions {
  initial: number;
  apply(t: number): void;
  /** Tween length in seconds; 0 cuts instantly (reduced motion). */
  durationS?: () => number;
}

export interface TimeOfDay {
  /** The preset being tweened to (or held). */
  readonly target: number;
  cycle(): void;
  update(dt: number): void;
}

/** Tweens t along the shortest path (a tie goes forward), so noon/midnight never flicker. */
export function createTimeOfDay(opts: TimeOfDayOptions): TimeOfDay {
  const durationS = opts.durationS ?? (() => TIME_TWEEN_SECONDS);
  let current = wrap(opts.initial);
  let target = current;
  let from = current;
  let delta = 0;
  let elapsed = 0;
  let active = false;
  opts.apply(opts.initial);
  const finish = () => {
    current = wrap(from + delta);
    active = false;
    opts.apply(current);
  };
  return {
    get target() {
      return target;
    },
    cycle() {
      target = nextPreset(target);
      from = current;
      delta = wrap(target - from);
      if (delta > 0.5) delta -= 1;
      elapsed = 0;
      active = true;
    },
    update(dt) {
      if (!active) return;
      elapsed += Math.max(0, dt);
      const d = durationS();
      const k = d > 0 ? elapsed / d : 1;
      if (k >= 1) {
        finish();
        return;
      }
      current = wrap(from + delta * easeInOutCubic(k));
      opts.apply(current);
    },
  };
}
