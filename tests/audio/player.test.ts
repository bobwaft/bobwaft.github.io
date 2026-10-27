import { describe, expect, it, vi } from 'vitest';
import { createPlayer, type AudioLike, type VisibilitySource } from '../../src/audio/player';

class FakeAudio implements AudioLike {
  src = '';
  volume = 1;
  paused = true;
  playCalls = 0;
  playResult: Promise<void> = Promise.resolve();
  private endedFns: Array<() => void> = [];
  play() {
    this.playCalls++;
    this.paused = false;
    return this.playResult;
  }
  pause() {
    this.paused = true;
  }
  addEventListener(_type: 'ended', fn: () => void) {
    this.endedFns.push(fn);
  }
  emitEnded() {
    this.endedFns.forEach((f) => f());
  }
}

class FakeDoc implements VisibilitySource {
  hidden = false;
  private fns: Array<() => void> = [];
  addEventListener(_t: 'visibilitychange', fn: () => void) {
    this.fns.push(fn);
  }
  removeEventListener(_t: 'visibilitychange', fn: () => void) {
    this.fns = this.fns.filter((f) => f !== fn);
  }
  set(hidden: boolean) {
    this.hidden = hidden;
    this.fns.forEach((f) => f());
  }
}

const setup = (tracks = ['/audio/a.mp3', '/audio/b.mp3', '/audio/c.mp3']) => {
  const audios: FakeAudio[] = [];
  const doc = new FakeDoc();
  const onChange = vi.fn();
  const player = createPlayer({
    tracks,
    createAudio: () => {
      const a = new FakeAudio();
      audios.push(a);
      return a;
    },
    doc,
    rng: () => 0.5,
    onChange,
  });
  return { player, audios, doc, onChange };
};

describe('audio player', () => {
  it('creates no audio until the first toggle, then reuses one element', () => {
    const { player, audios } = setup();
    expect(audios).toHaveLength(0);
    player.toggle();
    expect(audios).toHaveLength(1);
    expect(audios[0].playCalls).toBe(1);
    expect(audios[0].src).toMatch(/^\/audio\//);
    expect(player.isPlaying()).toBe(true);
    player.toggle();
    player.toggle();
    expect(audios).toHaveLength(1);
  });

  it('fades volume in over ~0.5 s', () => {
    const { player, audios } = setup();
    player.toggle();
    expect(audios[0].volume).toBe(0);
    player.update(0.25);
    expect(audios[0].volume).toBeCloseTo(0.5);
    player.update(0.5);
    expect(audios[0].volume).toBe(1);
  });

  it('fades out then pauses when toggled off', () => {
    const { player, audios, onChange } = setup();
    player.toggle();
    player.update(1);
    player.toggle();
    expect(player.isPlaying()).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith(false);
    player.update(0.25);
    expect(audios[0].volume).toBeCloseTo(0.5);
    expect(audios[0].paused).toBe(false);
    player.update(0.5);
    expect(audios[0].volume).toBe(0);
    expect(audios[0].paused).toBe(true);
  });

  it('plays the next bag track on ended', () => {
    const { player, audios } = setup();
    player.toggle();
    const first = audios[0].src;
    audios[0].emitEnded();
    expect(audios[0].src).not.toBe(first);
    expect(audios[0].playCalls).toBe(2);
  });

  it('pauses when hidden and resumes on visible only if music was on', () => {
    const { player, audios, doc } = setup();
    player.toggle();
    player.update(1);
    doc.set(true);
    expect(audios[0].paused).toBe(true);
    doc.set(false);
    expect(audios[0].paused).toBe(false);
    expect(audios[0].playCalls).toBe(2);

    player.toggle();
    player.update(1);
    expect(audios[0].paused).toBe(true);
    doc.set(true);
    doc.set(false);
    expect(audios[0].paused).toBe(true);
    expect(audios[0].playCalls).toBe(2);
  });

  it('survives play() rejection and reports off', async () => {
    const { player, audios, onChange } = setup();
    player.toggle();
    audios[0].playResult = Promise.reject(new Error('blocked'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    audios[0].emitEnded();
    await Promise.resolve();
    await Promise.resolve();
    expect(player.isPlaying()).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith(false);
    warn.mockRestore();
  });

  it('ignores AbortError (play interrupted by pause) and resumes on visible', async () => {
    const { player, audios, doc } = setup();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    player.toggle();
    audios[0].playResult = Promise.reject(new DOMException('interrupted', 'AbortError'));
    audios[0].emitEnded();
    doc.set(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(player.isPlaying()).toBe(true);
    expect(warn).not.toHaveBeenCalled();
    audios[0].playResult = Promise.resolve();
    doc.set(false);
    expect(audios[0].paused).toBe(false);
    warn.mockRestore();
  });

  it('does not start a track on ended while off or hidden', () => {
    const { player, audios, doc } = setup();
    player.toggle();
    doc.set(true);
    audios[0].emitEnded();
    expect(audios[0].playCalls).toBe(1);
    doc.set(false);
    player.toggle();
    const calls = audios[0].playCalls;
    audios[0].emitEnded();
    expect(audios[0].playCalls).toBe(calls);
  });

  it('stops listening after dispose', () => {
    const { player, audios, doc } = setup();
    player.toggle();
    player.dispose();
    doc.set(true);
    expect(audios[0].paused).toBe(false);
  });
});

describe('audio player with an empty playlist', () => {
  it('warns once, creates no audio and changes no state', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { player, audios, onChange } = setup([]);
    player.toggle();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(audios).toHaveLength(0);
    expect(player.isPlaying()).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
    expect(() => player.update(1)).not.toThrow();
    warn.mockRestore();
  });
});
