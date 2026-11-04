import { describe, expect, it } from 'vitest';
import { creditLine, findTrack, marquee } from '../../src/ui/nowPlaying';
import playlist from '../../src/content/playlist.json';

const track = {
  src: '/audio/a.mp3',
  title: 'Blue bossa',
  artist: 'Jazz at Mladost Club',
  source: 'Free Music Archive',
  license: 'CC BY-NC-SA',
};

describe('creditLine', () => {
  it('names title, artist, source and licence', () => {
    expect(creditLine(track)).toBe(
      '♪ Blue bossa — Jazz at Mladost Club · Free Music Archive · CC BY-NC-SA',
    );
  });
});

describe('findTrack', () => {
  it('matches a track by src, including an absolute URL from the audio element', () => {
    expect(findTrack([track], '/audio/a.mp3')).toBe(track);
    expect(findTrack([track], 'https://example.com/audio/a.mp3')).toBe(track);
    expect(findTrack([track], '/audio/b.mp3')).toBeUndefined();
  });
});

describe('playlist.json', () => {
  it('gives every track the credit fields the licence requires', () => {
    for (const t of playlist) {
      for (const key of ['src', 'title', 'artist', 'source', 'license'] as const) {
        expect(t[key], `${t.src} ${key}`).toMatch(/\S/);
      }
    }
  });
});

describe('marquee (a credit too long for the capped caption scrolls)', () => {
  it('does not scroll text that fits', () => {
    expect(marquee(200, 240)).toBeNull();
    expect(marquee(240, 240)).toBeNull();
    expect(marquee(240.5, 240)).toBeNull(); // sub-pixel rounding is not overflow
  });
  it('scrolls by exactly the overflow', () => {
    expect(marquee(400, 240)?.shift).toBe(160);
  });
  it('takes longer for more overflow, at a readable speed, with a floor', () => {
    const short = marquee(260, 240)!;
    const long = marquee(800, 240)!;
    expect(long.seconds).toBeGreaterThan(short.seconds);
    expect(short.seconds).toBeGreaterThanOrEqual(4);
    // The travel part (70% of the cycle) moves at 30 px/s.
    expect(long.seconds * 0.7).toBeCloseTo(560 / 30, 6);
  });
});
