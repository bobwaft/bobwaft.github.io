// Resume controls (FR-15, FR-16): page buttons, arrow keys and Download PDF. DOM, fixed in the
// top-right corner, shown only in the papers focus view.
import { keyDelta, pageLabel } from '../resume/layout';

export interface ResumeControls {
  setVisible(visible: boolean): void;
  /** Updates the label and button states; paging controls hide for a single page. */
  setPage(page: number, count: number): void;
  dispose(): void;
}

export function createResumeControls(
  pdfUrl: string,
  onStep: (delta: number) => void,
): ResumeControls {
  const root = document.createElement('div');
  root.id = 'resume-controls';
  root.hidden = true;
  root.innerHTML =
    `<div class="resume-pager" hidden>` +
    `<button type="button" class="resume-prev" aria-label="Previous page">‹</button>` +
    `<span class="resume-label" aria-live="polite"></span>` +
    `<button type="button" class="resume-next" aria-label="Next page">›</button>` +
    `</div>` +
    `<a class="resume-download" download>Download PDF</a>`;
  root.querySelector<HTMLAnchorElement>('.resume-download')!.href = pdfUrl;
  const pager = root.querySelector<HTMLElement>('.resume-pager')!;
  const prev = root.querySelector<HTMLButtonElement>('.resume-prev')!;
  const next = root.querySelector<HTMLButtonElement>('.resume-next')!;
  const label = root.querySelector<HTMLElement>('.resume-label')!;
  prev.addEventListener('click', () => onStep(-1));
  next.addEventListener('click', () => onStep(1));
  const onKey = (e: KeyboardEvent) => {
    const delta = keyDelta(e.key);
    if (root.hidden || pager.hidden || !delta) return;
    e.preventDefault();
    onStep(delta);
  };
  window.addEventListener('keydown', onKey);
  document.body.appendChild(root);
  return {
    setVisible(visible) {
      root.hidden = !visible;
    },
    setPage(page, count) {
      pager.hidden = count < 2;
      label.textContent = pageLabel(page, count);
      prev.disabled = page <= 1;
      next.disabled = page >= count;
    },
    dispose() {
      window.removeEventListener('keydown', onKey);
      root.remove();
    },
  };
}
