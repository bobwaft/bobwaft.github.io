import { describe, expect, it } from 'vitest';
import { fallbackReason } from '../../src/ui/fallbackReason';

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
