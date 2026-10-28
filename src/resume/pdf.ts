// pdf.js wrapper (A-15). Imported only with a dynamic import() after the scene is interactive,
// so pdf.js and its worker stay out of the initial bundle.
import { getDocument, GlobalWorkerOptions, TextLayer } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

/** Renders draw offscreen; the caller decides whether the result is still wanted and shows it. */
export interface ResumeDocument {
  numPages: number;
  /** A new canvas with the page drawn widthPx device pixels wide. */
  renderPage(page: number, widthPx: number): Promise<HTMLCanvasElement>;
  /** A new .textLayer element with the page's selectable text, cssWidth CSS pixels wide. */
  renderText(page: number, cssWidth: number): Promise<HTMLElement>;
  destroy(): void;
}

export async function openResume(url: string): Promise<ResumeDocument> {
  const task = getDocument({ url });
  const doc = await task.promise;
  return {
    numPages: doc.numPages,
    async renderPage(n, widthPx) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: widthPx / page.getViewport({ scale: 1 }).width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({ canvas, viewport }).promise;
      return canvas;
    },
    async renderText(n, cssWidth) {
      const page = await doc.getPage(n);
      const scale = cssWidth / page.getViewport({ scale: 1 }).width;
      const container = document.createElement('div');
      container.className = 'textLayer';
      container.style.setProperty('--total-scale-factor', String(scale));
      const layer = new TextLayer({
        textContentSource: page.streamTextContent(),
        container,
        viewport: page.getViewport({ scale }),
      });
      await layer.render();
      return container;
    },
    destroy: () => void task.destroy(), // also ends the worker
  };
}
