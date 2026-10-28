// HTML laid over a 3D surface with CSS3DRenderer (A-4). The layer ignores the pointer except
// on the element itself, so clicks beside it still reach the canvas (and exit the focus view).
import { PerspectiveCamera, Scene, type Camera } from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { cssPlacement, surfaceCameraMatrix, type ScreenFrame } from '../scene/screenFrame';

export interface ScreenLayer {
  setVisible(visible: boolean): void;
  render(camera: Camera): void;
  setSize(width: number, height: number): void;
  dispose(): void;
}

/** Element is sized to pxWidth CSS pixels and the frame's aspect, then scaled onto the frame. */
export function createScreenLayer(
  element: HTMLElement,
  frame: ScreenFrame,
  pxWidth: number,
): ScreenLayer {
  const renderer = new CSS3DRenderer();
  const root = renderer.domElement;
  root.classList.add('screen-layer');
  root.hidden = true;
  document.body.appendChild(root);

  const placement = cssPlacement(frame, pxWidth);
  element.style.width = `${pxWidth}px`;
  element.style.height = `${placement.pxHeight}px`;
  // Hold the parallax while reading: page moves don't reach the window's look listener.
  element.addEventListener('pointermove', (e) => e.stopPropagation());
  // The element sits at the origin facing +Z and the camera is moved into the surface's frame
  // instead. Same picture, but the CSS camera never looks edge-on at its own plane; with the
  // world frame, a top-down view (papers) broke the browser's hit testing (BUG-003).
  const object = new CSS3DObject(element);
  object.scale.setScalar(placement.scale);
  // A scene of its own: it holds only the content element.
  const scene = new Scene().add(object);
  const surfaceCamera = new PerspectiveCamera();
  surfaceCamera.matrixWorldAutoUpdate = false;

  let visible = false;
  return {
    setVisible(v) {
      visible = v;
      root.hidden = !v;
      if (!v) element.querySelector('.screen-scroll')?.scrollTo(0, 0);
    },
    render(camera) {
      if (!visible) return;
      surfaceCamera.projectionMatrix.copy(camera.projectionMatrix);
      surfaceCamera.matrixWorld.copy(surfaceCameraMatrix(placement, camera.matrixWorld));
      surfaceCamera.matrixWorldInverse.copy(surfaceCamera.matrixWorld).invert();
      renderer.render(scene, surfaceCamera);
    },
    setSize: (w, h) => renderer.setSize(w, h),
    dispose: () => root.remove(),
  };
}
