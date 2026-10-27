// Shuffle-bag track order (Phase 4): each track once per cycle, never the same twice in a row.

export interface ShuffleBag {
  /** Next track, or undefined when there are no tracks. */
  next(): string | undefined;
}

function shuffled(items: readonly string[], rng: () => number): string[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createShuffleBag(
  tracks: readonly string[],
  rng: () => number = Math.random,
): ShuffleBag {
  let queue: string[] = [];
  let last: string | undefined;
  return {
    next() {
      if (tracks.length === 0) return undefined;
      if (queue.length === 0) {
        queue = shuffled(tracks, rng);
        // Avoid repeating the previous cycle's last track first.
        if (tracks.length > 1 && queue[0] === last) {
          [queue[0], queue[queue.length - 1]] = [queue[queue.length - 1], queue[0]];
        }
      }
      last = queue.shift();
      return last;
    },
  };
}
