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

export interface NowPlaying {
  setTrack(src: string): void;
  setVisible(visible: boolean): void;
  dispose(): void;
}

export function createNowPlaying(tracks: readonly TrackCredit[]): NowPlaying {
  const el = document.createElement('div');
  el.id = 'now-playing';
  el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);
  return {
    setTrack(src) {
      const t = findTrack(tracks, src);
      el.textContent = t ? creditLine(t) : '';
    },
    setVisible(visible) {
      el.classList.toggle('show', visible);
    },
    dispose() {
      el.remove();
    },
  };
}
