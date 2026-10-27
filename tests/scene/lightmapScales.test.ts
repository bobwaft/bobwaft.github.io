import { describe, expect, it } from 'vitest';
import { parseDecodeMultipliers } from '../../src/scene/scene-lighting.js';
import scales from '../../public/models/textures/lightmap_scales.json';

describe('parseDecodeMultipliers', () => {
  it('maps the bake JSON passes to sun/night/shelf multipliers', () => {
    const json = { decode_multipliers: { Sun: 1.3508, Night: 5.2192, Shelf: 3.7482 } };
    expect(parseDecodeMultipliers(json)).toEqual({ sun: 1.3508, night: 5.2192, shelf: 3.7482 });
  });

  it('accepts the lightmap_scales.json shipped with the scene', () => {
    const decode = parseDecodeMultipliers(scales);
    expect(decode.sun).toBe(scales.decode_multipliers.Sun);
    expect(decode.night).toBe(scales.decode_multipliers.Night);
    expect(decode.shelf).toBe(scales.decode_multipliers.Shelf);
  });

  it('ignores extra keys in the JSON', () => {
    const json = { decode_multipliers: { Sun: 1, Night: 2, Shelf: 3, AO: 9 }, decode: 'notes' };
    expect(parseDecodeMultipliers(json)).toEqual({ sun: 1, night: 2, shelf: 3 });
  });

  it.each([
    ['null', null],
    ['missing decode_multipliers', {}],
    ['missing pass', { decode_multipliers: { Sun: 1, Night: 2 } }],
    ['non-numeric value', { decode_multipliers: { Sun: '1.3', Night: 2, Shelf: 3 } }],
    ['non-positive value', { decode_multipliers: { Sun: 0, Night: 2, Shelf: 3 } }],
    ['non-finite value', { decode_multipliers: { Sun: Infinity, Night: 2, Shelf: 3 } }],
  ])('throws on %s', (_label, json) => {
    expect(() => parseDecodeMultipliers(json)).toThrow(/lightmap_scales\.json/);
  });
});
