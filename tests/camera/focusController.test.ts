import { Quaternion, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createFocusController } from '../../src/camera/focusController';
import { createPoseTween, type Pose } from '../../src/camera/focusTween';

const pose = (x: number, y = 0, z = 0): Pose => ({
  position: new Vector3(x, y, z),
  quaternion: new Quaternion(),
});

function setup(seconds = 1) {
  const idle = pose(0);
  const targets: Record<string, Pose> = { laptop: pose(10) };
  const onArrived = vi.fn();
  const tween = createPoseTween(idle);
  const ctrl = createFocusController({
    tween,
    idlePose: () => idle,
    focusPose: (id) => targets[id] ?? null,
    seconds: () => seconds,
    onArrived,
  });
  return { ctrl, tween, onArrived, targets };
}

describe('focus controller', () => {
  it('tweens to the focus pose over the duration and reports arrival once', () => {
    const { ctrl, tween, onArrived } = setup(1);
    expect(ctrl.enter('laptop')).toBe(true);
    ctrl.step(0.5);
    expect(tween.current.position.x).toBeCloseTo(5); // easeInOutCubic(0.5) = 0.5
    expect(onArrived).not.toHaveBeenCalled();
    ctrl.step(0.6);
    expect(tween.current.position.x).toBeCloseTo(10);
    expect(onArrived).toHaveBeenCalledTimes(1);
    ctrl.step(1);
    expect(onArrived).toHaveBeenCalledTimes(1);
  });

  it('exit tweens from the current pose back to the idle pose', () => {
    const { ctrl, tween, onArrived } = setup(1);
    ctrl.enter('laptop');
    ctrl.step(2);
    ctrl.exit();
    ctrl.step(0.5);
    expect(tween.current.position.x).toBeCloseTo(5);
    ctrl.step(1);
    expect(tween.current.position.x).toBeCloseTo(0);
    expect(onArrived).toHaveBeenCalledTimes(2);
  });

  it('a zero duration cuts on the next step', () => {
    const { ctrl, tween, onArrived } = setup(0);
    ctrl.enter('laptop');
    ctrl.step(0.016);
    expect(tween.current.position.x).toBeCloseTo(10);
    expect(onArrived).toHaveBeenCalledTimes(1);
  });

  it('refuses an object with no focus pose', () => {
    const { ctrl, tween, onArrived } = setup();
    expect(ctrl.enter('nope')).toBe(false);
    ctrl.step(2);
    expect(tween.current.position.x).toBe(0);
    expect(onArrived).not.toHaveBeenCalled();
  });

  it('retarget while focused snaps to the recomputed focus pose', () => {
    const { ctrl, tween, targets } = setup(1);
    ctrl.enter('laptop');
    ctrl.step(2);
    targets.laptop = pose(20);
    ctrl.retarget();
    ctrl.step(0.016);
    expect(tween.current.position.x).toBeCloseTo(20);
  });
});
