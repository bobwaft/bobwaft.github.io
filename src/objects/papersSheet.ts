// Resume on the paper stack (A-15, D-11): page 1 on the top sheet in the idle view, and the
// current page as a sharp canvas plus pdf.js's selectable text layer in the focus view.
import {
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  MultiplyBlending,
  SRGBColorSpace,
  Vector2,
  Vector3,
  type BufferAttribute,
  type Camera,
  type Object3D,
} from 'three';
import { uvTransform } from '../scene/screenFrame';
import { createScreenLayer } from '../ui/screenLayer';
import { createResumeControls } from '../ui/resumeControls';
import { needsRender, renderWidth, stepPage } from '../resume/layout';
import { sheetFrame, topSheetTriangles } from '../resume/sheet';
import type { ResumeDocument } from '../resume/pdf';
import '../ui/resume.css';

/** CSS width of the page element: A4 at 96 dpi. */
export const PAGE_PX_WIDTH = 794;
/** Idle texture width; the sheet is small and oblique in the idle view. */
const IDLE_PX_WIDTH = 1024;
const RERENDER_DELAY_MS = 250;

export interface PapersSheet {
  /** Camera up for the focus view: the page's own up, so it reads upright. */
  up: Vector3;
  setContentVisible(visible: boolean): void;
  /** Loads pdf.js and the PDF, then draws page 1 on the sheet. Call once the scene is up. */
  load(): Promise<void>;
  render(camera: Camera): void;
  setSize(width: number, height: number): void;
  dispose(): void;
}

function meshTriangles(mesh: Mesh) {
  mesh.updateWorldMatrix(true, false);
  const pos = mesh.geometry.getAttribute('position') as BufferAttribute;
  const uv = mesh.geometry.getAttribute('uv') as BufferAttribute | undefined;
  const points: Vector3[] = [];
  const uvs: Vector2[] = [];
  for (let i = 0; i < pos.count; i++) {
    points.push(new Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
    if (uv) uvs.push(new Vector2().fromBufferAttribute(uv, i));
  }
  const index = mesh.geometry.index
    ? Array.from(mesh.geometry.index.array)
    : points.map((_, i) => i);
  return { points, uvs, index };
}

/** A copy of the top sheet's triangles that multiplies the page over the baked paper. */
function createOverlay(points: Vector3[], uvs: Vector2[], tris: number[]) {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(
      tris.flatMap((i) => points[i].toArray()),
      3,
    ),
  );
  geometry.setAttribute(
    'uv',
    new Float32BufferAttribute(
      tris.flatMap((i) => uvs[i].toArray()),
      2,
    ),
  );
  const material = new MeshBasicMaterial({
    blending: MultiplyBlending,
    premultipliedAlpha: true,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -4,
  });
  const overlay = new Mesh(geometry, material);
  overlay.name = 'Resume_Overlay';
  overlay.visible = false; // until page 1 is drawn
  overlay.raycast = () => {}; // clicks go to Click_Papers
  return overlay;
}

/**
 * Sets up the resume on the top sheet of Click_Papers. Null if the mesh has no up-facing sheet.
 * @param viewer where the user sits; the page's top points away from it
 */
export function createPapersSheet(
  mesh: Mesh,
  scene: Object3D,
  viewer: Vector3,
  pdfUrl: string,
): PapersSheet | null {
  const { points, uvs, index } = meshTriangles(mesh);
  const tris = topSheetTriangles(points, index);
  if (tris.length === 0 || uvs.length !== points.length) {
    console.warn('Papers: no top sheet with UVs found; resume not shown on the paper');
    return null;
  }
  const used = [...new Set(tris)];
  const sheetPoints = used.map((i) => points[i]);
  const mid = sheetPoints.reduce((s, p) => s.add(p), new Vector3()).divideScalar(used.length);
  const frame = sheetFrame(sheetPoints, mid.clone().sub(viewer).setY(0));

  const overlay = createOverlay(points, uvs, tris);
  scene.add(overlay);

  const element = document.createElement('div');
  element.className = 'resume-page';
  element.innerHTML =
    `<canvas class="resume-canvas"></canvas><div class="resume-text"></div>` +
    `<p class="resume-status">Loading resume…</p>`;
  const canvas = element.querySelector('canvas')!;
  const text = element.querySelector<HTMLElement>('.resume-text')!;
  const status = element.querySelector<HTMLElement>('.resume-status')!;
  const layer = createScreenLayer(element, frame, PAGE_PX_WIDTH);

  let doc: ResumeDocument | null = null;
  let texture: CanvasTexture | null = null;
  let visible = false;
  let page = 1;
  /** What the canvas and text layer show now. */
  let shown = { page: 0, width: 0 };
  /** The draw that is scheduled or running; null when none. */
  let pending: { page: number; width: number } | null = null;
  /** Bumped by every draw and by hiding; a draw only shows its result if it is still current. */
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const fail = (err: unknown) => {
    console.error('Resume failed to render', err);
    status.textContent = "The resume can't be shown here. Use Download PDF.";
    status.hidden = false;
  };

  /** Renders canvas and text offscreen, then swaps both in together. */
  const draw = async (target: { page: number; width: number }) => {
    if (!doc) return;
    const current = ++generation;
    try {
      const [bitmap, textLayer] = await Promise.all([
        doc.renderPage(target.page, target.width),
        shown.page === target.page ? null : doc.renderText(target.page, PAGE_PX_WIDTH),
      ]);
      if (current !== generation) return; // replaced by a newer draw, or hidden
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
      if (textLayer) text.replaceChildren(textLayer);
      shown = target;
    } catch (err) {
      if (current !== generation) return;
      shown = target; // don't retry every frame; the status points to Download PDF
      fail(err);
    } finally {
      if (pending === target) pending = null;
    }
  };
  const controls = createResumeControls(pdfUrl, (delta) => {
    page = stepPage(page, delta, doc?.numPages ?? 1);
    controls.setPage(page, doc?.numPages ?? 1); // render() draws the new page next frame
  });

  // Edges of the page's horizontal midline, for its on-screen width.
  const left = frame.center.clone().addScaledVector(frame.right, -frame.width / 2);
  const right = frame.center.clone().addScaledVector(frame.right, frame.width / 2);
  const a = new Vector3();
  const b = new Vector3();
  const onScreenWidth = (camera: Camera) => {
    a.copy(left).project(camera);
    b.copy(right).project(camera);
    return Math.hypot((b.x - a.x) * window.innerWidth, (b.y - a.y) * window.innerHeight) / 2;
  };

  return {
    up: frame.up.clone(),
    setContentVisible(v) {
      visible = v;
      layer.setVisible(v);
      controls.setVisible(v);
      if (v) return;
      clearTimeout(timer);
      pending = null;
      generation++; // drop any draw still in flight
      page = 1; // the idle sheet shows page 1, so the next visit starts there
      controls.setPage(page, doc?.numPages ?? 1);
      if (shown.page !== page) {
        // Don't flash the old page on the next visit.
        canvas.width = 0;
        text.replaceChildren();
        shown = { page: 0, width: 0 };
      }
    },
    async load() {
      try {
        const { openResume } = await import('../resume/pdf');
        doc = await openResume(pdfUrl);
        controls.setPage(page, doc.numPages);
        texture = new CanvasTexture(await doc.renderPage(1, IDLE_PX_WIDTH));
        texture.colorSpace = SRGBColorSpace;
        texture.anisotropy = 8;
        texture.matrixAutoUpdate = false;
        texture.matrix.copy(
          uvTransform(
            sheetPoints,
            used.map((i) => uvs[i]),
            frame,
          ),
        );
        const material = overlay.material as MeshBasicMaterial;
        material.map = texture;
        material.needsUpdate = true;
        overlay.visible = true;
        status.hidden = true;
      } catch (err) {
        fail(err);
      }
    },
    render(camera) {
      layer.render(camera);
      if (!visible || !doc) return;
      const width = renderWidth(onScreenWidth(camera), window.devicePixelRatio, PAGE_PX_WIDTH);
      if (!needsRender(shown, page, width)) return;
      if (pending?.page === page && pending.width === width) return; // already on its way
      const target = { page, width };
      pending = target;
      clearTimeout(timer);
      // A new page draws at once; a size change waits for resizing/zooming to settle.
      const delay = shown.page !== page ? 0 : RERENDER_DELAY_MS;
      timer = setTimeout(() => void draw(target), delay);
    },
    setSize: (w, h) => layer.setSize(w, h),
    dispose() {
      clearTimeout(timer);
      generation++;
      controls.dispose();
      layer.dispose();
      overlay.removeFromParent();
      overlay.geometry.dispose();
      overlay.material.dispose();
      texture?.dispose();
      doc?.destroy();
    },
  };
}
