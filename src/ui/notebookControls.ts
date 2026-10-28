// Notebook controls (FR-18): previous/next buttons and arrow keys. DOM, fixed in the top-right
// corner, shown only while the notebook is open.
import { keyDelta } from '../resume/layout';
import { spreadLabel } from '../notebook/spreads';

export interface NotebookControls {
  setVisible(visible: boolean): void;
  setSpread(index: number, count: number): void;
  dispose(): void;
}

export function createNotebookControls(onStep: (delta: number) => void): NotebookControls {
  const root = document.createElement('div');
  root.id = 'notebook-controls';
  root.hidden = true;
  root.innerHTML =
    `<button type="button" class="nb-prev" aria-label="Previous page">‹</button>` +
    `<span class="nb-label" aria-live="polite"></span>` +
    `<button type="button" class="nb-next" aria-label="Next page">›</button>`;
  const prev = root.querySelector<HTMLButtonElement>('.nb-prev')!;
  const next = root.querySelector<HTMLButtonElement>('.nb-next')!;
  const label = root.querySelector<HTMLElement>('.nb-label')!;
  prev.addEventListener('click', () => onStep(-1));
  next.addEventListener('click', () => onStep(1));
  const onKey = (e: KeyboardEvent) => {
    const delta = keyDelta(e.key);
    const typing =
      e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable]');
    if (root.hidden || !delta || typing) return;
    e.preventDefault();
    onStep(delta);
  };
  window.addEventListener('keydown', onKey);
  document.body.appendChild(root);
  return {
    setVisible(visible) {
      root.hidden = !visible;
    },
    setSpread(index, count) {
      label.textContent = spreadLabel(index, count);
      prev.disabled = index <= 0;
      next.disabled = index >= count - 1;
    },
    dispose() {
      window.removeEventListener('keydown', onKey);
      root.remove();
    },
  };
}
