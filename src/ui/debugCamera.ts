import { Vector3, type PerspectiveCamera } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { isDebug } from './fpsCalc';

type Vec3Like = readonly [number, number, number];

const f3 = (n: number) => {
  const s = n.toFixed(3);
  return s === '-0.000' ? '0.000' : s;
};
const fmt = (v: Vec3Like) => `[${f3(v[0])}, ${f3(v[1])}, ${f3(v[2])}]`;

/** Pasteable `position: [x, y, z], target: [x, y, z]` string, 3 decimals. */
export function formatPoseReadout(position: Vec3Like, target: Vec3Like): string {
  return `position: ${fmt(position)}, target: ${fmt(target)}`;
}

export interface DebugCamera {
  /** Per-frame: applies orbit damping and refreshes the readout. */
  update(): void;
  dispose(): void;
}

/** Free-orbit camera plus pose readout overlay, or null unless `?debug` is set. */
const ORBIT_TARGET_DISTANCE = 0.7;

export function createDebugCamera(
  camera: PerspectiveCamera,
  canvas: HTMLCanvasElement,
  extraInfo: () => string,
): DebugCamera | null {
  if (!isDebug(window.location.search)) return null;
  const controls = new OrbitControls(camera, canvas);
  // Pivot roughly at the desk (~0.7 m ahead) rather than just in front of the eye.
  controls.target
    .copy(camera.position)
    .add(camera.getWorldDirection(new Vector3()).multiplyScalar(ORBIT_TARGET_DISTANCE));
  controls.update();

  const el = document.createElement('div');
  el.id = 'debug-camera';
  el.style.cssText =
    'position:fixed;top:28px;left:8px;padding:2px 6px;background:rgba(0,0,0,.6);' +
    'color:#9f9;font:12px monospace;z-index:20;pointer-events:none;white-space:pre';
  document.body.appendChild(el);

  return {
    update() {
      controls.update();
      el.textContent =
        formatPoseReadout(camera.position.toArray(), controls.target.toArray()) +
        `\n${extraInfo()}`;
    },
    dispose() {
      controls.dispose();
      el.remove();
    },
  };
}
