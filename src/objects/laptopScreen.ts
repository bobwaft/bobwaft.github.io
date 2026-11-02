// Laptop screen content (D-16): the about page as live HTML for the focus view, and a canvas-drawn
// still of it on M_Screen for the idle view (FR-12).
import {
  CanvasTexture,
  SRGBColorSpace,
  Vector2,
  Vector3,
  type BufferAttribute,
  type Mesh,
  type MeshStandardMaterial,
} from 'three';
import { ARROW_PATH, ICONS, type IconName, type IconSpec } from '../content/aboutIcons';
import {
  ABOUT_HELLO,
  ABOUT_PHOTO_NOTE,
  aboutHtml,
  aboutSocials,
  titleRuns,
  type AboutContent,
} from '../content/render';
import { screenFrame, uvTransform, type ScreenFrame } from '../scene/screenFrame';
import { createScreenLayer, type ScreenLayer } from '../ui/screenLayer';
import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/fraunces/opsz-italic.css';
import '@fontsource-variable/dm-sans/opsz.css';
import '@fontsource/caveat/latin-500.css';
import '../ui/about.css';

/**
 * CSS width of the page, scaled onto the screen. A desktop-browser width so the two-column
 * design fits the 16:10 screen without scrolling; text shows a little smaller than 1:1.
 */
export const SCREEN_PX_WIDTH = 1200;
/** Black bezel around the page in CSS px; keep in step with .screen-page padding in about.css. */
export const BEZEL_PX = 12;
/** Emissive strength of the idle preview; tune by eye against the room lighting. */
const PREVIEW_BRIGHTNESS = 0.9;
const ADDRESS = 'bobwaft.github.io/about';
/** How long each word stays in the tag under the photo. */
const TAG_INTERVAL_MS = 2400;

// about.css values the still draws with.
const C = {
  espresso: '#2a1c15',
  mocha: '#6f4e3d',
  latte: '#c4a283',
  caramel: '#b8733d',
  cream: '#efe4d4',
  foam: '#f8f2e9',
};
const SERIF = '"Fraunces Variable", Georgia, serif';
const SANS = '"DM Sans Variable", system-ui, sans-serif';
const HAND = 'Caveat, cursive';
const BAR_H = 36;
const PAD_X = 40;
const PAD_Y = 56;
const GAP = 56;
const TITLE_SIZE = 60;
const BIO_SIZE = 18;
const BIO_LINE = BIO_SIZE * 1.625;
const PHOTO_MAX_W = 384;

/** The page element: thin browser bar over a scrollable page. */
export function createAboutElement(about: AboutContent): HTMLElement {
  const root = document.createElement('div');
  root.className = 'screen-page';
  root.innerHTML =
    `<div class="screen-inner">` +
    `<div class="screen-bar" aria-hidden="true"><span></span><span></span><span></span>` +
    `<div class="screen-address">${ADDRESS}</div></div>` +
    `<div class="screen-scroll">${aboutHtml(about)}</div></div>`;
  rotateTags(root, about.tags);
  return root;
}

/** Cycles the tag words, swapping in a fresh element so the enter animation replays. */
function rotateTags(root: HTMLElement, tags: string[]): void {
  let word = root.querySelector<HTMLElement>('.about-tag-word');
  const dots = [...root.querySelectorAll('.about-dots > span')];
  if (!word || tags.length < 2) return;
  let i = 0;
  setInterval(() => {
    if (!word || (root.checkVisibility && !root.checkVisibility())) return;
    i = (i + 1) % tags.length;
    const next = word.cloneNode() as HTMLElement;
    next.textContent = tags[i];
    word.replaceWith(next);
    word = next;
    dots.forEach((d, n) => d.classList.toggle('on', n === i));
  }, TAG_INTERVAL_MS);
}

interface Run {
  text: string;
  font: string;
  color: string;
}
interface Piece extends Run {
  x: number;
}

/** Word-wraps styled runs; a word glued to the previous one (e.g. "larp,") never breaks off. */
function wrapRuns(ctx: CanvasRenderingContext2D, runs: Run[], maxWidth: number): Piece[][] {
  const lines: Piece[][] = [[]];
  let x = 0;
  let afterSpace = true;
  for (const run of runs) {
    ctx.font = run.font;
    for (const tok of run.text.split(/(\s+)/)) {
      if (!tok) continue;
      const line = lines[lines.length - 1];
      if (/^\s/.test(tok)) {
        if (line.length) {
          line.push({ ...run, text: ' ', x });
          x += ctx.measureText(' ').width;
        }
        afterSpace = true;
        continue;
      }
      const w = ctx.measureText(tok).width;
      if (afterSpace && line.length && x + w > maxWidth) {
        while (line.length && line[line.length - 1].text === ' ') line.pop();
        lines.push([]);
        x = 0;
      }
      lines[lines.length - 1].push({ ...run, text: tok, x });
      x += w;
      afterSpace = false;
    }
  }
  return lines;
}

/** Baseline for text in this font centred in a line box, as CSS does. */
function baseline(ctx: CanvasRenderingContext2D, font: string, top: number, lineH: number): number {
  ctx.font = font;
  const m = ctx.measureText('Hg');
  const asc = m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent;
  const desc = m.fontBoundingBoxDescent ?? m.actualBoundingBoxDescent;
  return top + (lineH - (asc + desc)) / 2 + asc;
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: Piece[][],
  x: number,
  top: number,
  lineH: number,
): void {
  lines.forEach((line, n) => {
    for (const p of line) {
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, x + p.x, baseline(ctx, p.font, top + n * lineH, lineH));
    }
  });
}

/** The bio's paragraphs as runs: <strong> becomes the caramel accent. */
function bioRuns(html: string): Run[][] {
  const plain = `400 ${BIO_SIZE}px ${SANS}`;
  const bold = `600 ${BIO_SIZE}px ${SANS}`;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return [...doc.querySelectorAll('p')].map((p) =>
    [...p.childNodes].map((n) => {
      const text = (n.textContent ?? '').replace(/\s+/g, ' ');
      return n.nodeName === 'STRONG' || n.nodeName === 'B'
        ? { text, font: bold, color: C.caramel }
        : { text, font: plain, color: C.mocha };
    }),
  );
}

function drawIcon(
  ctx: CanvasRenderingContext2D,
  name: IconName,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  const icon: IconSpec = ICONS[name];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const d of icon.paths) {
    if (icon.stroke) {
      ctx.lineWidth = icon.stroke;
      ctx.stroke(new Path2D(d));
    } else ctx.fill(new Path2D(d));
  }
  for (const d of icon.dots ?? []) ctx.fill(new Path2D(d));
  ctx.restore();
}

/** Height of the title/bio/contact column; draws it when `draw` is set. */
function leftColumn(
  ctx: CanvasRenderingContext2D,
  about: AboutContent,
  x: number,
  top: number,
  width: number,
  draw: boolean,
): number {
  const runs = about.title ? titleRuns(about.title) : [{ text: about.name, style: 'plain' }];
  const title = runs.map((r) => ({
    text: r.text,
    font:
      r.style === 'accent'
        ? `italic 600 ${TITLE_SIZE}px ${SERIF}`
        : `${r.style === 'em' ? 'italic ' : ''}300 ${TITLE_SIZE}px ${SERIF}`,
    color: r.style === 'accent' ? C.caramel : C.espresso,
  }));
  const titleLineH = TITLE_SIZE * 1.1;
  const titleLines = wrapRuns(ctx, title, width);
  if (draw) drawLines(ctx, titleLines, x, top, titleLineH);
  let y = top + titleLines.length * titleLineH + 48;
  const blockTop = y;
  const textX = x + 25; // 1px rule + 24px padding
  const textW = Math.min(576, width) - 25;
  bioRuns(about.bodyHtml).forEach((para, n) => {
    if (n) y += 16;
    const lines = wrapRuns(ctx, para, textW);
    if (draw) drawLines(ctx, lines, textX, y, BIO_LINE);
    y += lines.length * BIO_LINE;
  });
  y += 40;
  const hello = `500 24px ${HAND}`;
  if (draw) {
    ctx.fillStyle = C.caramel;
    ctx.fillText(ABOUT_HELLO, textX, baseline(ctx, hello, y, 32));
  }
  y += 32 + 12;
  // Email pill: 1px border, 8px/16px padding, 16px icon, 10px gaps, 20px line.
  const label = `500 14px ${SANS}`;
  const addr = `400 14px ${SANS}`;
  const address = `· ${about.email}`;
  ctx.font = label;
  const labelW = ctx.measureText('Email').width;
  ctx.font = addr;
  const addrW = ctx.measureText(address).width;
  if (draw) {
    const pillW = 2 + 32 + 16 + 10 + labelW + 10 + addrW;
    ctx.beginPath();
    ctx.roundRect(textX + 0.5, y + 0.5, pillW - 1, 37, 19);
    ctx.fillStyle = 'rgba(248, 242, 233, 0.6)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(196, 162, 131, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    drawIcon(ctx, 'mail', textX + 17, y + 11, 16, C.caramel);
    const by = baseline(ctx, label, y + 9, 20);
    ctx.fillStyle = C.espresso;
    ctx.fillText('Email', textX + 17 + 16 + 10, by);
    ctx.font = addr;
    ctx.fillStyle = 'rgba(111, 78, 61, 0.6)';
    ctx.fillText(address, textX + 17 + 16 + 10 + labelW + 10, by);
  }
  y += 38 + 16;
  if (draw) {
    aboutSocials(about).forEach((s, n) =>
      drawIcon(ctx, s.icon, textX + n * (56 + 8) + 12, y + 12, 32, C.mocha),
    );
  }
  y += 56;
  if (draw) {
    ctx.fillStyle = 'rgba(196, 162, 131, 0.6)';
    ctx.fillRect(x, blockTop, 1, y - blockTop);
  }
  return y - top;
}

/** Height of the photo column; draws it when `draw` is set. */
function rightColumn(
  ctx: CanvasRenderingContext2D,
  about: AboutContent,
  x: number,
  top: number,
  width: number,
  photo: HTMLImageElement | null,
  draw: boolean,
): number {
  const w = Math.min(width, PHOTO_MAX_W);
  const fx = x + (width - w) / 2;
  const h = (w * 5) / 4;
  const r = w / 2;
  const tagH = 28 + 20;
  const height = about.tags.length ? h - 24 + tagH + 12 + 6 : h;
  if (!draw) return height;
  // Outer ring, then the arch with its gradient, photo and inset ring.
  ctx.beginPath();
  ctx.roundRect(fx - 15.5, top - 15.5, w + 31, h + 31, [r + 16, r + 16, 0, 0]);
  ctx.strokeStyle = 'rgba(196, 162, 131, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(fx, top, w, h, [r, r, 0, 0]);
  ctx.clip();
  const grad = ctx.createLinearGradient(0, top, 0, top + h);
  grad.addColorStop(0, C.cream);
  grad.addColorStop(1, 'rgba(196, 162, 131, 0.7)');
  ctx.fillStyle = grad;
  ctx.fillRect(fx, top, w, h);
  if (photo) {
    // object-fit: cover and object-position: top, in the lower 92%.
    const bh = h * 0.92;
    const s = Math.max(w / photo.naturalWidth, bh / photo.naturalHeight);
    const iw = photo.naturalWidth * s;
    ctx.drawImage(photo, fx + (w - iw) / 2, top + h - bh, iw, photo.naturalHeight * s);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.roundRect(fx + 0.5, top + 0.5, w - 1, h - 1, [r, r, 0, 0]);
  ctx.stroke();
  // Note, rotated 6deg about its centre; its box is 8px above and 16px right of the frame.
  const hand = `500 24px ${HAND}`;
  ctx.font = hand;
  const noteW = ctx.measureText(ABOUT_PHOTO_NOTE).width;
  ctx.save();
  ctx.translate(fx + w + 16 - noteW / 2, top - 8 + 16);
  ctx.rotate((6 * Math.PI) / 180);
  ctx.fillStyle = C.caramel;
  ctx.fillText(ABOUT_PHOTO_NOTE, -noteW / 2, baseline(ctx, hand, -16, 32));
  ctx.restore();
  if (!about.tags.length) return height;
  // Tag pill with the first word, its arrow, and the dots.
  const tagW = 144 + 56;
  const tx = fx + (w - tagW) / 2;
  const ty = top + h - 24;
  ctx.save();
  ctx.shadowColor = 'rgba(42, 28, 21, 0.6)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  ctx.beginPath();
  ctx.roundRect(tx, ty, tagW, tagH, tagH / 2);
  ctx.fillStyle = C.espresso;
  ctx.fill();
  ctx.restore();
  const word = `italic 400 20px ${SERIF}`;
  ctx.fillStyle = C.foam;
  ctx.textAlign = 'center';
  ctx.fillText(about.tags[0], tx + tagW / 2, baseline(ctx, word, ty + 10, 28));
  ctx.textAlign = 'left';
  // Arrow: a 96x112 box 8px right of the pill with its bottom at the pill's middle, rotated
  // -12deg about its centre; the 80x90 viewBox fits it at 1.2x, 2px down.
  ctx.save();
  ctx.translate(tx + tagW + 8 + 48, ty + tagH / 2 - 56);
  ctx.rotate((-12 * Math.PI) / 180);
  ctx.translate(-48, -56 + 2);
  ctx.scale(1.2, 1.2);
  const arrow = new Path2D(ARROW_PATH);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = C.foam;
  ctx.lineWidth = 8;
  ctx.stroke(arrow);
  ctx.strokeStyle = C.caramel;
  ctx.lineWidth = 3;
  ctx.stroke(arrow);
  ctx.restore();
  const n = about.tags.length;
  let dx = fx + (w - (20 + (n - 1) * 6 + (n - 1) * 6)) / 2;
  for (let i = 0; i < n; i++) {
    const dw = i === 0 ? 20 : 6;
    ctx.beginPath();
    ctx.roundRect(dx, ty + tagH + 12, dw, 6, 3);
    ctx.fillStyle = i === 0 ? C.mocha : C.latte;
    ctx.fill();
    dx += dw + 6;
  }
  return height;
}

/** Draws a still of the page at the same CSS layout scale as about.css. */
function drawPreview(
  canvas: HTMLCanvasElement,
  about: AboutContent,
  aspect: number,
  photo: HTMLImageElement | null,
): void {
  const k = canvas.width / SCREEN_PX_WIDTH; // canvas pixels per CSS pixel
  canvas.height = Math.round(canvas.width / aspect);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(k, k);
  // Black bezel (BUG-008): the page is drawn inside it, clipped to the inner area.
  const fullW = SCREEN_PX_WIDTH;
  const fullH = canvas.height / k;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, fullW, fullH);
  ctx.translate(BEZEL_PX, BEZEL_PX);
  const w = fullW - 2 * BEZEL_PX;
  const h = fullH - 2 * BEZEL_PX;
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  // Paper background: CSS circle gradients reach a share of the distance to the farthest corner.
  ctx.fillStyle = C.foam;
  ctx.fillRect(0, 0, w, h);
  for (const [cx, cy, reach, rgb, a] of [
    [0.12, 0.18, 0.4, '196, 162, 131', 0.18],
    [0.88, 0.82, 0.45, '184, 115, 61', 0.12],
  ] as const) {
    const px = cx * w;
    const py = cy * h;
    const far = Math.hypot(Math.max(px, w - px), Math.max(py, h - py));
    const g = ctx.createRadialGradient(px, py, 0, px, py, far * reach);
    g.addColorStop(0, `rgba(${rgb}, ${a})`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  // Browser bar.
  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 0, w, BAR_H);
  ['#e26d5a', '#e3b341', '#5fb35b'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(20 + i * 18, 18, 5.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = C.foam;
  ctx.beginPath();
  ctx.roundRect(w / 2 - 170, 8, 340, 20, 10);
  ctx.fill();
  ctx.fillStyle = C.mocha;
  ctx.font = `13px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText(ADDRESS, w / 2, 22);
  ctx.textAlign = 'left';
  // Page: grid columns 1.15fr 0.85fr, each centred vertically in the row.
  const inner = w - 2 * PAD_X;
  const hasPhoto = !!about.photo;
  const leftW = hasPhoto ? ((inner - GAP) * 1.15) / 2 : inner;
  const rightW = inner - GAP - leftW;
  const top = BAR_H + PAD_Y;
  const lh = leftColumn(ctx, about, PAD_X, 0, leftW, false);
  const rh = hasPhoto ? rightColumn(ctx, about, 0, 0, rightW, photo, false) : 0;
  const row = Math.max(lh, rh);
  leftColumn(ctx, about, PAD_X, top + (row - lh) / 2, leftW, true);
  if (hasPhoto) {
    rightColumn(ctx, about, PAD_X + leftW + GAP, top + (row - rh) / 2, rightW, photo, true);
  }
  drawCrt(ctx, w, h);
}

/** The about.css CRT overlay for the still: scanlines, faint glow, vignette. */
function drawCrt(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.07)';
  for (let sy = 0; sy < h; sy += 3) ctx.fillRect(0, sy, w, 1);
  const cx = w / 2;
  const cy = h / 2;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.55);
  glow.addColorStop(0, 'rgba(255, 244, 214, 0.06)');
  glow.addColorStop(1, 'rgba(255, 244, 214, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, h / w);
  const vig = ctx.createRadialGradient(0, 0, w * 0.35, 0, 0, w * 0.72);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(-cx, -cx, w, w);
  ctx.restore();
}

function screenUvs(mesh: Mesh): { points: Vector3[]; uvs: Vector2[] } {
  mesh.updateWorldMatrix(true, false);
  const pos = mesh.geometry.getAttribute('position') as BufferAttribute;
  const uv = mesh.geometry.getAttribute('uv') as BufferAttribute | undefined;
  const points: Vector3[] = [];
  const uvs: Vector2[] = [];
  for (let i = 0; i < pos.count; i++) {
    points.push(new Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
    if (uv) uvs.push(new Vector2().fromBufferAttribute(uv, i));
  }
  return { points, uvs };
}

/** Puts the preview on the screen's material and redraws it once the fonts and photo arrive. */
function applyPreview(
  mesh: Mesh,
  frame: ScreenFrame,
  about: AboutContent,
  points: Vector3[],
  uvs: Vector2[],
) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  const aspect = frame.width / frame.height;
  let photo: HTMLImageElement | null = null;
  drawPreview(canvas, about, aspect, photo);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  texture.matrixAutoUpdate = false;
  texture.matrix.copy(uvTransform(points, uvs, frame));
  const material = mesh.material as MeshStandardMaterial;
  material.color.set(0x000000);
  material.emissive.set(0xffffff);
  material.emissiveMap = texture;
  material.emissiveIntensity = PREVIEW_BRIGHTNESS;
  material.needsUpdate = true;
  const redraw = () => {
    drawPreview(canvas, about, aspect, photo);
    texture.needsUpdate = true;
  };
  const fonts = [
    `300 ${TITLE_SIZE}px ${SERIF}`,
    `italic 600 ${TITLE_SIZE}px ${SERIF}`,
    `${BIO_SIZE}px ${SANS}`,
    `500 24px ${HAND}`,
  ];
  Promise.all(fonts.map((f) => document.fonts.load(f)))
    .then(redraw)
    .catch(() => console.warn('About fonts failed to load; the preview keeps fallback fonts'));
  if (about.photo) {
    const img = new Image();
    img.onload = () => {
      photo = img;
      redraw();
    };
    img.onerror = () => console.warn(`About photo failed to load: ${about.photo}`);
    img.src = about.photo;
  }
}

/**
 * Sets up the laptop screen: preview texture now, HTML layer ready for the focus view.
 * @param viewer where the user sits, to pick the screen's front side
 */
export function createLaptopScreen(mesh: Mesh, viewer: Vector3, about: AboutContent): ScreenLayer {
  const { points, uvs } = screenUvs(mesh);
  const frame = screenFrame(points, viewer);
  if (uvs.length === points.length) applyPreview(mesh, frame, about, points, uvs);
  else console.warn('Laptop screen has no UVs; idle preview skipped');
  return createScreenLayer(createAboutElement(about), frame, SCREEN_PX_WIDTH);
}
