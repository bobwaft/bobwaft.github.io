// pdf.js wrapper (A-15). Imported only with a dynamic import() after the scene is interactive,
// so pdf.js and its worker stay out of the initial bundle.
import { getDocument, GlobalWorkerOptions, TextLayer } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { linkBoxes } from './links';
import { textLayerStretch } from './layout';

GlobalWorkerOptions.workerSrc = workerUrl;

/** Renders draw offscreen; the caller decides whether the result is still wanted and shows it. */
export interface ResumeDocument {
  numPages: number;
  /**
   * A new canvas with the page drawn widthPx device pixels wide on an opaque background (CSS
   * colour). Never transparent: a transparent texel is black when multiplied over the paper mesh.
   */
  renderPage(page: number, widthPx: number, background: string): Promise<HTMLCanvasElement>;
  /**
   * A new .textLayer element with the page's selectable text and links, cssWidth CSS pixels wide;
   * stretched vertically to cssHeight when the page element's shape differs from the PDF's.
   */
  renderText(page: number, cssWidth: number, cssHeight?: number): Promise<HTMLElement>;
  destroy(): void;
}

export async function openResume(url: string): Promise<ResumeDocument> {
  const task = getDocument({ url });
  const doc = await task.promise;
  return {
    numPages: doc.numPages,
    async renderPage(n, widthPx, background) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: widthPx / page.getViewport({ scale: 1 }).width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({ canvas, viewport, background }).promise;
      return canvas;
    },
    async renderText(n, cssWidth, cssHeight = 0) {
      const page = await doc.getPage(n);
      const natural = page.getViewport({ scale: 1 });
      const scale = cssWidth / natural.width;
      const container = document.createElement('div');
      container.className = 'textLayer';
      container.style.setProperty('--total-scale-factor', String(scale));
      const stretch = textLayerStretch(natural.width, natural.height, cssWidth, cssHeight);
      if (Math.abs(stretch - 1) > 0.001) container.style.transform = `scaleY(${stretch})`;
      const viewport = page.getViewport({ scale });
      const layer = new TextLayer({
        textContentSource: page.streamTextContent(),
        container,
        viewport,
      });
      await layer.render();
      // The PDF's links (LinkedIn, GitHub...) as clickable boxes over their text.
      const links = document.createElement('div');
      links.className = 'resume-links';
      const boxes = linkBoxes(
        await page.getAnnotations({ intent: 'display' }),
        ([x1, y1, x2, y2]) => [
          ...viewport.convertToViewportPoint(x1, y1),
          ...viewport.convertToViewportPoint(x2, y2),
        ],
      );
      for (const box of boxes) {
        const a = document.createElement('a');
        a.href = box.href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.setAttribute('aria-label', box.href);
        a.style.cssText = `left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px`;
        links.appendChild(a);
      }
      if (boxes.length) container.appendChild(links);
      return container;
    },
    destroy: () => void task.destroy(), // also ends the worker
  };
}
