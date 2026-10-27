import { describe, expect, it } from 'vitest';
import { createShuffleBag } from '../../src/audio/shuffleBag';

// Deterministic LCG for repeatable shuffles.
const lcg = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('createShuffleBag', () => {
  it('plays every track exactly once per cycle', () => {
    const tracks = ['a', 'b', 'c', 'd', 'e'];
    const bag = createShuffleBag(tracks, lcg(1));
    for (let cycle = 0; cycle < 20; cycle++) {
      const got = tracks.map(() => bag.next());
      expect([...got].sort()).toEqual(tracks);
    }
  });

  it('never starts a new cycle with the previous cycle last track', () => {
    const tracks = ['a', 'b', 'c'];
    for (let seed = 1; seed < 200; seed++) {
      const bag = createShuffleBag(tracks, lcg(seed));
      const seq = Array.from({ length: 30 }, () => bag.next());
      for (let i = 1; i < seq.length; i++) expect(seq[i]).not.toBe(seq[i - 1]);
    }
  });

  it('avoids the immediate repeat even when the rng would put it first', () => {
    const bag = createShuffleBag(['a', 'b'], () => 0);
    const seq = Array.from({ length: 8 }, () => bag.next());
    for (let i = 1; i < seq.length; i++) expect(seq[i]).not.toBe(seq[i - 1]);
  });

  it('repeats a single track', () => {
    const bag = createShuffleBag(['only']);
    expect([bag.next(), bag.next(), bag.next()]).toEqual(['only', 'only', 'only']);
  });

  it('returns undefined for an empty list', () => {
    expect(createShuffleBag([]).next()).toBeUndefined();
  });

  it('does not mutate the input', () => {
    const tracks = ['a', 'b', 'c'];
    createShuffleBag(tracks, lcg(3)).next();
    expect(tracks).toEqual(['a', 'b', 'c']);
  });
});
