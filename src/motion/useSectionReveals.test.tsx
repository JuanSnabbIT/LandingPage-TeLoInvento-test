// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { revealTargets } from './useSectionReveals';
import { Capacidades } from '../sections/Capacidades';
import { Contacto } from '../sections/Contacto';
import { Valor } from '../sections/Valor';

const STAGE_BOXES = '.capacidades__stage, .visual, .photo-ph';
let root: Root | null = null;
let host: HTMLDivElement;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  // jsdom no trae matchMedia (useMediaQuery / usePrefersReducedMotion).
  window.matchMedia = (query: string) =>
    ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }) as MediaQueryList;
});
afterEach(async () => {
  await act(async () => { root?.unmount(); });
  root = null; host?.remove();
});

async function render(el: React.ReactElement): Promise<HTMLElement> {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root!.render(el); });
  return host.querySelector('section')!;
}

/**
 * Regresión de spec 13 §11 (volvió el 2026-09-14): un reveal sobre una caja
 * de escena, o sobre cualquier ancestro suyo, mueve el ancla que la nube lee
 * por frame y el modelo queda rezagado al entrar a la sección.
 */
describe('useSectionReveals / revealTargets', () => {
  for (const [name, Section] of [['Capacidades', Capacidades], ['Contacto', Contacto], ['Valor', Valor]] as const) {
    it(`${name}: ningún elemento revelado es (ni contiene) una caja de escena, y algo se revela`, async () => {
      const section = await render(<Section />);
      expect(section.querySelector(STAGE_BOXES)).not.toBeNull();
      const targets = revealTargets(section);
      expect(targets.length).toBeGreaterThan(0);
      for (const t of targets) {
        expect(t.matches(STAGE_BOXES)).toBe(false);
        expect(t.querySelector(STAGE_BOXES)).toBeNull();
      }
    });
  }
  it('Capacidades: el texto de la tarjeta sí se revela (no sólo el encabezado de la sección)', async () => {
    const section = await render(<Capacidades />);
    expect(revealTargets(section).some((t) => t.matches('.capacidades__body'))).toBe(true);
  });
});
