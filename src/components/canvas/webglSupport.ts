/**
 * Cheap feature-detection for a working WebGL context. Deliberately does NOT
 * sniff `gl.getParameter(UNMASKED_RENDERER_WEBGL)` or any renderer/vendor
 * string -- per this project's 3d-web-standard.md §7, device-tier and
 * capability decisions must never rely on that string, only on context
 * availability + navigator/viewport signals (see deviceTier.ts).
 */
export function hasWebglSupport(): boolean {
  if (typeof document === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    const context =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');
    return context != null;
  } catch {
    return false;
  }
}
