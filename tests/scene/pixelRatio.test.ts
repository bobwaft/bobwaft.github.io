import { describe, expect, it } from 'vitest';
import { cappedPixelRatio, MAX_PIXEL_RATIO, pixelRatioOverride } from '../../src/scene/pixelRatio';

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

describe('pixelRatioOverride', () => {
  it('reads ?dpr= and clamps it to 0.5..MAX_PIXEL_RATIO', () => {
    expect(pixelRatioOverride('?dpr=1')).toBe(1);
    expect(pixelRatioOverride('?debug&dpr=0.75')).toBe(0.75);
    expect(pixelRatioOverride('?dpr=0.1')).toBe(0.5);
    expect(pixelRatioOverride('?dpr=4')).toBe(MAX_PIXEL_RATIO);
  });

  it('is null when absent or invalid', () => {
    expect(pixelRatioOverride('')).toBeNull();
    expect(pixelRatioOverride('?dpr=abc')).toBeNull();
    expect(pixelRatioOverride('?dpr=')).toBeNull();
  });
});
