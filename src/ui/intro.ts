// Opening animation (owner, 2026-11-04): the site wakes up. Two eyelids part over a blurred
// scene while the camera, tilted down at the desk, pans up to the usual view. It plays once the
// visitor clicks "Click to start" and is not skippable. The timeline is
// pure (introFrame); createIntro drives the DOM and returns the camera pitch each frame.

/** Radians the camera starts below its level pose (negative pitch looks down). */
export const INTRO_START_PITCH = -0.32;
const START_BLUR_PX = 14;
const LID_FROM = 0.3;
const LID_TO = 1.3;
const BLUR_FROM = 0.3;
const BLUR_TO = 2.3;
const PAN_FROM = 1.0;
export const INTRO_SECONDS = 3.2;
/** Reduced motion: just a quick fade out of the dark. */
export const REDUCED_SECONDS = 0.5;

export interface IntroFrame {
  /** 0 = lids shut, 1 = fully open. */
  lidOpen: number;
  blurPx: number;
  /** Radians added to the camera pitch. */
  pitch: number;
  /** Opacity of the whole overlay; only reduced motion fades it. */
  veil: number;
  done: boolean;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
const easeOut = (p: number) => 1 - (1 - p) ** 3;
const span = (t: number, from: number, to: number) => clamp01((t - from) / (to - from));

export function introFrame(t: number, reduced: boolean): IntroFrame {
  if (reduced) {
    const p = span(t, 0, REDUCED_SECONDS);
    return { lidOpen: 0, blurPx: 0, pitch: 0, veil: 1 - easeInOut(p), done: p >= 1 };
  }
  const lid = easeInOut(span(t, LID_FROM, LID_TO));
  const blur = START_BLUR_PX * (1 - easeOut(span(t, BLUR_FROM, BLUR_TO)));
  const pan = easeInOut(span(t, PAN_FROM, INTRO_SECONDS));
  return {
    lidOpen: lid,
    blurPx: blur,
    pitch: INTRO_START_PITCH * (1 - pan) + 0, // + 0 turns -0 into 0
    veil: 1,
    done: t >= INTRO_SECONDS,
  };
}

export interface Intro {
  /** True until the animation has finished or been skipped. */
  readonly active: boolean;
  /** Advances the animation by dt seconds; returns the pitch to add to the camera. */
  update(dt: number): number;
  dispose(): void;
}

export interface IntroOptions {
  canvas: HTMLElement;
  reduced: boolean;
  onDone: () => void;
}

/** Shut lids over the scene, same colour as the loading screen so the hand-off has no seam. */
export function createIntro(opts: IntroOptions): Intro {
  const root = document.createElement('div');
  root.id = 'intro';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = '<div class="lid lid-top"></div><div class="lid lid-bottom"></div>';
  document.body.appendChild(root);
  const top = root.querySelector<HTMLElement>('.lid-top')!;
  const bottom = root.querySelector<HTMLElement>('.lid-bottom')!;

  let elapsed = 0;
  let active = true;

  const draw = (f: IntroFrame) => {
    // Each lid moves its own height plus the soft edge's reach (see #intro in index.html).
    top.style.transform = `translateY(calc(${-f.lidOpen * 100}% - ${f.lidOpen * 90}px))`;
    bottom.style.transform = `translateY(calc(${f.lidOpen * 100}% + ${f.lidOpen * 90}px))`;
    root.style.opacity = String(f.veil);
    opts.canvas.style.filter = f.blurPx > 0.2 ? `blur(${f.blurPx.toFixed(1)}px)` : '';
  };
  function finish(): void {
    if (!active) return;
    active = false;
    opts.canvas.style.filter = '';
    root.remove();
    opts.onDone();
  }
  draw(introFrame(0, opts.reduced));

  return {
    get active() {
      return active;
    },
    update(dt) {
      if (!active) return 0;
      elapsed += Math.max(0, dt);
      const f = introFrame(elapsed, opts.reduced);
      if (f.done) {
        finish();
        return 0;
      }
      draw(f);
      return f.pitch;
    },
    dispose() {
      if (active) {
        active = false;
        opts.canvas.style.filter = '';
        root.remove();
      }
    },
  };
}
