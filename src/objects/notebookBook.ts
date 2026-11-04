// Projects in the notebook (A-8, FR-17, FR-18): swings Notebook_Cover open and closed, and lays
// one HTML page over each side of the open spread. Spread 0 is the contents; the page markup
// comes from notebook/spreads.ts and is replaced per spread, so media loads only when shown.
import { Quaternion, Vector3, type Camera, type Mesh, type Object3D } from 'three';
import type { Project } from '../content/projects';
import { COVER_OPEN_ANGLE, createCoverAnimator, spreadFrames } from '../notebook/cover';
import { spreadCount, spreadHtml, stepSpread } from '../notebook/spreads';
import type { ScreenFrame } from '../scene/screenFrame';
import { createNotebookControls } from '../ui/notebookControls';
import { createScreenLayer } from '../ui/screenLayer';
import '@fontsource/patrick-hand/latin-400.css';
import '../ui/notebook.css';

/** CSS width of one page element (A5 portrait). */
export const PAGE_PX_WIDTH = 600;
/** The page turn's cross-fade: the old spread out while the next one comes in. */
const TURN_MS = 260;

export interface NotebookBook {
  /** Camera up for the focus view: along the spine, so the pages sit left and right. */
  up: Vector3;
  /** The open spread's corners, for framing the focus view. */
  points: Vector3[];
  open(done: () => void): void;
  close(done: () => void): void;
  setContentVisible(visible: boolean): void;
  update(dt: number): void;
  render(camera: Camera): void;
  setSize(width: number, height: number): void;
  dispose(): void;
}

function createPage(side: 'left' | 'right', frame: ScreenFrame) {
  const element = document.createElement('div');
  element.className = `nb-page nb-page-${side}`;
  const edge = side === 'left' ? 'prev' : 'next';
  const label = side === 'left' ? 'Previous page' : 'Next page';
  element.innerHTML =
    `<div class="nb-content"></div>` +
    `<button type="button" class="nb-edge nb-edge-${edge}" aria-label="${label}"></button>`;
  return {
    element,
    /** Replaced by a fresh element on each turn, while the old one fades out (turnTo). */
    content: element.querySelector<HTMLElement>('.nb-content')!,
    edge: element.querySelector<HTMLButtonElement>('.nb-edge')!,
    layer: createScreenLayer(element, frame, PAGE_PX_WIDTH),
  };
}

/**
 * @param cover Notebook_Cover, closed, hinged on its local X axis at the spine
 * @param band Notebook_Band, hidden while the cover is open (it crosses the cover's path)
 * @param viewer where the user sits; the spine's top points away from it
 * @param seconds duration of a full swing (0 = cut)
 */
export function createNotebookBook(
  cover: Mesh,
  band: Object3D | null,
  viewer: Vector3,
  projects: readonly Project[],
  seconds: () => number,
): NotebookBook {
  cover.updateWorldMatrix(true, false);
  cover.geometry.computeBoundingBox();
  const box = cover.geometry.boundingBox!;
  // The inside face is the cover's underside when closed.
  const face = { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z, y: box.min.y };
  const frames = spreadFrames(cover.matrixWorld, face, COVER_OPEN_ANGLE, viewer);
  const closed = cover.quaternion.clone();
  const hinge = new Quaternion();
  const xAxis = new Vector3(1, 0, 0);
  const animator = createCoverAnimator({
    openAngle: COVER_OPEN_ANGLE,
    seconds,
    onChange: (angle) =>
      cover.quaternion.copy(closed).multiply(hinge.setFromAxisAngle(xAxis, angle)),
  });

  const left = createPage('left', frames.left);
  const right = createPage('right', frames.right);
  const pages = [left, right];
  const count = spreadCount(projects);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0;
  let visible = false;

  const fill = () => {
    const html = spreadHtml(projects, index);
    left.content.innerHTML = html.left;
    right.content.innerHTML = html.right;
    for (const video of [left, right].flatMap((p) => [...p.content.querySelectorAll('video')])) {
      video.muted = true;
      void video.play().catch(() => {}); // autoplay may be refused; the first frame still shows
    }
  };
  /** Label and edge states follow the target spread at once, before its content swaps in. */
  const setNav = () => {
    left.edge.disabled = index === 0;
    right.edge.disabled = index === count - 1;
    controls.setSpread(index, count);
  };
  /** Ends a running cross-fade at once: the new spread shows fully, the old one goes. */
  const stopAnimations = () => {
    for (const p of pages) {
      for (const a of p.content.getAnimations()) a.cancel();
      for (const old of p.element.querySelectorAll('.nb-content-old')) old.remove();
    }
  };
  const turnTo = (target: number) => {
    const next = stepSpread(target, 0, count);
    if (!visible || next === index) return;
    index = next;
    setNav();
    stopAnimations();
    if (reducedMotion.matches) return fill();
    // Cross-fade: the old spread stays in its own element (media and gallery scroll as they
    // were) on top, fading out over the new one, and is removed when it's gone.
    const olds = pages.map((p) => {
      const old = p.content;
      p.content = old.cloneNode(false) as HTMLElement;
      old.before(p.content);
      old.classList.add('nb-content-old');
      old.inert = true;
      return old;
    });
    fill();
    const timing = { duration: TURN_MS, easing: 'ease-in-out' };
    pages.forEach((p, i) => {
      const opacity = getComputedStyle(olds[i]).opacity; // the graphite's own, below 1
      olds[i]
        .animate({ opacity: [opacity, '0'] }, timing)
        .finished.then(() => olds[i].remove())
        .catch(() => {}); // cancelled by a newer turn or by hiding, which remove it themselves
      p.content.animate({ opacity: ['0', opacity] }, timing);
    });
  };
  const controls = createNotebookControls((delta) => turnTo(index + delta));
  left.edge.addEventListener('click', () => turnTo(index - 1));
  right.edge.addEventListener('click', () => turnTo(index + 1));
  // On the pages, not their content elements: those are replaced on every turn.
  left.element.addEventListener('click', (e) => {
    const step = e.target instanceof Element ? e.target.closest('[data-gallery-step]') : null;
    const track = step?.parentElement?.querySelector('.nb-gallery-track');
    if (!step || !track) return;
    const dir = Number(step.getAttribute('data-gallery-step'));
    // Past either end, wrap around to the other.
    const atEnd = dir > 0 && track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
    const atStart = dir < 0 && track.scrollLeft <= 0;
    track.scrollTo({
      left: atEnd ? 0 : atStart ? track.scrollWidth : track.scrollLeft + dir * track.clientWidth,
      behavior: reducedMotion.matches ? 'auto' : 'smooth',
    });
  });
  right.element.addEventListener('click', (e) => {
    const entry = e.target instanceof Element ? e.target.closest('[data-spread]') : null;
    if (entry) turnTo(Number(entry.getAttribute('data-spread')));
  });

  return {
    up: frames.up,
    points: frames.points,
    open(done) {
      if (band) band.visible = false;
      animator.open(done);
    },
    close(done) {
      animator.close(() => {
        if (band) band.visible = true;
        done();
      });
    },
    setContentVisible(v) {
      visible = v;
      for (const p of pages) p.layer.setVisible(v);
      controls.setVisible(v);
      stopAnimations();
      index = 0; // every visit opens on the contents
      setNav();
      if (v) return fill();
      // Emptying the pages stops clips and drops media until the next visit.
      for (const p of pages) p.content.replaceChildren();
    },
    update: (dt) => animator.step(dt),
    render(camera) {
      for (const p of pages) p.layer.render(camera);
    },
    setSize(w, h) {
      for (const p of pages) p.layer.setSize(w, h);
    },
    dispose() {
      stopAnimations();
      controls.dispose();
      for (const p of pages) p.layer.dispose();
    },
  };
}
