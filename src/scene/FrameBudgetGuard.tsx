import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { FrameBudget, type BudgetStep } from './frameBudget';

export function FrameBudgetGuard({
  onStep,
  active,
}: {
  onStep: (s: BudgetStep) => void;
  active: () => boolean;
}) {
  const fb = useRef(new FrameBudget());
  useFrame((_, delta) => {
    if (!active()) return;
    const s = fb.current.push(delta);
    if (s) onStep(s);
  });
  return null;
}
