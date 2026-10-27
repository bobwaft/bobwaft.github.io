import { PerspectiveCamera, Scene } from 'three';
import { createRenderer, resizeToWindow } from './scene/renderer';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const renderer = createRenderer(canvas);
const scene = new Scene();
const camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

window.addEventListener('resize', () => resizeToWindow(renderer, camera));
renderer.setAnimationLoop(() => renderer.render(scene, camera));
