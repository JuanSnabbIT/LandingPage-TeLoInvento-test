import type { RefObject } from 'react';
import type * as THREE from 'three';
import type { Pose } from './anchoring';

export type Surface = 'light' | 'dark';
/** `parallax`: giro máximo (rad) con el puntero, amortiguado -- sólo el Hero lo usa (ParticleCloud lo aplica sobre la pose). */
export interface SlotSpec { id: string; anchorRef: RefObject<HTMLElement | null>; fit: number; pose: Pose; surface: Surface; parallax?: number; }
export interface PoseProvider { id: string; getMatrix: (out: THREE.Matrix4) => THREE.Matrix4; surface: Surface; }

const slots = new Map<string, SlotSpec>();
const providers = new Map<string, PoseProvider>();
const progress: number[] = [];
const listeners = new Set<() => void>();
let dirty = false; let frameCost = 0;
let dirtyAt = 0;
const emit = () => { for (const l of listeners) l(); };
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export const registry = {
  registerSlot(spec: SlotSpec) { slots.set(spec.id, spec); emit(); return () => { slots.delete(spec.id); emit(); }; },
  registerPoseProvider(p: PoseProvider) { providers.set(p.id, p); emit(); return () => { providers.delete(p.id); emit(); }; },
  getSlot: (id: string) => slots.get(id),
  getPoseProvider: (id: string) => providers.get(id),
  setProgress(tramo: number, p: number) { progress[tramo] = p; dirty = true; dirtyAt = now(); },
  getProgress: (tramo: number) => progress[tramo] ?? 0,
  markDirty() { dirty = true; dirtyAt = now(); },
  /** Segundos que tardó el último `advance()` -- lo escribe SceneTicker y lo lee FrameBudgetGuard. */
  setFrameCost(seconds: number) { frameCost = seconds; },
  frameCost() { return frameCost; },
  consumeDirty() { const d = dirty; dirty = false; return d; },
  lastDirtyAt: () => dirtyAt,
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  snapshot: () => ({ slots: [...slots.keys()], providers: [...providers.keys()] }),
};
