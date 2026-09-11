/**
 * Política de render del ticker, separada de `SceneTicker.tsx` para que ese
 * archivo exporte sólo un componente (regla `react/only-export-components`:
 * un módulo mixto rompe el fast refresh de Vite) y para poder testearla sin
 * montar r3f.
 */
export function shouldRender(now: number, lastDirtyAt: number, dirty: boolean, graceMs: number): boolean {
  return dirty || now - lastDirtyAt < graceMs;
}
