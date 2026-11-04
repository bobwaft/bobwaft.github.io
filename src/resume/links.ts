// Link annotations of a PDF page as clickable boxes (pdf.js's text layer has no links). Pure: the
// viewport conversion is passed in, so it needs no pdf.js.

export interface LinkAnnotation {
  subtype?: string;
  url?: string;
  /** [x1, y1, x2, y2] in PDF user space. */
  rect?: number[];
}

/** A box in viewport pixels, top-left origin. */
export interface LinkBox {
  href: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The url if it is http(s) or mailto; the PDF is the owner's, but never run a script scheme. */
export function safeHref(url: unknown): string | null {
  return typeof url === 'string' && /^(https?:|mailto:)/i.test(url) ? url : null;
}

export function linkBoxes(
  annotations: readonly LinkAnnotation[],
  /** PDF rect -> [x1, y1, x2, y2] in viewport pixels (two viewport.convertToViewportPoint calls). */
  toViewport: (rect: number[]) => number[],
): LinkBox[] {
  const boxes: LinkBox[] = [];
  for (const a of annotations) {
    const href = a.subtype === 'Link' ? safeHref(a.url) : null;
    if (!href || !a.rect || a.rect.length !== 4) continue;
    const [x1, y1, x2, y2] = toViewport(a.rect);
    boxes.push({
      href,
      left: Math.min(x1, x2),
      top: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    });
  }
  return boxes;
}
