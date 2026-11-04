import { describe, expect, it } from 'vitest';
import { linkBoxes, safeHref } from '../../src/resume/links';

describe('safeHref', () => {
  it('allows http, https and mailto links', () => {
    expect(safeHref('https://github.com/bobwaft')).toBe('https://github.com/bobwaft');
    expect(safeHref('http://example.com/')).toBe('http://example.com/');
    expect(safeHref('mailto:a@b.c')).toBe('mailto:a@b.c');
  });
  it('rejects script, data and other schemes, and non-strings', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('data:text/html,hi')).toBeNull();
    expect(safeHref('file:///etc/passwd')).toBeNull();
    expect(safeHref('')).toBeNull();
    expect(safeHref(undefined)).toBeNull();
  });
});

describe('linkBoxes', () => {
  // A stand-in for viewport.convertToViewportRectangle: PDF y-up to screen y-down, 2x scale.
  const toViewport = ([x1, y1, x2, y2]: number[]) => [x1 * 2, 800 - y1 * 2, x2 * 2, 800 - y2 * 2];

  it('turns link annotations into boxes in viewport pixels, whichever corner comes first', () => {
    const boxes = linkBoxes(
      [{ subtype: 'Link', url: 'https://x.test/', rect: [10, 700, 60, 720] }],
      toViewport,
    );
    expect(boxes).toEqual([
      { href: 'https://x.test/', left: 20, top: -640, width: 100, height: 40 },
    ]);
  });

  it('skips non-links, links without a safe url, and malformed rects', () => {
    const boxes = linkBoxes(
      [
        { subtype: 'Text', url: 'https://x.test/', rect: [0, 0, 1, 1] },
        { subtype: 'Link', url: 'javascript:void(0)', rect: [0, 0, 1, 1] },
        { subtype: 'Link', rect: [0, 0, 1, 1] },
        { subtype: 'Link', url: 'https://x.test/', rect: [0, 0, 1] },
        { subtype: 'Link', url: 'https://ok.test/', rect: [0, 0, 5, 5] },
      ],
      toViewport,
    );
    expect(boxes.map((b) => b.href)).toEqual(['https://ok.test/']);
  });
});
