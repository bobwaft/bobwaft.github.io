// Notebook -> projects (Phase 7). Camera arrives, the cover swings open, then the spread shows;
// on exit the spread hides and the cover closes before the camera leaves (A-8).
import { NOTEBOOK_FOCUS } from '../camera/poses';
import type { InteractableModule } from './types';

export interface NotebookBinding {
  /** Swings the cover open; done runs once it is fully open. */
  open(done: () => void): void;
  /** Swings the cover closed; done runs once it is shut. */
  close(done: () => void): void;
  /** Shows or hides the spread and its controls. */
  setContentVisible(visible: boolean): void;
}

export interface NotebookModule extends InteractableModule {
  bind(binding: NotebookBinding): void;
}

function createNotebook(): NotebookModule {
  let binding: NotebookBinding | null = null;
  return {
    id: 'notebook',
    label: 'Projects',
    focus: NOTEBOOK_FOCUS,
    bind(b) {
      binding = b;
      b.setContentVisible(false);
    },
    onEnter() {
      const b = binding;
      b?.open(() => b.setContentVisible(true));
    },
    onExit() {
      const b = binding;
      if (!b) return;
      b.setContentVisible(false);
      return new Promise<void>((resolve) => b.close(resolve));
    },
  };
}

export const notebook = createNotebook();
