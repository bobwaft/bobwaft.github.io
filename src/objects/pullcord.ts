// Pull cord -> lamp toggle (Phase 4). Instant: no focus view.
import type { InteractableModule } from './types';

export interface PullcordBinding {
  toggle(): void;
}

export interface PullcordModule extends InteractableModule {
  bind(binding: PullcordBinding): void;
}

function createPullcord(): PullcordModule {
  let binding: PullcordBinding | null = null;
  return {
    id: 'pullcord',
    label: 'Lamp',
    bind(b) {
      binding = b;
    },
    onClick() {
      binding?.toggle();
    },
  };
}

export const pullcord = createPullcord();
