export function isSceneV2(): boolean {
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('v2')) return true;
  return import.meta.env.VITE_SCENE_V2 === '1';
}
