import { describe, expect, it } from 'vitest';
import { creditLine, findTrack } from '../../src/ui/nowPlaying';
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
