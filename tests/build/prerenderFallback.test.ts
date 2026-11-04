import { describe, expect, it } from 'vitest';
import { injectFallback } from '../../build/prerenderFallback';

const page = '<main id="fallback" hidden><!--fallback:start-->old<!--fallback:end--></main>';

describe('injectFallback', () => {
  it('replaces the content between the markers and keeps them', () => {
    expect(injectFallback(page, '<h1>Hi</h1>')).toBe(
      '<main id="fallback" hidden><!--fallback:start--><h1>Hi</h1><!--fallback:end--></main>',
    );
  });

  it('inserts the content literally (no $ replacement patterns)', () => {
    expect(injectFallback(page, 'cost $& $1')).toContain('cost $& $1');
  });

  it('throws when a marker is missing', () => {
    expect(() => injectFallback('<main></main>', 'x')).toThrow(/fallback:start/);
    expect(() => injectFallback('<!--fallback:start-->', 'x')).toThrow(/fallback:end/);
  });
});
