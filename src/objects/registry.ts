// Maps Blender Click_* names to object modules. The only place those names appear.
// The name -> module mapping arrives in Phase 3; for now this holds the required names.

export const MAIN_CAMERA_NAME = 'Cam_Main';

export const REQUIRED_CLICK_NAMES = [
  'Click_Laptop',
  'Click_Laptop_Screen',
  'Click_Papers',
  'Click_Notebook',
  'Click_Speaker',
  'Click_PullCord',
] as const;

/** Required Click_* names that are absent from presentNames (extra names are ignored). */
export function findMissingNames(presentNames: Iterable<string>): string[] {
  const present = new Set(presentNames);
  return REQUIRED_CLICK_NAMES.filter((name) => !present.has(name));
}
