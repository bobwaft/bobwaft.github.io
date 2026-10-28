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
  return {
    left:
      '<h1 class="nb-heading">Projects</h1>' +
      '<p class="nb-hint">Pick a project, or turn the page.</p>',
    right: `<ol class="nb-contents">${entries}</ol>`,
  };
}

function media(p: Project): string {
  if (!p.media) return '';
  const { kind, src, alt } = p.media;
  if (kind === 'image') {
    return `<img class="nb-media" src="${e(src)}" alt="${e(alt)}" decoding="async">`;
  }
  return (
    `<video class="nb-media" src="${e(src)}" aria-label="${e(alt)}" ` +
    'muted loop playsinline autoplay preload="auto"></video>'
  );
}

function projectSpread(p: Project): SpreadHtml {
  const tags = p.tags.map((t) => `<li>${e(t)}</li>`).join('');
  const links = p.links
    .map(
      (l) =>
        `<a class="nb-link" href="${e(l.href)}" target="_blank" rel="noopener noreferrer">` +
        `${e(l.label)}</a>`,
    )
    .join('');
  return {
    left:
      `<h2 class="nb-title">${e(p.title)}</h2>` +
      `<p class="nb-dates">${e(p.dates)}</p>${media(p)}`,
    right:
      `<div class="nb-summary screen-scroll">${p.summaryHtml}</div>` +
      `<ul class="nb-tags" aria-label="Tags">${tags}</ul>` +
      (links ? `<nav class="nb-links" aria-label="Links">${links}</nav>` : ''),
  };
}

export function spreadHtml(projects: readonly Project[], index: number): SpreadHtml {
  const i = stepSpread(index, 0, spreadCount(projects));
  return i === 0 ? contents(projects) : projectSpread(projects[i - 1]);
}
