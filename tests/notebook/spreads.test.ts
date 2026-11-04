import { describe, expect, it } from 'vitest';
import type { Project } from '../../src/content/projects';
import { spreadCount, spreadHtml, spreadLabel, stepSpread } from '../../src/notebook/spreads';

const project = (n: number, extra: Partial<Project> = {}): Project => ({
  slug: `p${n}`,
  title: `Project ${n}`,
  dates: `202${n}`,
  tags: ['three.js', `tag${n}`],
  links: [{ label: 'GitHub', href: `https://github.com/x/p${n}` }],
  order: n,
  summaryHtml: `<p>Summary ${n}</p>`,
  ...extra,
});

const PROJECTS = [
  project(1, { media: { kind: 'image', src: '/projects/p1.webp', alt: 'Shot of one' } }),
  project(2, { media: { kind: 'clip', src: '/projects/p2.mp4', alt: 'Clip of two' } }),
  project(3, { title: 'A <b> & "c"' }),
  project(4, {
    media: { kind: 'youtube', src: 'https://www.youtube-nocookie.com/embed/abc', alt: 'Trailer' },
  }),
  project(5, {
    media: { kind: 'gallery', srcs: ['/projects/a.webp', '/projects/b.webp'], alt: 'Screens' },
  }),
];

describe('spreadCount / stepSpread / spreadLabel', () => {
  it('has a contents spread plus one per project', () => {
    expect(spreadCount(PROJECTS)).toBe(6);
    expect(spreadCount([])).toBe(1);
  });

  it("can't page past the first or last spread", () => {
    expect(stepSpread(0, -1, 4)).toBe(0);
    expect(stepSpread(0, 1, 4)).toBe(1);
    expect(stepSpread(3, 1, 4)).toBe(3);
    expect(stepSpread(2, -1, 4)).toBe(1);
  });

  it('labels the contents and each project', () => {
    expect(spreadLabel(0, 4)).toBe('Contents');
    expect(spreadLabel(2, 4)).toBe('Project 2 of 3');
  });
});

describe('spreadHtml', () => {
  it('contents lists every project in order, each jumping to its spread', () => {
    const { left, right } = spreadHtml(PROJECTS, 0);
    expect(left).toBe('');
    expect(right).toContain('<h1 class="nb-heading">Projects</h1>');
    const targets = [...right.matchAll(/data-spread="(\d+)"/g)].map((m) => m[1]);
    expect(targets).toEqual(['1', '2', '3', '4', '5']);
    expect(right.indexOf('Project 1')).toBeLessThan(right.indexOf('Project 2'));
  });

  it('contents loads no media', () => {
    const { left, right } = spreadHtml(PROJECTS, 0);
    expect(left + right).not.toMatch(/\/projects\//);
  });

  it('a project spread: title, dates and image left; summary, tags and links right', () => {
    const { left, right } = spreadHtml(PROJECTS, 1);
    expect(left).toContain('Project 1');
    expect(left).toContain('2021');
    expect(left).toMatch(/<img [^>]*src="\/projects\/p1\.webp"[^>]*alt="Shot of one"/);
    expect(right).toContain('<p>Summary 1</p>');
    expect(right).toContain('three.js');
    expect(right).toMatch(/<a [^>]*href="https:\/\/github\.com\/x\/p1"[^>]*target="_blank"/);
  });

  it('puts the tags above the summary and a link icon in each link', () => {
    const { right } = spreadHtml(PROJECTS, 1);
    expect(right.indexOf('nb-tags')).toBeLessThan(right.indexOf('nb-summary'));
    expect(right).toMatch(/<a [^>]*class="nb-link"[^>]*><svg [^>]*aria-hidden="true"/);
  });

  it("only loads its own project's media", () => {
    const { left, right } = spreadHtml(PROJECTS, 1);
    expect(left + right).not.toContain('p2.mp4');
  });

  it('a clip is muted, loops and plays inline', () => {
    const { left } = spreadHtml(PROJECTS, 2);
    const video = /<video [^>]*>/.exec(left)?.[0] ?? '';
    expect(video).toContain('src="/projects/p2.mp4"');
    for (const attr of ['muted', 'loop', 'playsinline', 'autoplay']) expect(video).toContain(attr);
    expect(video).toContain('aria-label="Clip of two"');
  });

  it('a YouTube video is a titled, full-screen-capable player', () => {
    const { left } = spreadHtml(PROJECTS, 4);
    const frame = /<iframe [^>]*>/.exec(left)?.[0] ?? '';
    expect(frame).toContain('src="https://www.youtube-nocookie.com/embed/abc"');
    expect(frame).toContain('title="Trailer"');
    expect(frame).toContain('allowfullscreen');
  });

  it('a gallery is a labelled strip of numbered images with step buttons', () => {
    const { left } = spreadHtml(PROJECTS, 5);
    expect(left).toMatch(/class="nb-media nb-gallery" role="group" aria-label="Screens"/);
    const imgs = [...left.matchAll(/<img [^>]*>/g)].map((m) => m[0]);
    expect(imgs).toHaveLength(2);
    expect(imgs[0]).toContain('src="/projects/a.webp"');
    expect(imgs[0]).toContain('alt="Screens (1 of 2)"');
    expect(imgs[0]).not.toContain('loading="lazy"');
    expect(imgs[1]).toContain('alt="Screens (2 of 2)"');
    expect(imgs[1]).toContain('loading="lazy"');
    expect(left).toContain('data-gallery-step="-1"');
    expect(left).toContain('data-gallery-step="1"');
  });

  it('escapes titles and leaves media out when there is none', () => {
    const { left } = spreadHtml(PROJECTS, 3);
    expect(left).toContain('A &lt;b&gt; &amp; &quot;c&quot;');
    expect(left).not.toMatch(/<img|<video/);
  });

  it('clamps an out-of-range index', () => {
    expect(spreadHtml(PROJECTS, 9)).toEqual(spreadHtml(PROJECTS, 5));
  });
});
