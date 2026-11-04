import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');

describe('index.html', () => {
  it('has the title and description', () => {
    expect(html).toContain('<title>Donovan · Software developer</title>');
    expect(html).toMatch(/<meta\s+name="description"\s+content="Explore Donovan's desk in 3D/);
  });

  it('has Open Graph and Twitter tags', () => {
    for (const tag of [
      'og:title',
      'og:description',
      'og:type" content="website',
      'og:url" content="https://bobwaft.github.io/',
      'og:image" content="https://bobwaft.github.io/og-image.jpg',
      'og:image:width" content="1200',
      'og:image:height" content="630',
      'og:image:alt',
    ]) {
      expect(html).toContain(`property="${tag}`);
    }
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
  });

  it('puts the skip link first in the body and the prerender markers in #fallback', () => {
    expect(html).toMatch(/<body>\s*<a id="skip-3d" href="#fallback">Skip the 3D<\/a>/);
    expect(html).toMatch(
      /<main id="fallback" hidden>[\s\S]*<!--fallback:start-->[\s\S]*<!--fallback:end-->/,
    );
  });

  it('shows the fallback without JavaScript', () => {
    expect(html).toMatch(/<noscript>\s*<style>[\s\S]*#fallback[\s\S]*display:\s*block !important/);
  });
});
