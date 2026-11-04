import { describe, expect, it } from 'vitest';
import { creditLine, findTrack, MARQUEE_GAP_PX, marquee } from '../../src/ui/nowPlaying';
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

describe('marquee (a credit too long for the capped caption rotates like a ticker)', () => {
  it('does not move text that fits', () => {
    expect(marquee(200, 240)).toBeNull();
    expect(marquee(240, 240)).toBeNull();
    expect(marquee(240.5, 240)).toBeNull(); // sub-pixel rounding is not overflow
  });
  it('loops by one copy of the text plus the gap, so the second copy lands where the first began', () => {
    expect(marquee(400, 240)?.shift).toBe(400 + MARQUEE_GAP_PX);
  });
  it('moves at a steady 30 px/s, so a longer credit takes longer per loop', () => {
    const m = marquee(400, 240)!;
    expect(m.seconds).toBeCloseTo((400 + MARQUEE_GAP_PX) / 30, 6);
    expect(marquee(800, 240)!.seconds).toBeGreaterThan(m.seconds);
  });
});
