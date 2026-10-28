import { describe, expect, it } from 'vitest';
import { keyDelta, pageLabel, renderWidth, stepPage } from '../../src/resume/layout';

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
