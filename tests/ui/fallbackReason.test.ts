import { describe, expect, it } from 'vitest';
import { fallbackReason, offersRetry3d, retryOffer } from '../../src/ui/fallbackReason';

describe('fallbackReason', () => {
  it('is null when WebGL2 works and nothing failed', () => {
    expect(fallbackReason(true)).toBeNull();
  });

  it('reports missing WebGL2', () => {
    expect(fallbackReason(false)).toBe('no-webgl2');
  });

  it('reports a load failure', () => {
    expect(fallbackReason(true, new Error('404'))).toBe('load-failed');
  });

  it('prefers missing WebGL2 over a load error', () => {
    expect(fallbackReason(false, new Error('x'))).toBe('no-webgl2');
  });
});

describe('offersRetry3d', () => {
  it('is offered for automatic fallbacks only', () => {
    expect(offersRetry3d('slow')).toBe(true);
    expect(offersRetry3d('load-failed')).toBe(true);
    expect(offersRetry3d('no-webgl2')).toBe(false);
  });
});

describe('retryOffer', () => {
  it('offers a forced 3D retry after an automatic fallback', () => {
    expect(retryOffer('slow')).toEqual({ label: 'Try 3D anyway', force3d: true });
    expect(retryOffer('load-failed')).toEqual({ label: 'Try 3D anyway', force3d: true });
  });

  it('offers a plain way back after the visitor skipped the 3D', () => {
    expect(retryOffer('skipped')).toEqual({ label: 'Back to the 3D', force3d: false });
  });

  it('offers nothing without WebGL2', () => {
    expect(retryOffer('no-webgl2')).toBeNull();
  });
});
