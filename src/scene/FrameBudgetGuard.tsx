import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { registry } from './registry';
import { FrameBudget, type BudgetStep } from './frameBudget';

export function FrameBudgetGuard({
  onStep,
  active,
  options,
}: {
  onStep: (s: BudgetStep) => void;
  active: () => boolean;
  /** Forwarded to the `FrameBudget` constructor -- `?budget=1` uses it to force fast degradation in e2e (T25). */
  options?: ConstructorParameters<typeof FrameBudget>[0];
}) {
  const fb = useRef(new FrameBudget(options));
  useFrame((_, delta) => {
    if (!active()) return;
    // `registry.frameCost()` es el costo del frame ANTERIOR: los useFrame corren
    // antes de dibujar, así que el de este frame todavía no existe. Un frame de
    // atraso no cambia nada: el guardián necesita segundos de muestras.
    const s = fb.current.push(registry.frameCost(), delta);
    if (s) onStep(s);
  });
  return null;
}
