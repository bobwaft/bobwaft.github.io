// Pull cord -> lamp toggle (Phase 4). Instant: no focus view.
import type { Object3D } from 'three';
import type { InteractableModule } from './types';

export const CORD_SECONDS = 0.45;
/** How far the cord travels down at the peak, in the parent's local units. */
export const CORD_PULL = 0.03;

/** Pull-and-spring-back curve for t in [0,1]: 0 -> 1 (pulled) -> small overshoot -> 0. */
export function cordOffset(t: number): number {
  if (t <= 0 || t >= 1) return 0;
  const pull = 0.25;
  if (t < pull) {
    const k = t / pull;
    return 1 - (1 - k) * (1 - k);
  }
  const u = (t - pull) / (1 - pull);
  return (1 - u) * (1 - u) * Math.cos(1.5 * Math.PI * u);
}

export interface PullcordBinding {
  toggle(): void;
  /** The cord's scene object; moved down and back on each click. */
  object?: Object3D;
}

export interface PullcordModule extends InteractableModule {
  bind(binding: PullcordBinding): void;
}

function createPullcord(): PullcordModule {
  let binding: PullcordBinding | null = null;
  let restY = 0;
  let elapsed = CORD_SECONDS; // idle
  const place = (offset: number) => {
    if (binding?.object) binding.object.position.y = restY - offset * CORD_PULL;
  };
  return {
    id: 'pullcord',
    label: 'Lamp',
    bind(b) {
      binding = b;
      if (b.object) restY = b.object.position.y;
      elapsed = CORD_SECONDS;
    },
    onClick() {
      binding?.toggle();
      elapsed = 0;
    },
    update(dt) {
      if (elapsed >= CORD_SECONDS) return;
      elapsed += Math.max(0, dt);
      place(cordOffset(elapsed / CORD_SECONDS));
    },
  };
}

export const pullcord = createPullcord();
