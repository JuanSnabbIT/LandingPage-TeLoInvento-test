import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function readPreference(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/**
 * Tracks the OS-level `prefers-reduced-motion` setting reactively (updates
 * if the user flips it while the page is open, e.g. via DevTools rendering
 * emulation). Generic/reusable across any future scene, not hero-central-specific.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(readPreference);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQueryList = window.matchMedia(QUERY);

    const handleChange = (event: MediaQueryListEvent) => setPrefers(event.matches);

    mediaQueryList.addEventListener('change', handleChange);
    return () => mediaQueryList.removeEventListener('change', handleChange);
  }, []);

  return prefers;
}
