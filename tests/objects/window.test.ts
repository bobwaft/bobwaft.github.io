import { describe, expect, it, vi } from 'vitest';
import { windowModule } from '../../src/objects/window';

describe('window module', () => {
  it('is an activate-type interactable labelled for the window', () => {
    expect(windowModule.id).toBe('window');
    expect(windowModule.label).toBe('Time of day');
    expect(windowModule.focus).toBeUndefined();
  });
  it('click cycles through the bound controller and forwards update', () => {
    const cycle = vi.fn();
    const update = vi.fn();
    windowModule.bind({ cycle, update });
    windowModule.onClick?.();
    windowModule.update?.(0.1);
    expect(cycle).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith(0.1);
  });
});
