// Speaker -> music toggle and pulse (Phase 4). Instant: no focus view.
import { Vector3, type Object3D } from 'three';
import type { InteractableModule } from './types';

export const PULSE_AMPLITUDE = 0.03;
export const PULSE_HZ = 1.5;
/** How fast the pulse strength eases in and out, per second. */
const PULSE_EASE_PER_S = 5;

/** Scale factor at time tS; strength 0..1 fades the pulse (0 gives exactly 1). */
export function pulseScale(tS: number, strength: number): number {
  const wave = 0.5 - 0.5 * Math.cos(2 * Math.PI * PULSE_HZ * tS);
  return 1 + PULSE_AMPLITUDE * strength * wave;
}

export interface SpeakerBinding {
  toggle(): void;
  isPlaying?(): boolean;
  /** The speaker's scene object; pulsed while music plays. */
  object?: Object3D;
}

export interface SpeakerModule extends InteractableModule {
  bind(binding: SpeakerBinding): void;
}

function createSpeaker(): SpeakerModule {
  let binding: SpeakerBinding | null = null;
  const baseScale = new Vector3(1, 1, 1);
  let time = 0;
  let strength = 0;
  return {
    id: 'speaker',
    label: 'Music',
    bind(b) {
      binding = b;
      if (b.object) baseScale.copy(b.object.scale);
      time = 0;
      strength = 0;
    },
    onClick() {
      binding?.toggle();
    },
    update(dt) {
      const object = binding?.object;
      if (!object) return;
      const playing = binding?.isPlaying?.() ?? false;
      if (!playing && strength === 0) return;
      const step = Math.max(0, dt);
      time += step;
      const delta = PULSE_EASE_PER_S * step;
      strength = playing ? Math.min(1, strength + delta) : Math.max(0, strength - delta);
      object.scale.copy(baseScale).multiplyScalar(pulseScale(time, strength));
    },
  };
}

export const speaker = createSpeaker();
