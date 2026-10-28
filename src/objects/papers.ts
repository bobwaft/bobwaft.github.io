// Papers -> resume (Phase 6). The resume viewer shows only while focused on the papers.
import { PAPERS_FOCUS } from '../camera/poses';
import type { InteractableModule } from './types';

export interface PapersBinding {
  /** Shows or hides the resume viewer and its controls. */
  setContentVisible(visible: boolean): void;
}

export interface PapersModule extends InteractableModule {
  bind(binding: PapersBinding): void;
}

function createPapers(): PapersModule {
  let binding: PapersBinding | null = null;
  return {
    id: 'papers',
    label: 'Resume',
    focus: PAPERS_FOCUS,
    bind(b) {
      binding = b;
      b.setContentVisible(false);
    },
    onEnter() {
      binding?.setContentVisible(true);
    },
    onExit() {
      binding?.setContentVisible(false);
    },
  };
}

export const papers = createPapers();
