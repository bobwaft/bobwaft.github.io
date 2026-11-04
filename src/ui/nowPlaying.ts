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

/** Ticker speed, and the space between the end of the credit and its repeat. */
const TICKER_PX_PER_S = 30;
export const MARQUEE_GAP_PX = 48;

/**
 * How a credit wider than its capped box rotates: a second copy follows the first after a gap,
 * and the pair moves left by one copy plus the gap per loop, so the loop is seamless. Null when
 * the credit fits (within a pixel of rounding).
 */
export function marquee(
  textWidth: number,
  boxWidth: number,
): { shift: number; seconds: number } | null {
  if (textWidth - boxWidth <= 1) return null;
  const shift = textWidth + MARQUEE_GAP_PX;
  return { shift, seconds: shift / TICKER_PX_PER_S };
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
  el.innerHTML =
    '<span class="np-window"><span class="np-track"><span class="np-text"></span>' +
    '<span class="np-text np-copy" aria-hidden="true"></span></span></span>';
  const box = el.querySelector<HTMLElement>('.np-window')!;
  const [text, copy] = el.querySelectorAll<HTMLElement>('.np-text');
  document.body.appendChild(el);
  // The caption is width-capped (index.html) so it clears "Skip the 3D"; a longer credit rotates.
  const fit = () => {
    const m = marquee(text.offsetWidth, box.clientWidth);
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
      text.textContent = copy.textContent = t ? creditLine(t) : '';
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
