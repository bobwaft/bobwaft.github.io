import { describe, expect, it } from 'vitest';
import { MEDIA_LIMITS, parseProject, sortProjects, type Project } from '../../src/content/projects';

// The project has no @types/node; these are the only node APIs the content check needs.
interface NodeFs {
  readdirSync(dir: string): string[];
  readFileSync(file: string, enc: 'utf8'): string;
  statSync(file: string): { size: number };
}
const nodeModule = (name: string): Promise<unknown> => import(/* @vite-ignore */ name);
const { readdirSync, readFileSync, statSync } = (await nodeModule('node:fs')) as NodeFs;
const root = (globalThis as unknown as { process: { cwd(): string } }).process.cwd();
const join = (...parts: string[]) => parts.join('/').replace(/\/\/+/g, '/');

const doc = (front: string, body = 'A summary.') => `---\n${front}\n---\n\n${body}\n`;
const BASE = ['title: Thing', 'dates: 2024 – 2025', 'tags: a, b', 'order: 2'].join('\n');

describe('parseProject', () => {
  it('parses a full project', () => {
    const p = parseProject(
      doc(
        `${BASE}\nlinks: Code=https://github.com/x/y, Demo=https://x.io/a=b\nmedia: /projects/t.webp\nalt: A picture`,
        'Some **bold** text.',
      ),
      'thing',
    );
    expect(p.slug).toBe('thing');
    expect(p.title).toBe('Thing');
    expect(p.dates).toBe('2024 – 2025');
    expect(p.tags).toEqual(['a', 'b']);
    expect(p.order).toBe(2);
    expect(p.links).toEqual([
      { label: 'Code', href: 'https://github.com/x/y' },
      { label: 'Demo', href: 'https://x.io/a=b' },
    ]);
    expect(p.media).toEqual({ kind: 'image', src: '/projects/t.webp', alt: 'A picture' });
    expect(p.summaryHtml).toContain('<strong>bold</strong>');
  });

  it('defaults links to empty and media to undefined', () => {
    const p = parseProject(doc(BASE), 'thing');
    expect(p.links).toEqual([]);
    expect(p.media).toBeUndefined();
  });

  it('maps mp4/webm to clips', () => {
    for (const ext of ['mp4', 'webm']) {
      const p = parseProject(doc(`${BASE}\nmedia: /projects/t.${ext}\nalt: x`), 't');
      expect(p.media?.kind).toBe('clip');
    }
  });

  it('makes a comma-separated list of images a gallery', () => {
    const p = parseProject(
      doc(`${BASE}
media: /projects/a.webp, /projects/b.webp
alt: Screens`),
      't',
    );
    expect(p.media).toEqual({
      kind: 'gallery',
      srcs: ['/projects/a.webp', '/projects/b.webp'],
      alt: 'Screens',
    });
  });

  it('maps YouTube links to a privacy-enhanced embed', () => {
    for (const url of [
      'https://www.youtube.com/embed/UNWZ7mEGopM?si=3KdFohELD--juklR',
      'https://www.youtube.com/watch?v=UNWZ7mEGopM&t=10',
      'https://youtu.be/UNWZ7mEGopM',
      'https://youtube.com/embed/UNWZ7mEGopM',
    ]) {
      const p = parseProject(doc(`${BASE}\nmedia: ${url}\nalt: Trailer`), 't');
      expect(p.media).toEqual({
        kind: 'youtube',
        src: 'https://www.youtube-nocookie.com/embed/UNWZ7mEGopM',
        alt: 'Trailer',
      });
    }
  });

  it.each([
    ['title', BASE.replace('title: Thing\n', ''), 'title'],
    ['dates', BASE.replace('dates: 2024 – 2025\n', ''), 'dates'],
    ['tags', BASE.replace('tags: a, b\n', ''), 'tags'],
    ['empty tags', BASE.replace('tags: a, b', 'tags: , ,'), 'tags'],
    ['order', BASE.replace('\norder: 2', ''), 'order'],
    ['zero order', BASE.replace('order: 2', 'order: 0'), 'order'],
    ['fractional order', BASE.replace('order: 2', 'order: 1.5'), 'order'],
    ['http link', `${BASE}\nlinks: A=http://x.io`, 'links'],
    ['link without label', `${BASE}\nlinks: https://x.io`, 'links'],
    ['bad media dir', `${BASE}\nmedia: /other/t.webp\nalt: x`, 'media'],
    ['bad media ext', `${BASE}\nmedia: /projects/t.png\nalt: x`, 'media'],
    [
      'clip in a gallery',
      `${BASE}
media: /projects/a.webp, /projects/b.mp4
alt: x`,
      'media',
    ],
    [
      'bad gallery dir',
      `${BASE}
media: /projects/a.webp, /b.webp
alt: x`,
      'media',
    ],
    [
      'gallery missing alt',
      `${BASE}
media: /projects/a.webp, /projects/b.webp`,
      'alt',
    ],
    ['missing alt', `${BASE}\nmedia: /projects/t.webp`, 'alt'],
    ['YouTube without id', `${BASE}\nmedia: https://www.youtube.com/watch?v=\nalt: x`, 'media'],
    ['other video host', `${BASE}\nmedia: https://vimeo.com/123\nalt: x`, 'media'],
    ['YouTube missing alt', `${BASE}\nmedia: https://youtu.be/UNWZ7mEGopM`, 'alt'],
    ['phone', `${BASE}\nphone: 555`, 'phone'],
    ['address', `${BASE}\naddress: 1 Main St`, 'address'],
  ])('throws naming the field: %s', (_name, front, field) => {
    expect(() => parseProject(doc(front), 'bad')).toThrow(new RegExp(`^bad\\.md: .*${field}`));
  });

  it('throws on an empty body', () => {
    expect(() => parseProject(doc(BASE, '  '), 'bad')).toThrow(/^bad\.md: .*body/);
  });
});

describe('sortProjects', () => {
  const mk = (title: string, order: number) => ({ title, order }) as Project;
  it('sorts by order then title without mutating', () => {
    const input = [mk('B', 2), mk('Z', 1), mk('A', 2)];
    const out = sortProjects(input);
    expect(out.map((p) => p.title)).toEqual(['Z', 'A', 'B']);
    expect(input.map((p) => p.title)).toEqual(['B', 'Z', 'A']);
    expect(out).not.toBe(input);
  });
});

describe('content check: src/content/projects/*.md', () => {
  const dir = join(root, 'src/content/projects');
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  const projects = files.map((f) =>
    parseProject(readFileSync(join(dir, f), 'utf8'), f.replace(/\.md$/, '')),
  );

  it('has 1-12 projects that all parse', () => {
    expect(projects.length).toBeGreaterThanOrEqual(1);
    expect(projects.length).toBeLessThanOrEqual(12);
  });

  it('has unique order values', () => {
    const orders = projects.map((p) => p.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('has media files that exist and are within size limits', () => {
    for (const p of projects) {
      if (!p.media || p.media.kind === 'youtube') continue;
      const kind = p.media.kind === 'gallery' ? 'image' : p.media.kind;
      for (const src of p.media.kind === 'gallery' ? p.media.srcs : [p.media.src]) {
        const size = statSync(join(root, 'public', src)).size;
        expect(size, `${p.slug} media ${src}`).toBeLessThanOrEqual(MEDIA_LIMITS[kind]);
      }
    }
  });
});
