// Markdown + front matter -> view models and HTML (A-7). Pure strings, no DOM: the 3D views
// and the build-time fallback (A-14) both use it.
import { Marked, type Tokens } from 'marked';

export interface FrontMatter {
  data: Record<string, string>;
  body: string;
}

/** Splits a leading `---` block of flat `key: value` lines from the Markdown body. */
export function parseFrontMatter(source: string): FrontMatter {
  const text = source.replace(/\r\n?/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!match) return { data: {}, body: text };
  const data: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colon = trimmed.indexOf(':');
    if (colon < 1) continue;
    const value = trimmed.slice(colon + 1).trim();
    data[trimmed.slice(0, colon).trim()] = value.replace(/^(["'])(.*)\1$/, '$2');
  }
  return { data, body: text.slice(match[0].length) };
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Attributes that open a link in a new tab; mailto: and in-page links stay put. */
function targetAttrs(href: string): string {
  return /^https?:/i.test(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
}

const marked = new Marked({
  renderer: {
    link(this: { parser: { parseInline(t: Tokens.Generic[]): string } }, token: Tokens.Link) {
      const title = token.title ? ` title="${escapeHtml(token.title)}"` : '';
      const text = this.parser.parseInline(token.tokens);
      return `<a href="${escapeHtml(token.href)}"${title}${targetAttrs(token.href)}>${text}</a>`;
    },
  },
});

export function markdownToHtml(markdown: string): string {
  return marked.parse(markdown, { async: false });
}

export interface AboutContent {
  name: string;
  headline?: string;
  location: string;
  email: string;
  linkedin: string;
  github: string;
  /** Path under public/, e.g. /about/photo.webp. */
  photo?: string;
  bodyHtml: string;
}

const ABOUT_REQUIRED = ['name', 'location', 'email', 'linkedin', 'github'] as const;
/** Privacy rule (PRD 5.3): never published. */
const ABOUT_FORBIDDEN = ['phone', 'address'];

/** Parses about.md; throws naming the field when one is missing, forbidden, or malformed. */
export function parseAbout(source: string): AboutContent {
  const { data, body } = parseFrontMatter(source);
  for (const key of ABOUT_FORBIDDEN) {
    if (key in data) throw new Error(`about.md: "${key}" must not be published`);
  }
  for (const key of ABOUT_REQUIRED) {
    if (!data[key]) throw new Error(`about.md: missing required field "${key}"`);
  }
  for (const key of ['linkedin', 'github'] as const) {
    if (!/^https:\/\//.test(data[key])) throw new Error(`about.md: "${key}" must be an https URL`);
  }
  return {
    name: data.name,
    headline: data.headline || undefined,
    location: data.location,
    email: data.email,
    linkedin: data.linkedin,
    github: data.github,
    photo: data.photo || undefined,
    bodyHtml: markdownToHtml(body),
  };
}

/** The about page markup: header, contact links first (D-15), then the bio. */
export function aboutHtml(a: AboutContent): string {
  const e = escapeHtml;
  const link = (href: string, label: string) =>
    `<a class="about-link" href="${e(href)}"${targetAttrs(href)}>${label}</a>`;
  const photo = a.photo ? `<img src="${e(a.photo)}" alt="${e(a.name)}" class="about-photo">` : '';
  const headline = a.headline ? `<p class="about-headline">${e(a.headline)}</p>` : '';
  return [
    '<article class="about">',
    '<header class="about-header">',
    photo,
    '<div>',
    `<h1 class="about-name">${e(a.name)}</h1>`,
    headline,
    `<p class="about-location">${e(a.location)}</p>`,
    '</div>',
    '</header>',
    '<nav class="about-links" aria-label="Contact">',
    link(`mailto:${a.email}`, 'Email'),
    link(a.linkedin, 'LinkedIn'),
    link(a.github, 'GitHub'),
    '</nav>',
    `<div class="about-body">${a.bodyHtml}</div>`,
    '</article>',
  ].join('');
}
