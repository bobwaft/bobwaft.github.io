// Lamp state: fades the shelf-light uniform between 1 (on) and 0 (off).
import { easeInOutCubic } from '../camera/focusTween';

export interface Lamp {
  readonly isOn: boolean;
  toggle(): void;
  update(dt: number): void;
}

export const LAMP_FADE_SECONDS = 0.4;

/** Starts on. Toggling mid-fade reverses from the current value. A 0 duration cuts instantly. */
export function createLamp(
  target: { value: number },
  durationS: () => number = () => LAMP_FADE_SECONDS,
): Lamp {
  let goal = 1;
  let from = 1;
  let elapsed = 0;
  let active = false;
  target.value = 1;
  return {
    get isOn() {
      return goal === 1;
    },
    toggle() {
      goal = goal === 1 ? 0 : 1;
      from = target.value;
      elapsed = 0;
      active = true;
    },
    update(dt) {
      if (!active) return;
      elapsed += Math.max(0, dt);
      const d = durationS();
      const t = d > 0 ? elapsed / d : 1;
      if (t >= 1) {
        target.value = goal;
        active = false;
      } else {
        target.value = from + (goal - from) * easeInOutCubic(t);
      }
    },
  };
}
