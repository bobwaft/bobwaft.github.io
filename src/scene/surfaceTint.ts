// How much light reaches a printed surface (resume sheet, notebook pages), so the DOM content
// laid over the baked mesh darkens and warms with it. Mirrors the shader's light term in
// scene-lighting.js: sun*uDay + night*kNight*uNight + shelf*kShelf*uLight (MEMORY.md).
export interface SurfaceLightInputs {
  uDay: number;
  uNight: number;
  uLight: number;
}

export interface SurfaceTint {
  /** CSS brightness() factor, MIN_BRIGHTNESS..1. */
  brightness: number;
  /** CSS sepia() amount, 0..1: the lamp's warm cast. */
  warmth: number;
}

const K_NIGHT = 0.3;
const K_SHELF = 0.7;
const MIN_BRIGHTNESS = 0.3;
const MAX_WARMTH = 0.3;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function surfaceTint({ uDay, uNight, uLight }: SurfaceLightInputs): SurfaceTint {
  const day = clamp01(uDay);
  const night = clamp01(uNight);
  const lamp = clamp01(uLight);
  const light = clamp01(day + night * K_NIGHT + lamp * K_SHELF);
  return {
    brightness: MIN_BRIGHTNESS + (1 - MIN_BRIGHTNESS) * light,
    warmth: MAX_WARMTH * lamp * (1 - day * 0.5),
  };
}

/** Changes only when the tint visibly changes, so callers can skip redundant style writes. */
export function tintKey(t: SurfaceTint): string {
  return `${t.brightness.toFixed(3)}|${t.warmth.toFixed(3)}`;
}
