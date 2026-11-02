// Markdown + front matter -> view models and HTML (A-7). Pure strings, no DOM: the 3D views
// and the build-time fallback (A-14) both use it.
import { Marked, type Tokens } from 'marked';
import { ARROW_PATH, iconSvg, type IconName } from './aboutIcons';

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
  /** Big serif line at the top; *word* is italic, **word** is the caramel accent. */
  title?: string;
  location: string;
  email: string;
  linkedin: string;
  github: string;
  instagram?: string;
  /** Path under public/, e.g. /about/photo.webp. */
  photo?: string;
  /** Alt text for the photo; defaults to the name. */
  photoAlt?: string;
  /** Words that rotate in the tag under the photo. */
  tags: string[];
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
  for (const key of ['linkedin', 'github', 'instagram'] as const) {
    if (data[key] && !/^https:\/\//.test(data[key])) {
      throw new Error(`about.md: "${key}" must be an https URL`);
    }
  }
  return {
    name: data.name,
    title: data.title || undefined,
    location: data.location,
    email: data.email,
    linkedin: data.linkedin,
    github: data.github,
    instagram: data.instagram || undefined,
    photo: data.photo || undefined,
    photoAlt: data.photoAlt || undefined,
    tags: (data.tags ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    bodyHtml: markdownToHtml(body),
  };
}

export interface TitleRun {
  text: string;
  style: 'plain' | 'em' | 'accent';
}

/** Splits the title into runs: *x* is italic, **x** is the accent. Nothing else is Markdown. */
export function titleRuns(title: string): TitleRun[] {
  const runs: TitleRun[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  for (let m = re.exec(title); m; m = re.exec(title)) {
    if (m.index > last) runs.push({ text: title.slice(last, m.index), style: 'plain' });
    runs.push(m[1] ? { text: m[1], style: 'accent' } : { text: m[2], style: 'em' });
    last = re.lastIndex;
  }
  if (last < title.length) runs.push({ text: title.slice(last), style: 'plain' });
  return runs;
}

/** Social profiles in display order, skipping any not set. */
export function aboutSocials(a: AboutContent): { label: string; icon: IconName; href: string }[] {
  const all = [
    { label: 'LinkedIn', icon: 'linkedin' as const, href: a.linkedin },
    { label: 'GitHub', icon: 'github' as const, href: a.github },
    { label: 'Instagram', icon: 'instagram' as const, href: a.instagram },
  ];
  return all.filter((s): s is typeof s & { href: string } => !!s.href);
}

export const ABOUT_HELLO = 'Come say hello —';
export const ABOUT_PHOTO_NOTE = "hi, it's me!";

/** The about page markup (Mocha About Me design): title, bio, contact links; photo and tag. */
export function aboutHtml(a: AboutContent): string {
  const e = escapeHtml;
  const title = a.title
    ? titleRuns(a.title)
        .map((r) =>
          r.style === 'plain' ? e(r.text) : `<span class="about-${r.style}">${e(r.text)}</span>`,
        )
        .join('')
    : e(a.name);
  const socials = aboutSocials(a)
    .map(
      (s) =>
        `<li><a class="about-social" href="${e(s.href)}"${targetAttrs(s.href)} aria-label="${s.label}" title="${s.label}">` +
        `${iconSvg(s.icon, 'about-social-icon')}</a></li>`,
    )
    .join('');
  const tag = a.tags.length
    ? [
        '<div class="about-tag-wrap">',
        '<div class="about-tag">',
        `<span class="about-tag-window" aria-live="polite"><span class="about-tag-word">${e(a.tags[0])}</span></span>`,
        `<svg class="about-arrow" viewBox="0 0 80 90" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">`,
        `<path class="about-arrow-halo" d="${ARROW_PATH}" stroke-width="8"/><path d="${ARROW_PATH}"/></svg>`,
        '</div>',
        '<div class="about-dots" aria-hidden="true">',
        a.tags.map((_, i) => `<span${i === 0 ? ' class="on"' : ''}></span>`).join(''),
        '</div>',
        '</div>',
      ].join('')
    : '';
  const portrait = a.photo
    ? [
        '<div class="about-portrait">',
        '<div class="about-frame">',
        '<div class="about-ring" aria-hidden="true"></div>',
        '<div class="about-arch">',
        `<img src="${e(a.photo)}" alt="${e(a.photoAlt ?? a.name)}" class="about-photo">`,
        '</div>',
        `<span class="about-note" aria-hidden="true">${e(ABOUT_PHOTO_NOTE)}</span>`,
        '</div>',
        tag,
        '</div>',
      ].join('')
    : '';
  return [
    `<article class="about${portrait ? ' about-has-photo' : ''}">`,
    '<div class="about-main">',
    `<h1 class="about-title">${title}</h1>`,
    '<div class="about-text">',
    `<div class="about-body">${a.bodyHtml}</div>`,
    '<div class="about-contact">',
    `<p class="about-hello">${e(ABOUT_HELLO)}</p>`,
    '<nav class="about-links" aria-label="Contact">',
    `<a class="about-email" href="mailto:${e(a.email)}">`,
    iconSvg('mail', 'about-email-icon'),
    `<span class="about-email-label">Email</span><span class="about-email-address">· ${e(a.email)}</span></a>`,
    `<ul class="about-socials">${socials}</ul>`,
    '</nav>',
    '</div>',
    '</div>',
    '</div>',
    portrait,
    '</article>',
  ].join('');
}
