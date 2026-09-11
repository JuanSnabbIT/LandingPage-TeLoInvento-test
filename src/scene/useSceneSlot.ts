import { useEffect } from 'react';
import { registry, type SlotSpec } from './registry';

export function useSceneSlot(spec: SlotSpec) {
  useEffect(
    () => registry.registerSlot(spec),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spec.id, spec.anchorRef, spec.fit, spec.pose, spec.surface],
  );
}
