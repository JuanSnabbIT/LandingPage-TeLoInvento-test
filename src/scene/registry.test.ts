import { describe, it, expect } from 'vitest';
import { registry } from './registry';
import * as THREE from 'three';

describe('registry', () => {
  it('registra y desregistra slots, notificando', () => {
    let n = 0; const off = registry.subscribe(() => n++);
    const un = registry.registerSlot({ id: 't', anchorRef: { current: null }, fit: 0.7, pose: 'frontal', surface: 'light' });
    expect(registry.getSlot('t')?.fit).toBe(0.7); expect(n).toBe(1);
    un(); expect(registry.getSlot('t')).toBeUndefined(); expect(n).toBe(2); off();
  });
  it('progresos por tramo y dirty', () => {
    expect(registry.getProgress(3)).toBe(0);
    registry.consumeDirty();
    registry.setProgress(3, 0.4);
    expect(registry.getProgress(3)).toBe(0.4);
    expect(registry.consumeDirty()).toBe(true);
    expect(registry.consumeDirty()).toBe(false);
  });
  it('pose provider', () => {
    const m = new THREE.Matrix4().makeTranslation(1, 2, 3);
    const un = registry.registerPoseProvider({ id: 'hero-display', getMatrix: (o) => o.copy(m), surface: 'dark' });
    expect(registry.getPoseProvider('hero-display')!.getMatrix(new THREE.Matrix4()).elements[12]).toBe(1);
    un();
  });
});
