// Notebook spreads (FR-17, FR-18): spread 0 is the contents, spread i is project i. Pure
// strings; a spread's media appears only in its own markup, so it loads when shown (lazy).
import type { Project } from '../content/projects';
import { escapeHtml as e } from '../content/render';

export interface SpreadHtml {
  left: string;
  right: string;
}

export function spreadCount(projects: readonly Project[]): number {
  return projects.length + 1;
}

/** The spread after moving by delta, kept within 0..count-1. */
export function stepSpread(index: number, delta: number, count: number): number {
  return Math.min(Math.max(0, count - 1), Math.max(0, index + delta));
}

export function spreadLabel(index: number, count: number): string {
  return index === 0 ? 'Contents' : `Project ${index} of ${count - 1}`;
}

function contents(projects: readonly Project[]): SpreadHtml {
  const entries = projects
    .map(
      (p, i) =>
        `<li><button type="button" class="nb-entry" data-spread="${i + 1}">` +
        `<span class="nb-entry-title">${e(p.title)}</span>` +
        `<span class="nb-entry-dates">${e(p.dates)}</span></button></li>`,
    )
    .join('');
  // All on the ruled right page; the left page (the cover's inside) stays blank.
  return {
    left: '',
    right:
      '<h1 class="nb-heading">Projects</h1>' +
      '<p class="nb-hint">Pick a project, or turn the page.</p>' +
      `<ol class="nb-contents">${entries}</ol>` +
      '<p class="nb-more">More projects coming soon!</p>',
  };
}

function media(p: Project): string {
  if (!p.media) return '';
  if (p.media.kind === 'gallery') return gallery(p.media.srcs, p.media.alt);
  const { kind, src, alt } = p.media;
  if (kind === 'image') {
    return `<img class="nb-media" src="${e(src)}" alt="${e(alt)}" decoding="async">`;
  }
  if (kind === 'youtube') {
    return (
      `<iframe class="nb-media nb-video" src="${e(src)}" title="${e(alt)}" ` +
      'allow="autoplay; encrypted-media; picture-in-picture; fullscreen" ' +
      'referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
    );
  }
  return (
    `<video class="nb-media" src="${e(src)}" aria-label="${e(alt)}" ` +
    'muted loop playsinline autoplay preload="auto"></video>'
  );
}

/** A strip that scrolls (and snaps) one image at a time; the ‹ › buttons step it (notebookBook). */
function gallery(srcs: readonly string[], alt: string): string {
  const images = srcs
    .map(
      (src, i) =>
        `<img src="${e(src)}" alt="${e(`${alt} (${i + 1} of ${srcs.length})`)}" ` +
        `decoding="async"${i > 0 ? ' loading="lazy"' : ''}>`,
    )
    .join('');
  return (
    `<div class="nb-media nb-gallery" role="group" aria-label="${e(alt)}">` +
    `<div class="nb-gallery-track" tabindex="0">${images}</div>` +
    '<button type="button" class="nb-gallery-step" data-gallery-step="-1" ' +
    'aria-label="Previous image">‹</button>' +
    '<button type="button" class="nb-gallery-step" data-gallery-step="1" ' +
    'aria-label="Next image">›</button></div>'
  );
}

/** Chain-link icon, drawn in the link's colour. */
const LINK_ICON =
  '<svg class="nb-link-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" ' +
  'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>' +
  '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

function projectSpread(p: Project): SpreadHtml {
  const tags = p.tags.map((t) => `<li>${e(t)}</li>`).join('');
  const links = p.links
    .map(
      (l) =>
        `<a class="nb-link" href="${e(l.href)}" target="_blank" rel="noopener noreferrer">` +
        `${LINK_ICON}${e(l.label)}</a>`,
    )
    .join('');
  return {
    left:
      `<h2 class="nb-title">${e(p.title)}</h2>` +
      `<p class="nb-dates">${e(p.dates)}</p>${media(p)}`,
    right:
      `<ul class="nb-tags" aria-label="Tags">${tags}</ul>` +
      `<div class="nb-summary">${p.summaryHtml}</div>` +
      (links ? `<nav class="nb-links" aria-label="Links">${links}</nav>` : ''),
  };
}

export function spreadHtml(projects: readonly Project[], index: number): SpreadHtml {
  const i = stepSpread(index, 0, spreadCount(projects));
  return i === 0 ? contents(projects) : projectSpread(projects[i - 1]);
}
