// Project entries (Phase 7): front matter + Markdown summary -> view model. Pure strings, no DOM.
import { markdownToHtml, parseFrontMatter } from './render';

export interface ProjectLink {
  label: string;
  href: string;
}
export type ProjectMedia =
  | {
      /** youtube: src is a youtube-nocookie embed URL, not a file in public/. */
      kind: 'image' | 'clip' | 'youtube';
      src: string;
      alt: string;
    }
  /** Several images in a scrolling strip, from a comma-separated `media` list. */
  | { kind: 'gallery'; srcs: string[]; alt: string };
export interface Project {
  slug: string;
  title: string;
  dates: string;
  tags: string[];
  links: ProjectLink[];
  media?: ProjectMedia;
  order: number;
  summaryHtml: string;
}

/** Size budgets in bytes (IMPLEMENTATION.md Phase 7). */
export const MEDIA_LIMITS = { image: 300 * 1024, clip: 3 * 1024 * 1024 };

const REQUIRED = ['title', 'dates', 'tags', 'order'] as const;
/** The video id from a youtube.com/watch?v=, youtube.com/embed/ or youtu.be/ link. */
const YOUTUBE =
  /^https:\/\/(?:(?:www\.)?youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/)|youtu\.be\/)([\w-]{6,})/;
/** Privacy rule (PRD 5.3): never published. */
const FORBIDDEN = ['phone', 'address'];

/** Parses one project file; throws `${slug}.md: ...` naming the offending field. */
export function parseProject(source: string, slug: string): Project {
  const fail = (msg: string): never => {
    throw new Error(`${slug}.md: ${msg}`);
  };
  const { data, body } = parseFrontMatter(source);
  for (const key of FORBIDDEN) {
    if (key in data) fail(`"${key}" must not be published`);
  }
  for (const key of REQUIRED) {
    if (!data[key]) fail(`missing required field "${key}"`);
  }
  const tags = data.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  if (tags.length === 0) fail('"tags" needs at least one tag');
  if (!/^\d+$/.test(data.order) || Number(data.order) < 1) {
    fail('"order" must be an integer >= 1');
  }
  const links: ProjectLink[] = [];
  for (const part of (data.links ?? '').split(',')) {
    if (!part.trim()) continue;
    const eq = part.indexOf('=');
    const label = part.slice(0, eq).trim();
    const href = part.slice(eq + 1).trim();
    if (eq < 1 || !label || !/^https:\/\//.test(href)) {
      fail(`"links" entry "${part.trim()}" must be Label=https://url`);
    }
    links.push({ label, href });
  }
  let media: ProjectMedia | undefined;
  if (data.media && /^https?:\/\//.test(data.media)) {
    const id = YOUTUBE.exec(data.media)?.[1];
    if (!id) fail('"media" link must be a YouTube video (https://youtu.be/<id> or youtube.com)');
    if (!data.alt) fail('missing required field "alt" (needed when media is set)');
    // Privacy-enhanced mode: no YouTube cookies until the visitor plays the video.
    media = { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}`, alt: data.alt };
  } else if (data.media) {
    const srcs = data.media
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    const kinds = srcs.map((src) => {
      if (!src.startsWith('/projects/')) fail('"media" must start with /projects/');
      const ext = /\.([a-z0-9]+)$/i.exec(src)?.[1].toLowerCase();
      const kind = ext === 'webp' ? 'image' : ext === 'mp4' || ext === 'webm' ? 'clip' : undefined;
      if (!kind) fail('"media" must be .webp, .mp4 or .webm');
      return kind as 'image' | 'clip';
    });
    if (srcs.length > 1 && kinds.includes('clip'))
      fail('a "media" gallery must be all .webp images');
    if (!data.alt) fail('missing required field "alt" (needed when media is set)');
    media =
      srcs.length > 1
        ? { kind: 'gallery', srcs, alt: data.alt }
        : { kind: kinds[0], src: srcs[0], alt: data.alt };
  }
  if (!body.trim()) fail('body must not be empty');
  return {
    slug,
    title: data.title,
    dates: data.dates,
    tags,
    links,
    media,
    order: Number(data.order),
    summaryHtml: markdownToHtml(body),
  };
}

/** Order ascending, then title; returns a new array. */
export function sortProjects(projects: readonly Project[]): Project[] {
  return [...projects].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}
