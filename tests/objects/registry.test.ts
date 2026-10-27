import { describe, expect, it } from 'vitest';
import { REQUIRED_CLICK_NAMES, findMissingNames } from '../../src/objects/registry';

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
