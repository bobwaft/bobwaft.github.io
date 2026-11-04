import { describe, expect, it } from 'vitest';
import {
  FOCUS_PAPER,
  IDLE_PAPER,
  keyDelta,
  needsRender,
  pageLabel,
  renderWidth,
  scaleZoom,
  stepPage,
  stepZoom,
  textLayerStretch,
  ZOOM_LEVELS,
  zoomKeyDelta,
  zoomLabel,
} from '../../src/resume/layout';

describe('stepZoom', () => {
  it('moves to the next zoom level either way', () => {
    expect(stepZoom(1, 1)).toBe(1.5);
    expect(stepZoom(2, -1)).toBe(1.5);
  });

  it("can't zoom past the smallest or largest level", () => {
    expect(stepZoom(1, -1)).toBe(1);
    expect(stepZoom(ZOOM_LEVELS.at(-1)!, 1)).toBe(ZOOM_LEVELS.at(-1));
  });

  it('steps from the nearest level for an off-step zoom', () => {
    expect(stepZoom(1.4, 1)).toBe(2);
  });
});

describe('scaleZoom', () => {
  it('scales the zoom by the pinch factor', () => {
    expect(scaleZoom(1.5, 2)).toBe(3);
    expect(scaleZoom(2, 0.75)).toBe(1.5);
  });

  it('stays within the zoom levels', () => {
    expect(scaleZoom(1.2, 0.5)).toBe(1);
    expect(scaleZoom(2, 4)).toBe(ZOOM_LEVELS.at(-1));
  });
});

describe('zoomKeyDelta', () => {
  it('maps plus and minus keys to a zoom step', () => {
    expect(zoomKeyDelta('+')).toBe(1);
    expect(zoomKeyDelta('=')).toBe(1);
    expect(zoomKeyDelta('-')).toBe(-1);
  });

  it('ignores other keys', () => {
    expect(zoomKeyDelta('ArrowRight')).toBe(0);
  });
});

describe('zoomLabel', () => {
  it('shows the zoom as a percentage', () => {
    expect(zoomLabel(1.5)).toBe('150%');
  });
});

describe('stepPage', () => {
  it('moves forward and back within the document', () => {
    expect(stepPage(1, 1, 3)).toBe(2);
    expect(stepPage(3, -1, 3)).toBe(2);
  });

  it("can't page past the first or last page", () => {
    expect(stepPage(1, -1, 3)).toBe(1);
    expect(stepPage(3, 1, 3)).toBe(3);
  });

  it('stays on page 1 for a single-page or empty document', () => {
    expect(stepPage(1, 1, 1)).toBe(1);
    expect(stepPage(1, 1, 0)).toBe(1);
  });
});

describe('keyDelta', () => {
  it('maps arrow and page keys to a page step', () => {
    expect(keyDelta('ArrowRight')).toBe(1);
    expect(keyDelta('PageDown')).toBe(1);
    expect(keyDelta('ArrowLeft')).toBe(-1);
    expect(keyDelta('PageUp')).toBe(-1);
  });

  it('ignores other keys', () => {
    expect(keyDelta('Escape')).toBe(0);
    expect(keyDelta('a')).toBe(0);
  });
});

describe('pageLabel', () => {
  it('shows the position in the document', () => {
    expect(pageLabel(2, 3)).toBe('Page 2 of 3');
  });
});

describe('renderWidth', () => {
  it('renders at on-screen size times the device pixel ratio', () => {
    expect(renderWidth(900, 2)).toBe(1800);
  });

  it('never drops below the CSS width, so the canvas is never upscaled', () => {
    expect(renderWidth(300, 1, 794)).toBe(794);
  });

  it('caps the canvas size', () => {
    expect(renderWidth(3000, 3)).toBe(4096);
  });
});

describe('needsRender', () => {
  const shown = { page: 1, width: 1000 };

  it('redraws when the page changes', () => {
    expect(needsRender(shown, 2, 1000)).toBe(true);
  });

  it('redraws when the needed size drifts past the ratio either way', () => {
    expect(needsRender(shown, 1, 1300)).toBe(true);
    expect(needsRender(shown, 1, 700)).toBe(true);
  });

  it('keeps the current render for small size changes', () => {
    expect(needsRender(shown, 1, 1200)).toBe(false);
    expect(needsRender(shown, 1, 850)).toBe(false);
  });

  it('always draws when nothing is shown yet', () => {
    expect(needsRender({ page: 0, width: 0 }, 1, 1000)).toBe(true);
  });
});

describe('page backgrounds (BUG-005)', () => {
  it('are opaque colours, never transparent', () => {
    for (const c of [IDLE_PAPER, FOCUS_PAPER]) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
  });
  it('idle paper is white so the multiply leaves the baked paper unchanged', () => {
    expect(IDLE_PAPER.toLowerCase()).toBe('#ffffff');
  });
});

describe('textLayerStretch (a Letter PDF on the A4 sheet)', () => {
  it('is 1 when the page already has the shape of the element', () => {
    expect(textLayerStretch(595, 842, 794, (842 / 595) * 794)).toBeCloseTo(1, 6);
  });
  it('stretches a US Letter page to fill an A4-shaped element', () => {
    // The canvas fills the element; the text layer is uniformly scaled, so it is this much short.
    expect(textLayerStretch(612, 792, 794, 1123)).toBeCloseTo(1123 / ((792 * 794) / 612), 6);
    expect(textLayerStretch(612, 792, 794, 1123)).toBeGreaterThan(1.09);
  });
  it('squashes a page taller than the element, and ignores a missing element height', () => {
    expect(textLayerStretch(500, 1000, 500, 800)).toBeCloseTo(0.8, 6);
    expect(textLayerStretch(612, 792, 794, 0)).toBe(1);
  });
});
