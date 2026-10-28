// Window -> time of day (Phase 8). Instant: no focus view. Each click cycles day/dusk/night.
import type { InteractableModule } from './types';

export interface WindowBinding {
  cycle(): void;
  update?(dt: number): void;
}

export interface WindowModule extends InteractableModule {
  bind(binding: WindowBinding): void;
}

function createWindow(): WindowModule {
  let binding: WindowBinding | null = null;
  return {
    id: 'window',
    label: 'Time of day',
    bind(b) {
      binding = b;
    },
    onClick() {
      binding?.cycle();
    },
    update(dt) {
      binding?.update?.(dt);
    },
  };
}

export const windowModule = createWindow();
