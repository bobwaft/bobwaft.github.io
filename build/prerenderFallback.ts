// Vite plugin: pre-renders about.md and the project files into <main id="fallback"> (A-14).
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { fallbackHtml } from '../src/content/fallback';
import { parseProject, sortProjects, type Project } from '../src/content/projects';
import { parseAbout } from '../src/content/render';

const START = '<!--fallback:start-->';
const END = '<!--fallback:end-->';

/** Puts `inner` between the markers; throws when either is missing. */
export function injectFallback(html: string, inner: string): string {
  const start = html.indexOf(START);
  if (start < 0) throw new Error(`index.html: missing ${START}`);
  const end = html.indexOf(END, start);
  if (end < 0) throw new Error(`index.html: missing ${END}`);
  return html.slice(0, start + START.length) + inner + html.slice(end);
}

function readProjects(dir: string): Project[] {
  const projects: Project[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    try {
      projects.push(parseProject(readFileSync(join(dir, file), 'utf8'), file.replace(/\.md$/, '')));
    } catch (err) {
      console.warn(`prerenderFallback: skipping ${file}:`, err);
    }
  }
  return sortProjects(projects);
}

export function prerenderFallback(): Plugin {
  let root = process.cwd();
  let base = '/';
  return {
    name: 'prerender-fallback',
    configResolved(config) {
      root = config.root;
      base = config.base;
    },
    transformIndexHtml(html) {
      const content = resolve(root, 'src/content');
      const about = parseAbout(readFileSync(join(content, 'about.md'), 'utf8'));
      const projects = readProjects(join(content, 'projects'));
      return injectFallback(html, fallbackHtml(about, projects, `${base}resume.pdf`));
    },
  };
}
