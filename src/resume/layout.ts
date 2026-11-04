// Paging and render sizing for the resume viewer (FR-16, A-15).

/** Largest canvas side we render, to bound memory on big screens. */
export const MAX_RENDER_PX = 4096;

/** The page after moving by delta, kept within 1..count. */
export function stepPage(page: number, delta: number, count: number): number {
  return Math.min(Math.max(1, count), Math.max(1, page + delta));
}

/** Page step for a key: arrows and Page Up/Down; 0 for anything else. */
export function keyDelta(key: string): -1 | 0 | 1 {
  if (key === 'ArrowRight' || key === 'PageDown') return 1;
  if (key === 'ArrowLeft' || key === 'PageUp') return -1;
  return 0;
}

export function pageLabel(page: number, count: number): string {
  return `Page ${page} of ${count}`;
}

/** Zoom steps for the page in the focus view; 1 fits the sheet. */
export const ZOOM_LEVELS = [1, 1.5, 2, 3];

/** The zoom level delta steps away from zoom, kept within ZOOM_LEVELS. */
export function stepZoom(zoom: number, delta: number): number {
  const nearest = ZOOM_LEVELS.reduce(
    (best, z, i) => (Math.abs(z - zoom) < Math.abs(ZOOM_LEVELS[best] - zoom) ? i : best),
    0,
  );
  const i = Math.min(ZOOM_LEVELS.length - 1, Math.max(0, nearest + delta));
  return ZOOM_LEVELS[i];
}

/** Zoom scaled by factor (a pinch), kept within the ZOOM_LEVELS range. */
export function scaleZoom(zoom: number, factor: number): number {
  return Math.min(ZOOM_LEVELS[ZOOM_LEVELS.length - 1], Math.max(ZOOM_LEVELS[0], zoom * factor));
}

/** Zoom step for a key: + (or =) and -; 0 for anything else. */
export function zoomKeyDelta(key: string): -1 | 0 | 1 {
  if (key === '+' || key === '=') return 1;
  if (key === '-' || key === '_') return -1;
  return 0;
}

export function zoomLabel(zoom: number): string {
  return `${Math.round(zoom * 100)}%`;
}

/**
 * Canvas width in device pixels for a page shown onScreenWidth CSS pixels wide: sharp at
 * the device pixel ratio, at least the element's CSS width, capped at MAX_RENDER_PX.
 */
export function renderWidth(onScreenWidth: number, dpr: number, cssWidth = 0): number {
  return Math.min(MAX_RENDER_PX, Math.round(Math.max(onScreenWidth * dpr, cssWidth)));
}

/** Re-render when the needed width drifts from the shown one by more than this factor. */
export const RERENDER_RATIO = 1.25;

/** True when the page on screen is the wrong page, or too far from the size it needs. */
export function needsRender(
  shown: { page: number; width: number },
  page: number,
  width: number,
  ratio = RERENDER_RATIO,
): boolean {
  if (shown.page !== page || shown.width <= 0) return true;
  return Math.max(width / shown.width, shown.width / width) > ratio;
}

/**
 * Page backgrounds. The idle overlay multiplies the page over the baked paper, so its paper is
 * white (a no-op). The focus view's canvas is white too: it is multiplied (CSS mix-blend-mode)
 * over a page background set to the colour sampled from the lit paper (paperSample.ts, BUG-009).
 * Both are opaque: transparent texels multiply to black.
 */
export const IDLE_PAPER = '#ffffff';
export const FOCUS_PAPER = '#ffffff';

/**
 * Vertical factor that makes the text layer match the canvas. The canvas fills the page element
 * (CSS height 100%), while the text layer is scaled uniformly from the page's width; a PDF whose
 * shape differs from the element's (US Letter on the A4 sheet) would otherwise drift out of line.
 * 1 when the element height is unknown.
 */
export function textLayerStretch(
  pageWidth: number,
  pageHeight: number,
  cssWidth: number,
  cssHeight: number,
): number {
  if (!(cssHeight > 0)) return 1;
  return cssHeight / (pageHeight * (cssWidth / pageWidth));
}
