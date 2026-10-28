// How much light reaches a printed surface (resume sheet, notebook pages), so the DOM content
// laid over the baked mesh darkens and warms with it. Mirrors the shader's light term in
// scene-lighting.js: sun*uDay + night*kNight*uNight + shelf*kShelf*uLight (MEMORY.md).
export interface SurfaceLightInputs {
  uDay: number;
  uNight: number;
  uLight: number;
}

export interface SurfaceTint {
  /** CSS brightness() factor for the near-white CSS paper, MIN_BRIGHTNESS..1. */
  brightness: number;
  /** CSS sepia() amount, 0..1: the lamp's warm cast. */
  warmth: number;
}

const K_NIGHT = 0.3;
const K_SHELF = 0.7;
const MIN_BRIGHTNESS = 0.2;
const MAX_WARMTH = 0.3;

// BUG-009 calibration. The CSS layer is not tone-mapped and sits over a scene that is, so the
// filter must reproduce the *displayed* colour of the lit paper mesh, not its light level.
// Assumptions (tune by eye, no lightmap values are available here):
//  - the paper mesh's linear radiance at light = 1 is PAPER_RADIANCE (albedo ~0.8 times a
//    lightmap that lands below 1.0 indoors);
//  - AgX is approximated by a gentle shoulder, x * 0.8 / (1 + 0.15 x), then sRGB encoding, which
//    puts 0.18 at ~0.42 and 1.0 at ~0.85 like AgX does;
//  - the CSS paper (FOCUS_PAPER #f1ece0) displays at CSS_PAPER_LUMA, sRGB-encoded.
const PAPER_RADIANCE = 0.45;
const CSS_PAPER_LUMA = 0.93;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const srgbEncode = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
const agxApprox = (x: number) => srgbEncode((x * 0.8) / (1 + 0.15 * x));

export function surfaceTint({ uDay, uNight, uLight }: SurfaceLightInputs): SurfaceTint {
  const day = clamp01(uDay);
  const night = clamp01(uNight);
  const lamp = clamp01(uLight);
  const light = clamp01(day + night * K_NIGHT + lamp * K_SHELF);
  const displayed = agxApprox(PAPER_RADIANCE * light);
  return {
    brightness: Math.min(1, Math.max(MIN_BRIGHTNESS, displayed / CSS_PAPER_LUMA)),
    warmth: MAX_WARMTH * lamp * (1 - day * 0.5),
  };
}

/** Changes only when the tint visibly changes, so callers can skip redundant style writes. */
export function tintKey(t: SurfaceTint): string {
  return `${t.brightness.toFixed(3)}|${t.warmth.toFixed(3)}`;
}
