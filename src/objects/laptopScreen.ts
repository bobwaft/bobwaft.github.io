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
import { aboutHtml, type AboutContent } from '../content/render';
import { screenFrame, uvTransform, type ScreenFrame } from '../scene/screenFrame';
import { createScreenLayer, type ScreenLayer } from '../ui/screenLayer';
import '../ui/about.css';

/** CSS width of the page; the screen fills most of the viewport when focused, so ~1:1. */
export const SCREEN_PX_WIDTH = 960;
/** Emissive strength of the idle preview; tune by eye against the room lighting. */
const PREVIEW_BRIGHTNESS = 0.9;
const ADDRESS = 'bobwaft.github.io/about';

/** The page element: thin browser bar over a scrollable page. */
export function createAboutElement(about: AboutContent): HTMLElement {
  const root = document.createElement('div');
  root.className = 'screen-page';
  root.innerHTML =
    `<div class="screen-bar" aria-hidden="true"><span></span><span></span><span></span>` +
    `<div class="screen-address">${ADDRESS}</div></div>` +
    `<div class="screen-scroll">${aboutHtml(about)}</div>`;
  return root;
}

function bodyParagraphs(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return [...doc.querySelectorAll('p')].map((p) => p.textContent?.trim() ?? '').filter(Boolean);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
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
  const w = SCREEN_PX_WIDTH;
  const font = 'system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillStyle = '#f6f4ef';
  ctx.fillRect(0, 0, w, canvas.height / k);
  // Browser bar.
  ctx.fillStyle = '#e3dfd6';
  ctx.fillRect(0, 0, w, 36);
  ['#e26d5a', '#e3b341', '#5fb35b'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(20 + i * 18, 18, 5.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#f6f4ef';
  ctx.beginPath();
  ctx.roundRect(w / 2 - 170, 8, 340, 20, 10);
  ctx.fill();
  ctx.fillStyle = '#77736b';
  ctx.font = `13px ${font}`;
  ctx.textAlign = 'center';
  ctx.fillText(ADDRESS, w / 2, 22);
  ctx.textAlign = 'left';
  // Header.
  const pad = 64;
  let x = pad;
  let y = 36 + 56;
  if (photo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + 48, y + 48, 48, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(photo, x, y, 96, 96);
    ctx.restore();
    x += 96 + 28;
  }
  ctx.fillStyle = '#1c1b19';
  ctx.font = `700 40px ${font}`;
  ctx.fillText(about.name, x, y + 38);
  ctx.fillStyle = '#4a4740';
  ctx.font = `20px ${font}`;
  if (about.headline) ctx.fillText(about.headline, x, y + 68);
  ctx.fillStyle = '#77736b';
  ctx.font = `16px ${font}`;
  ctx.fillText(about.location, x, y + (about.headline ? 94 : 68));
  // Contact links.
  y += 96 + 32;
  x = pad;
  ctx.font = `600 16px ${font}`;
  for (const label of ['Email', 'LinkedIn', 'GitHub']) {
    const bw = ctx.measureText(label).width + 36;
    ctx.fillStyle = '#244e7a';
    ctx.beginPath();
    ctx.roundRect(x, y, bw, 38, 19);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, x + 18, y + 25);
    x += bw + 12;
  }
  // Bio.
  y += 38 + 48;
  ctx.fillStyle = '#2b2925';
  ctx.font = `18px ${font}`;
  for (const para of bodyParagraphs(about.bodyHtml)) {
    for (const line of wrap(ctx, para, Math.min(640, w - pad * 2))) {
      ctx.fillText(line, pad, y);
      y += 29;
    }
    y += 16;
  }
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

/** Puts the preview on the screen's material. Returns a function that redraws it. */
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
  drawPreview(canvas, about, aspect, null);
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
  if (about.photo) {
    const img = new Image();
    img.onload = () => {
      drawPreview(canvas, about, aspect, img);
      texture.needsUpdate = true;
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
