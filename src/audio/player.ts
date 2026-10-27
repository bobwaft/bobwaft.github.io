// Audio player with fades and tab-visibility pause (Phase 4).
import { createShuffleBag } from './shuffleBag';

/** The slice of HTMLAudioElement the player uses (lets tests pass a fake). */
export interface AudioLike {
  src: string;
  volume: number;
  play(): Promise<void> | void;
  pause(): void;
  addEventListener(type: 'ended', fn: () => void): void;
}

export interface VisibilitySource {
  readonly hidden: boolean;
  addEventListener(type: 'visibilitychange', fn: () => void): void;
  removeEventListener(type: 'visibilitychange', fn: () => void): void;
}

export interface PlayerOptions {
  tracks: readonly string[];
  createAudio: () => AudioLike;
  doc: VisibilitySource;
  rng?: () => number;
  /** Called with the new on/off state whenever it changes. */
  onChange?: (playing: boolean) => void;
}

export interface Player {
  /** Switches music on or off (call from a user gesture). */
  toggle(): void;
  /** True while music is on (including while it fades in; false once fading out). */
  isPlaying(): boolean;
  /** Advances volume fades; call every frame. */
  update(dt: number): void;
  dispose(): void;
}

export const FADE_SECONDS = 0.5;

export function createPlayer(opts: PlayerOptions): Player {
  const bag = createShuffleBag(opts.tracks, opts.rng);
  let audio: AudioLike | null = null;
  let on = false;
  let volume = 0;
  let sounding = false; // audio is (meant to be) running, possibly fading out

  const setOn = (value: boolean) => {
    if (on === value) return;
    on = value;
    opts.onChange?.(on);
  };
  const fail = (err: unknown) => {
    // pause() rejects a pending play() with AbortError; that's not a failure.
    if (err instanceof Error && err.name === 'AbortError') return;
    console.warn('Audio playback failed', err);
    sounding = false;
    setOn(false);
  };
  const play = () => {
    if (!audio) return;
    sounding = true;
    try {
      Promise.resolve(audio.play()).catch(fail);
    } catch (err) {
      fail(err);
    }
  };
  const playNext = () => {
    if (!audio) return;
    const track = bag.next();
    if (track === undefined) return;
    audio.src = track;
    if (on && !opts.doc.hidden) play();
    else sounding = false;
  };
  const onVisibility = () => {
    if (!audio) return;
    if (opts.doc.hidden) {
      audio.pause();
      sounding = false;
    } else if (on) {
      play();
    }
  };
  opts.doc.addEventListener('visibilitychange', onVisibility);

  return {
    toggle() {
      if (on) {
        setOn(false);
        return;
      }
      if (!audio) {
        const track = bag.next();
        if (track === undefined) {
          console.warn('Audio playlist is empty; nothing to play');
          return;
        }
        audio = opts.createAudio();
        audio.volume = 0;
        audio.addEventListener('ended', playNext);
        audio.src = track;
      }
      setOn(true);
      if (!sounding) {
        audio.volume = volume = 0;
        play();
      }
    },
    isPlaying: () => on,
    update(dt) {
      if (!audio) return;
      const step = Math.max(0, dt) / FADE_SECONDS;
      volume = on ? Math.min(1, volume + step) : Math.max(0, volume - step);
      audio.volume = volume;
      if (!on && volume === 0 && sounding) {
        audio.pause();
        sounding = false;
      }
    },
    dispose() {
      opts.doc.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
