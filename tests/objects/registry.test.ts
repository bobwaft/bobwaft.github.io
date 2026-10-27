import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import {
  CLICK_REGISTRY,
  REQUIRED_CLICK_NAMES,
  collectRegistered,
  findMissingNames,
} from '../../src/objects/registry';

describe('findMissingNames', () => {
  it('returns nothing when all names are present', () => {
    expect(findMissingNames(REQUIRED_CLICK_NAMES)).toEqual([]);
  });

  it('returns the missing names', () => {
    const present = REQUIRED_CLICK_NAMES.filter(
      (n) => n !== 'Click_Papers' && n !== 'Click_Speaker',
    );
    expect(findMissingNames(present)).toEqual(['Click_Papers', 'Click_Speaker']);
  });

  it('ignores extra names', () => {
    expect(findMissingNames([...REQUIRED_CLICK_NAMES, 'Click_Extra', 'Desk'])).toEqual([]);
  });

  it('reports everything for an empty scene', () => {
    expect(findMissingNames([])).toEqual([...REQUIRED_CLICK_NAMES]);
  });
});

describe('CLICK_REGISTRY', () => {
  it('maps laptop and its screen to the same module', () => {
    expect(CLICK_REGISTRY.Click_Laptop).toBe(CLICK_REGISTRY.Click_Laptop_Screen);
  });
  it('has the expected labels', () => {
    const labels = Object.fromEntries(
      Object.values(CLICK_REGISTRY).map((m) => [m.id, m.label] as const),
    );
    expect(labels).toEqual({
      laptop: 'About',
      papers: 'Resume',
      notebook: 'Projects',
      speaker: 'Music',
      pullcord: 'Lamp',
    });
  });
  it('only laptop, papers and notebook have focus views', () => {
    const focus = new Set(
      Object.values(CLICK_REGISTRY)
        .filter((m) => m.focus)
        .map((m) => m.id),
    );
    expect(focus).toEqual(new Set(['laptop', 'papers', 'notebook']));
  });
  it('leaves Calendar and Window inert', () => {
    expect(CLICK_REGISTRY.Click_Calendar).toBeUndefined();
    expect(CLICK_REGISTRY.Click_Window).toBeUndefined();
  });
  it('collectRegistered finds named objects and skips unregistered ones', () => {
    const root = new Object3D();
    const a = new Object3D();
    a.name = 'Click_Papers';
    const b = new Object3D();
    b.name = 'Click_Calendar';
    root.add(a, b);
    const found = collectRegistered(root);
    expect(found.size).toBe(1);
    expect(found.get(a)?.id).toBe('papers');
  });
});
