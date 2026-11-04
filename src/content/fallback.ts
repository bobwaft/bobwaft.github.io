// The pre-rendered simple site (A-14, NFR-4): the inner HTML of <main id="fallback">, built at
// bundle time from about.md and the project files. Pure strings, no DOM, no scripts.
import type { Project, ProjectMedia } from './projects';
import { iconSvg } from './aboutIcons';
import {
  ABOUT_HELLO,
  ABOUT_PHOTO_NOTE,
  aboutSocials,
  escapeHtml as e,
  titleRuns,
  type AboutContent,
} from './render';

const EXTERNAL = ' target="_blank" rel="noopener noreferrer"';
const external = (href: string) => (/^https?:/i.test(href) ? EXTERNAL : '');

function media(m: ProjectMedia | undefined): string {
  if (!m) return '';
  if (m.kind === 'gallery') {
    return `<img src="${e(m.srcs[0])}" alt="${e(m.alt)}" loading="lazy" decoding="async">`;
  }
  if (m.kind === 'image') {
    return `<img src="${e(m.src)}" alt="${e(m.alt)}" loading="lazy" decoding="async">`;
  }
  if (m.kind === 'clip') {
    return (
      `<video src="${e(m.src)}" aria-label="${e(m.alt)}" muted loop playsinline controls ` +
      'preload="none"></video>'
    );
  }
  // A plain link, not an iframe: the embed would cost the page load.
  return `<p><a href="${e(m.src)}"${EXTERNAL}>Watch the video<span> (${e(m.alt)})</span></a></p>`;
}

function article(p: Project): string {
  const tags = p.tags.map((t) => `<li>${e(t)}</li>`).join('');
  const links = p.links
    .map((l) => `<li><a href="${e(l.href)}"${external(l.href)}>${e(l.label)}</a></li>`)
    .join('');
  return (
    '<article class="fb-card">' +
    `<h3>${e(p.title)}</h3><p class="dates">${e(p.dates)}</p>` +
    `<ul class="tags" aria-label="Tags">${tags}</ul>` +
    media(p.media) +
    p.summaryHtml +
    (links ? `<ul class="links" aria-label="Links">${links}</ul>` : '') +
    '</article>'
  );
}

/** The title as on the about page: *x* italic, **x** in the caramel accent. */
function title(about: AboutContent): string {
  if (!about.title) return e(about.name);
  return titleRuns(about.title)
    .map((r) =>
      r.style === 'plain' ? e(r.text) : `<span class="fb-${r.style}">${e(r.text)}</span>`,
    )
    .join('');
}

/** Styled after the about page (Mocha About Me): hero with title, bio, contacts and photo arch. */
export function fallbackHtml(
  about: AboutContent,
  projects: readonly Project[],
  resumeHref: string,
): string {
  const socials = aboutSocials(about)
    .map(
      (s) =>
        `<li><a class="fb-social" href="${e(s.href)}"${external(s.href)} aria-label="${s.label}" ` +
        `title="${s.label}">${iconSvg(s.icon, 'fb-icon')}</a></li>`,
    )
    .join('');
  const portrait = about.photo
    ? '<div class="fb-portrait"><div class="fb-ring" aria-hidden="true"></div><div class="fb-arch">' +
      `<img class="fb-photo" src="${e(about.photo)}" alt="${e(about.photoAlt ?? about.name)}" ` +
      'loading="lazy" decoding="async"></div>' +
      `<span class="fb-note" aria-hidden="true">${e(ABOUT_PHOTO_NOTE)}</span></div>`
    : '';
  return [
    '<header class="fb-hero"><div class="fb-intro">',
    `<h1 class="fb-title" tabindex="-1">${title(about)}</h1>`,
    `<p class="fb-location">${e(about.location)}</p>`,
    `<div class="fb-text">${about.bodyHtml}`,
    `<p class="fb-hello">${e(ABOUT_HELLO)}</p>`,
    '<nav class="fb-contact" aria-label="Contact">',
    `<a class="fb-pill" href="mailto:${e(about.email)}">${iconSvg('mail', 'fb-icon')}`,
    `<span class="fb-pill-label">Email</span><span class="fb-pill-detail">· ${e(about.email)}</span></a>`,
    `<a class="fb-pill" href="${e(resumeHref)}" download>Download resume (PDF)</a>`,
    `<ul class="fb-socials">${socials}</ul></nav></div></div>`,
    portrait,
    '</header>',
    '<section class="fb-projects" aria-labelledby="fb-projects">',
    '<h2 id="fb-projects">Projects</h2>',
    projects.map(article).join(''),
    '<p class="fb-more">More projects coming soon!</p></section>',
  ].join('');
}
