// Speaker -> music toggle (Phase 4). Instant: no focus view.
import type { InteractableModule } from './types';

export interface SpeakerBinding {
  toggle(): void;
}

export interface SpeakerModule extends InteractableModule {
  bind(binding: SpeakerBinding): void;
}

function createSpeaker(): SpeakerModule {
  let binding: SpeakerBinding | null = null;
  return {
    id: 'speaker',
    label: 'Music',
    bind(b) {
      binding = b;
    },
    onClick() {
      binding?.toggle();
    },
  };
}

export const speaker = createSpeaker();
