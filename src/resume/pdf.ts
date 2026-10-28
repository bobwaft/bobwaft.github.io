// pdf.js wrapper (A-15). Imported only with a dynamic import() after the scene is interactive,
// so pdf.js and its worker stay out of the initial bundle.
import {
  getDocument,
  GlobalWorkerOptions,
  RenderingCancelledException,
  TextLayer,
  type RenderTask,
} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

export interface ResumeDocument {
  numPages: number;
  /** Width / height of a page, in PDF points. */
  pageSize(page: number): Promise<{ width: number; height: number }>;
  /** Draws a page onto canvas at widthPx device pixels wide. A newer call cancels an older one. */
  renderPage(page: number, canvas: HTMLCanvasElement, widthPx: number): Promise<void>;
  /** Fills container with the page's selectable text, laid out cssWidth CSS pixels wide. */
  renderText(page: number, container: HTMLElement, cssWidth: number): Promise<void>;
}

const cancelled = (err: unknown) => err instanceof RenderingCancelledException;

export async function openResume(url: string): Promise<ResumeDocument> {
  const doc = await getDocument({ url }).promise;
  const tasks = new WeakMap<HTMLCanvasElement, RenderTask>();
  const layers = new WeakMap<HTMLElement, TextLayer>();
  return {
    numPages: doc.numPages,
    async pageSize(n) {
      const { width, height } = (await doc.getPage(n)).getViewport({ scale: 1 });
      return { width, height };
    },
    async renderPage(n, canvas, widthPx) {
      tasks.get(canvas)?.cancel();
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: widthPx / page.getViewport({ scale: 1 }).width });
      // Draw offscreen, then copy, so the visible page never flashes blank between renders.
      const scratch = document.createElement('canvas');
      scratch.width = Math.round(viewport.width);
      scratch.height = Math.round(viewport.height);
      const task = page.render({ canvas: scratch, viewport });
      tasks.set(canvas, task);
      try {
        await task.promise;
      } catch (err) {
        if (cancelled(err)) return;
        throw err;
      }
      canvas.width = scratch.width;
      canvas.height = scratch.height;
      canvas.getContext('2d')!.drawImage(scratch, 0, 0);
    },
    async renderText(n, container, cssWidth) {
      layers.get(container)?.cancel();
      const page = await doc.getPage(n);
      const scale = cssWidth / page.getViewport({ scale: 1 }).width;
      const viewport = page.getViewport({ scale });
      container.replaceChildren();
      container.style.setProperty('--total-scale-factor', String(scale));
      const layer = new TextLayer({
        textContentSource: page.streamTextContent(),
        container,
        viewport,
      });
      layers.set(container, layer);
      try {
        await layer.render();
      } catch (err) {
        if (!cancelled(err)) throw err;
      }
    },
  };
}
