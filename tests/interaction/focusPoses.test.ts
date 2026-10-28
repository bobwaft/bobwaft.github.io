import { BoxGeometry, Mesh, PerspectiveCamera, Scene, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createFocusPoseResolver } from '../../src/interaction/focusPoses';

function setup(
  upFor?: (id: string) => Vector3 | null,
  pointsFor?: (id: string) => Vector3[] | null,
) {
  const scene = new Scene();
  const papers = new Mesh(new BoxGeometry(0.21, 0.01, 0.3));
  papers.name = 'Click_Papers';
  scene.add(papers);
  const camera = new PerspectiveCamera(40, 1.6);
  const resolve = createFocusPoseResolver(
    scene,
    camera,
    () => new Vector3(0, 1, 1),
    upFor,
    pointsFor,
  );
  return resolve;
}

const cameraUp = (pose: { quaternion: import('three').Quaternion }) =>
  new Vector3(0, 1, 0).applyQuaternion(pose.quaternion);

describe('createFocusPoseResolver', () => {
  it("uses the object's up hint by default", () => {
    const pose = setup()('papers')!;
    expect(cameraUp(pose).distanceTo(new Vector3(0, 0, -1))).toBeLessThan(1e-6);
  });

  it('lets a surface override the up hint (papers: page upright on screen)', () => {
    const turned = new Vector3(-Math.sin(0.35), 0, -Math.cos(0.35));
    const pose = setup((id) => (id === 'papers' ? turned : null))('papers')!;
    expect(cameraUp(pose).distanceTo(turned)).toBeLessThan(1e-6);
  });

  it('falls back to the spec when the override has nothing for an id', () => {
    const pose = setup(() => null)('papers')!;
    expect(cameraUp(pose).distanceTo(new Vector3(0, 0, -1))).toBeLessThan(1e-6);
  });

  it('lets a surface override the points it frames (notebook: the open spread)', () => {
    const base = setup()('papers')!;
    const moved = [new Vector3(0.9, 0, -0.15), new Vector3(1.1, 0, 0.15)];
    const pose = setup(undefined, (id) => (id === 'papers' ? moved : null))('papers')!;
    expect(pose.position.x - base.position.x).toBeCloseTo(1);
  });
});
