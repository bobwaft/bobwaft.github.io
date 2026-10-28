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

/**
 * Canvas width in device pixels for a page shown onScreenWidth CSS pixels wide: sharp at
 * the device pixel ratio, at least the element's CSS width, capped at MAX_RENDER_PX.
 */
export function renderWidth(onScreenWidth: number, dpr: number, cssWidth = 0): number {
  return Math.min(MAX_RENDER_PX, Math.round(Math.max(onScreenWidth * dpr, cssWidth)));
}
