import { createRenderer, resizeToWindow } from './scene/renderer';
import { loadScene } from './scene/loadScene';
import { createLoadingScreen } from './ui/loading';

async function boot(): Promise<void> {
  const loading = createLoadingScreen();
  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const renderer = createRenderer(canvas);
  const { scene, camera } = await loadScene();
  loading.markSceneResolved();
  await loading.whenReady;

  resizeToWindow(renderer, camera);
  window.addEventListener('resize', () => resizeToWindow(renderer, camera));
  renderer.render(scene, camera); // first frame before the fade
  renderer.setAnimationLoop(() => renderer.render(scene, camera));
  loading.fadeOut();
}

boot().catch((err) => console.error(err));
