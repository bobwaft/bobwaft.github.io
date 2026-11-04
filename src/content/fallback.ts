// The pre-rendered simple site (A-14, NFR-4): the inner HTML of <main id="fallback">, built at
// bundle time from about.md and the project files. Pure strings, no DOM, no scripts.
import type { Project, ProjectMedia } from './projects';
import { aboutSocials, escapeHtml as e, type AboutContent } from './render';

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
    '<article>' +
    `<h3>${e(p.title)}</h3><p class="dates">${e(p.dates)}</p>` +
    `<ul class="tags" aria-label="Tags">${tags}</ul>` +
    media(p.media) +
    p.summaryHtml +
    (links ? `<ul class="links" aria-label="Links">${links}</ul>` : '') +
    '</article>'
  );
}

export function fallbackHtml(
  about: AboutContent,
  projects: readonly Project[],
  resumeHref: string,
): string {
  const socials = aboutSocials(about)
    .map((s) => `<li><a href="${e(s.href)}"${external(s.href)}>${s.label}</a></li>`)
    .join('');
  const photo = about.photo
    ? `<img class="photo" src="${e(about.photo)}" alt="${e(about.photoAlt ?? about.name)}" ` +
      'loading="lazy" decoding="async">'
    : '';
  return [
    `<header><h1 tabindex="-1">${e(about.name)}</h1><p>${e(about.location)}</p></header>`,
    `<section aria-labelledby="fb-about"><h2 id="fb-about">About</h2>${photo}${about.bodyHtml}</section>`,
    '<section aria-labelledby="fb-contact"><h2 id="fb-contact">Contact</h2><ul>',
    `<li><a href="mailto:${e(about.email)}">${e(about.email)}</a></li>${socials}</ul></section>`,
    '<section aria-labelledby="fb-resume"><h2 id="fb-resume">Resume</h2>',
    `<p><a href="${e(resumeHref)}" download>Download resume (PDF)</a></p></section>`,
    '<section aria-labelledby="fb-projects"><h2 id="fb-projects">Projects</h2>',
    projects.map(article).join(''),
    '<p>More projects coming soon!</p></section>',
  ].join('');
}
