import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { resolveRegistered } from '../../src/interaction/picker';
import type { InteractableModule } from '../../src/objects/types';

const mod = (id: string): InteractableModule => ({ id, label: id });

describe('resolveRegistered', () => {
  const root = new Object3D();
  const registeredObj = new Object3D();
  const child = new Object3D();
  const grandchild = new Object3D();
  const stray = new Object3D();
  root.add(registeredObj, stray);
  registeredObj.add(child);
  child.add(grandchild);
  const map = new Map([[registeredObj, mod('a')]]);

  it('resolves the object itself', () => {
    expect(resolveRegistered(registeredObj, map)?.module.id).toBe('a');
  });
  it('resolves a deep child to the registered ancestor', () => {
    const r = resolveRegistered(grandchild, map);
    expect(r?.module.id).toBe('a');
    expect(r?.object).toBe(registeredObj);
  });
  it('prefers the nearest registered ancestor', () => {
    const inner = new Map([...map, [child, mod('b')]]);
    expect(resolveRegistered(grandchild, inner)?.module.id).toBe('b');
  });
  it('returns null for unregistered objects and null input', () => {
    expect(resolveRegistered(stray, map)).toBeNull();
    expect(resolveRegistered(null, map)).toBeNull();
  });
});
