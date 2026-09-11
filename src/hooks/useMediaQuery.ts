import { useCallback, useSyncExternalStore } from 'react';

/**
 * Sigue una media query de CSS de forma reactiva.
 *
 * Se usa para los slots de la escena cuyo encuadre depende del ancho:
 * `useSceneSlot` re-registra el slot cuando cambia `fit`, así que la nube se
 * re-encuadra sola al girar el teléfono o redimensionar la ventana.
 *
 * Va por `useSyncExternalStore` y no por `useState` + `useEffect` porque
 * `matchMedia` ES un store externo: así no hace falta un `setState` dentro del
 * efecto para resincronizar (que además dispara `react(set-state-in-effect)`),
 * y un cambio de `query` se lee en el mismo render, sin un frame intermedio con
 * el valor viejo.
 *
 * Sin `matchMedia` (jsdom, SSR) devuelve `false`. Por eso las consultas se
 * escriben en positivo para el caso ancho: el fallback queda en el encuadre
 * chico, que es el que nunca se sale de la caja.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => (typeof window === 'undefined' || !window.matchMedia ? false : window.matchMedia(query).matches),
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
