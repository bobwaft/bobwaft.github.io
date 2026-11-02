// Icon and doodle paths for the about page (Mocha About Me design). Shared by the HTML in
// render.ts and the canvas still in laptopScreen.ts (via Path2D), so both draw the same shapes.

export interface IconSpec {
  /** Stroke width in viewBox units; absent means filled. */
  stroke?: number;
  paths: string[];
  /** Small filled shapes drawn on top of a stroked icon. */
  dots?: string[];
}

/** 24x24 viewBox. */
export const ICONS = {
  mail: {
    stroke: 1.6,
    paths: [
      'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
      'm4 7 8 6 8-6',
    ],
  },
  linkedin: {
    paths: [
      'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z',
    ],
  },
  github: {
    paths: [
      'M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3',
    ],
  },
  instagram: {
    stroke: 2,
    paths: [
      'M8 2.5h8a5.5 5.5 0 0 1 5.5 5.5v8a5.5 5.5 0 0 1-5.5 5.5H8A5.5 5.5 0 0 1 2.5 16V8A5.5 5.5 0 0 1 8 2.5z',
      'M16.2 12a4.2 4.2 0 1 1-8.4 0 4.2 4.2 0 1 1 8.4 0z',
    ],
    dots: ['M18.4 6.6a1 1 0 1 1-2 0 1 1 0 1 1 2 0z'],
  },
} satisfies Record<string, IconSpec>;

export type IconName = keyof typeof ICONS;

/** Hand-drawn arrow from the tag up toward the photo; 80x90 viewBox, stroke width 3. */
export const ARROW_PATH =
  'M4 74 C 30 84, 62 70, 58 50 C 55 34, 34 34, 40 48 C 46 60, 72 44, 62 22 C 58 14, 54 10, 46 6 M46 6 L 48 16 M46 6 L 56 8';

export function iconSvg(name: IconName, className: string): string {
  const icon: IconSpec = ICONS[name];
  const paint = icon.stroke
    ? `fill="none" stroke="currentColor" stroke-width="${icon.stroke}" stroke-linecap="round" stroke-linejoin="round"`
    : 'fill="currentColor"';
  const dots = (icon.dots ?? []).map((d) => `<path d="${d}" fill="currentColor" stroke="none"/>`);
  return (
    `<svg viewBox="0 0 24 24" class="${className}" ${paint} aria-hidden="true">` +
    icon.paths.map((d) => `<path d="${d}"/>`).join('') +
    dots.join('') +
    '</svg>'
  );
}
