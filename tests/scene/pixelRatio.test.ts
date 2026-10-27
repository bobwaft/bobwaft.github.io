import { describe, expect, it } from 'vitest';
import { cappedPixelRatio } from '../../src/scene/pixelRatio';

describe('cappedPixelRatio', () => {
  it('passes through ratios at or below 2', () => {
    expect(cappedPixelRatio(1)).toBe(1);
    expect(cappedPixelRatio(1.5)).toBe(1.5);
    expect(cappedPixelRatio(2)).toBe(2);
  });

  it('caps higher ratios at 2', () => {
    expect(cappedPixelRatio(3)).toBe(2);
  });

  it('falls back to 1 for invalid values', () => {
    expect(cappedPixelRatio(0)).toBe(1);
    expect(cappedPixelRatio(NaN)).toBe(1);
    expect(cappedPixelRatio(-2)).toBe(1);
  });
});
