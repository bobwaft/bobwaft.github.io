import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fallbackHtml } from '../../src/content/fallback';
import { parseProject, type Project } from '../../src/content/projects';
import { parseAbout, type AboutContent } from '../../src/content/render';

const about: AboutContent = {
  name: 'Don <b>',
  location: 'Van & City',
  email: 'a@b.c',
  linkedin: 'https://linkedin.com/in/x',
  github: 'https://github.com/x',
  photo: '/about/p.png',
  photoAlt: 'Me "smiling"',
  tags: [],
  bodyHtml: '<p>Bio text</p>',
};

const project = (extra: Partial<Project> = {}): Project => ({
  slug: 'p',
  title: 'Proj <i>',
  dates: '2024 & 2025',
  tags: ['ts', 'a"b'],
  links: [{ label: 'Repo', href: 'https://github.com/x/p' }],
  order: 1,
  summaryHtml: '<p>Sum</p>',
  ...extra,
});

describe('fallbackHtml', () => {
  const html = fallbackHtml(about, [project()], '/resume.pdf');

  it('has the name as a focusable h1 with the location, escaped', () => {
    expect(html).toContain('<h1 class="fb-title" tabindex="-1">Don &lt;b&gt;</h1>');
    expect(html).toContain('Van &amp; City');
  });

  it('has bio, contact links and a lazy photo', () => {
    expect(html).toContain('<p>Bio text</p>');
    expect(html).toContain('href="mailto:a@b.c"');
    expect(html).toContain('href="https://github.com/x" target="_blank" rel="noopener noreferrer"');
    expect(html).toContain('aria-label="GitHub"');
    expect(html).toContain('<img class="fb-photo" src="/about/p.png" alt="Me &quot;smiling&quot;"');
    expect(html).toContain('loading="lazy" decoding="async"');
  });

  it('styles the title like the about page: *x* italic, **x** accent', () => {
    const titled = fallbackHtml({ ...about, title: 'Hi, **Don** *here*' }, [], '/r.pdf');
    expect(titled).toContain(
      '<h1 class="fb-title" tabindex="-1">Hi, <span class="fb-accent">Don</span> <span class="fb-em">here</span></h1>',
    );
  });

  it('links the resume for download', () => {
    expect(html).toMatch(
      /<a class="fb-pill" href="\/resume\.pdf" download>.*Download resume \(PDF\)<\/a>/,
    );
  });

  it('renders projects as escaped articles, then the coming-soon line', () => {
    expect(html).toContain('<article');
    expect(html).toContain('<h3>Proj &lt;i&gt;</h3>');
    expect(html).toContain('2024 &amp; 2025');
    expect(html).toContain('<li>a&quot;b</li>');
    expect(html).toContain('<p>Sum</p>');
    expect(html).toContain('>Repo</a>');
    expect(html.indexOf('</article>')).toBeLessThan(html.indexOf('More projects coming soon!'));
  });

  it('renders media by kind', () => {
    const f = (media: Project['media']) => fallbackHtml(about, [project({ media })], '/r.pdf');
    expect(f({ kind: 'image', src: '/projects/a.webp', alt: 'A' })).toContain(
      '<img src="/projects/a.webp" alt="A" loading="lazy"',
    );
    const gal = f({ kind: 'gallery', srcs: ['/projects/a.webp', '/projects/b.webp'], alt: 'G' });
    expect(gal).toContain('/projects/a.webp');
    expect(gal).not.toContain('/projects/b.webp');
    expect(f({ kind: 'clip', src: '/projects/c.mp4', alt: 'C' })).toContain(
      '<video src="/projects/c.mp4" aria-label="C" muted loop playsinline controls preload="none"',
    );
    const yt = f({ kind: 'youtube', src: 'https://www.youtube-nocookie.com/embed/abc', alt: 'Y' });
    expect(yt).not.toContain('<iframe');
    expect(yt).toContain('href="https://www.youtube-nocookie.com/embed/abc"');
    expect(yt).toContain('Watch the video');
  });

  it('never publishes a phone or address (real content)', () => {
    const real = parseAbout(readFileSync('src/content/about.md', 'utf8'));
    const out = fallbackHtml(real, [], '/resume.pdf').toLowerCase();
    expect(out).toContain('mailto:');
    expect(out).not.toMatch(/phone|address/);
  });

  it('renders the real projects', () => {
    const files = readdirSync('src/content/projects').filter((f) => f.endsWith('.md'));
    const real = files.map((f) =>
      parseProject(readFileSync(`src/content/projects/${f}`, 'utf8'), f.replace('.md', '')),
    );
    const out = fallbackHtml(about, real, '/r.pdf');
    for (const p of real) expect(out).toContain(`<h3>${p.title.replace(/&/g, '&amp;')}</h3>`);
  });
});
