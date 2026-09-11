export type BudgetStep = 'dpr1.5' | 'dpr1' | 'noCurl' | 'reduced' | 'poster';

const STEPS: BudgetStep[] = ['dpr1.5', 'dpr1', 'noCurl', 'reduced', 'poster'];

/**
 * Degradación escalonada cuando la escena no da los fps mínimos.
 *
 * Mide el COSTO de dibujar cada frame (lo que tarda `advance()` de r3f, que
 * `SceneTicker` cronometra), no el hueco entre frames. La diferencia importa
 * porque la escena está gateada por "sucio": cuando nadie scrollea no se dibuja
 * nada, y el hueco entre dos frames puede ser de segundos sin que haya ningún
 * problema de rendimiento. Midiendo el hueco, ese reposo se confundía con
 * lentitud -- y al revés, un frame que tardaba más que el umbral de reposo se
 * descartaba por "no contiguo", así que un equipo que dibujara a 3 fps nunca
 * llegaba a degradar, que es justo el caso para el que existe este guardián
 * (visto al pasar la nube a mallas instanciadas: en un navegador sin GPU cada
 * frame pasaba de 300 ms y el guardián se quedaba mudo).
 *
 * `fps` es entonces "los fps que daría dibujando sin parar" = frames / suma de
 * costos, y la ventana se cierra por tiempo de pared para que la reacción
 * ocurra en segundos reales.
 */
export class FrameBudget {
  private minFps: number;
  private strikes: number;
  private warmup: number;
  private maxCost: number;
  private elapsed = 0;
  private winCost = 0;
  private winWall = 0;
  private winN = 0;
  private bad = 0;
  private step = 0;

  constructor(o: { minFps?: number; strikes?: number; warmup?: number; maxCost?: number } = {}) {
    this.minFps = o.minFps ?? 24;
    this.strikes = o.strikes ?? 3;
    this.warmup = o.warmup ?? 2;
    // Un frame que cuesta más de 2 s no es lentitud sino una pausa (pestaña en
    // segundo plano que igual dibujó, depurador, GC patológico): no cuenta.
    this.maxCost = o.maxCost ?? 2;
  }

  /**
   * @param cost   segundos que tardó dibujar el frame anterior
   * @param delta  segundos de reloj de pared desde el frame anterior
   */
  push(cost: number, delta: number): BudgetStep | null {
    if (this.step >= STEPS.length) return null;
    if (!(cost > 0) || cost > this.maxCost) return null;
    // El reloj de pared se acota a 1 s por frame para que un rato sin dibujar
    // no complete el calentamiento ni cierre la ventana de golpe.
    const wall = Math.min(Math.max(delta, cost), 1);
    this.elapsed += wall;
    if (this.elapsed < this.warmup) return null;
    this.winCost += cost;
    this.winWall += wall;
    this.winN += 1;
    if (this.winWall < 1) return null;
    const fps = this.winN / this.winCost;
    this.winCost = 0;
    this.winWall = 0;
    this.winN = 0;
    this.bad = fps < this.minFps ? this.bad + 1 : 0;
    if (this.bad >= this.strikes) {
      this.bad = 0;
      return STEPS[this.step++];
    }
    return null;
  }
}
