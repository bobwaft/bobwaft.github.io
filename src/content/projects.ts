// Project entries (Phase 7): front matter + Markdown summary -> view model. Pure strings, no DOM.
import { markdownToHtml, parseFrontMatter } from './render';

export interface ProjectLink {
  label: string;
  href: string;
}
export interface ProjectMedia {
  kind: 'image' | 'clip';
  src: string;
  alt: string;
}
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
  if (data.media) {
    const src = data.media;
    if (!src.startsWith('/projects/')) fail('"media" must start with /projects/');
    const ext = /\.([a-z0-9]+)$/i.exec(src)?.[1].toLowerCase();
    const kind = ext === 'webp' ? 'image' : ext === 'mp4' || ext === 'webm' ? 'clip' : undefined;
    if (!kind) fail('"media" must be .webp, .mp4 or .webm');
    if (!data.alt) fail('missing required field "alt" (needed when media is set)');
    media = { kind: kind as ProjectMedia['kind'], src, alt: data.alt };
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
