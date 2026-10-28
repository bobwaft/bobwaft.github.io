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
];

describe('spreadCount / stepSpread / spreadLabel', () => {
  it('has a contents spread plus one per project', () => {
    expect(spreadCount(PROJECTS)).toBe(4);
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
    expect(left).toContain('Projects');
    const targets = [...right.matchAll(/data-spread="(\d+)"/g)].map((m) => m[1]);
    expect(targets).toEqual(['1', '2', '3']);
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

  it('escapes titles and leaves media out when there is none', () => {
    const { left } = spreadHtml(PROJECTS, 3);
    expect(left).toContain('A &lt;b&gt; &amp; &quot;c&quot;');
    expect(left).not.toMatch(/<img|<video/);
  });

  it('clamps an out-of-range index', () => {
    expect(spreadHtml(PROJECTS, 9)).toEqual(spreadHtml(PROJECTS, 3));
  });
});
