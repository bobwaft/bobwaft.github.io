// Now-playing caption: credits the current track while music is on (CC BY-NC-SA attribution).

export interface TrackCredit {
  src: string;
  title: string;
  artist: string;
  source: string;
  license: string;
}

export function creditLine(t: TrackCredit): string {
  return `♪ ${t.title} — ${t.artist} · ${t.source} · ${t.license}`;
}

/** Finds a track by src; also accepts the absolute URL an audio element reports. */
export function findTrack<T extends TrackCredit>(tracks: readonly T[], src: string): T | undefined {
  return tracks.find((t) => t.src === src || src.endsWith(t.src));
}

/** Speed of the scroll and the share of each pass spent moving (the rest pauses at the ends). */
const SCROLL_PX_PER_S = 30;
const SCROLL_TRAVEL_SHARE = 0.7;
const SCROLL_MIN_SECONDS = 4;

/**
 * How a credit wider than its capped box scrolls: by the overflow, back and forth, one pass every
 * `seconds`. Null when it fits (within a pixel of rounding).
 */
export function marquee(
  textWidth: number,
  boxWidth: number,
): { shift: number; seconds: number } | null {
  const shift = textWidth - boxWidth;
  if (shift <= 1) return null;
  const seconds = shift / SCROLL_PX_PER_S / SCROLL_TRAVEL_SHARE;
  return { shift, seconds: Math.max(SCROLL_MIN_SECONDS, seconds) };
}

export interface NowPlaying {
  setTrack(src: string): void;
  setVisible(visible: boolean): void;
  dispose(): void;
}

export function createNowPlaying(tracks: readonly TrackCredit[]): NowPlaying {
  const el = document.createElement('div');
  el.id = 'now-playing';
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = '<span class="np-window"><span class="np-text"></span></span>';
  const box = el.querySelector<HTMLElement>('.np-window')!;
  const text = el.querySelector<HTMLElement>('.np-text')!;
  document.body.appendChild(el);
  // The caption is width-capped (index.html) so it clears "Skip the 3D"; a longer credit scrolls.
  const fit = () => {
    const m = marquee(text.scrollWidth, box.clientWidth);
    el.classList.toggle('scroll', !!m);
    if (m) {
      el.style.setProperty('--np-shift', `${-m.shift}px`);
      el.style.setProperty('--np-seconds', `${m.seconds.toFixed(2)}s`);
    }
  };
  window.addEventListener('resize', fit);
  return {
    setTrack(src) {
      const t = findTrack(tracks, src);
      text.textContent = t ? creditLine(t) : '';
      fit();
    },
    setVisible(visible) {
      el.classList.toggle('show', visible);
    },
    dispose() {
      window.removeEventListener('resize', fit);
      el.remove();
    },
  };
}
