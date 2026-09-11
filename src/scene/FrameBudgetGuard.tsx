import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
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
    const s = fb.current.push(delta);
    if (s) onStep(s);
  });
  return null;
}
