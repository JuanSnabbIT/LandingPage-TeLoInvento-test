export type BudgetStep = 'dpr1.5' | 'dpr1' | 'noCurl' | 'reduced' | 'poster';

const STEPS: BudgetStep[] = ['dpr1.5', 'dpr1', 'noCurl', 'reduced', 'poster'];

export class FrameBudget {
  private minFps: number;
  private strikes: number;
  private warmup: number;
  private maxDelta: number;
  private elapsed = 0;
  private winT = 0;
  private winN = 0;
  private bad = 0;
  private step = 0;

  constructor(o: { minFps?: number; strikes?: number; warmup?: number; maxDelta?: number } = {}) {
    this.minFps = o.minFps ?? 24;
    this.strikes = o.strikes ?? 3;
    this.warmup = o.warmup ?? 2;
    this.maxDelta = o.maxDelta ?? 0.3;
  }

  push(delta: number): BudgetStep | null {
    if (this.step >= STEPS.length) return null;
    if (delta > this.maxDelta) {
      this.winT = 0;
      this.winN = 0;
      return null; // no contiguo: reinicia ventana
    }
    this.elapsed += delta;
    if (this.elapsed < this.warmup) return null;
    this.winT += delta;
    this.winN += 1;
    if (this.winT < 1) return null;
    const fps = this.winN / this.winT;
    this.winT = 0;
    this.winN = 0;
    this.bad = fps < this.minFps ? this.bad + 1 : 0;
    if (this.bad >= this.strikes) {
      this.bad = 0;
      return STEPS[this.step++];
    }
    return null;
  }
}
