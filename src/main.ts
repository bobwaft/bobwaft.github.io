import { createRenderer, resizeToWindow } from './scene/renderer';
import { loadScene } from './scene/loadScene';

async function boot(): Promise<void> {
  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const renderer = createRenderer(canvas);
  const { scene, camera } = await loadScene();

  resizeToWindow(renderer, camera);
  window.addEventListener('resize', () => resizeToWindow(renderer, camera));
  renderer.setAnimationLoop(() => renderer.render(scene, camera));
}

boot().catch((err) => console.error(err));
