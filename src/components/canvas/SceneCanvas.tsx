import { Suspense, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Canvas, type CanvasProps } from '@react-three/fiber';

interface CanvasCreatedState {
  gl: { domElement: HTMLCanvasElement };
}

interface SceneCanvasProps {
  children: ReactNode;
  /** [min, max] devicePixelRatio clamp -- comes from the scene's device-tier heuristic. */
  dpr: [number, number];
  /**
   * 'always' renders every RAF tick (normal idle-animated scene).
   * 'demand' renders once on mount/prop-change and otherwise sits still --
   * used when prefers-reduced-motion is set, so a static scene doesn't keep
   * re-rendering for nothing.
   */
  frameloop: 'always' | 'demand';
  /** Shown while the scene's assets (GLTF/textures) are still loading. */
  fallback?: ReactNode;
  onContextLost?: () => void;
  onContextRestored?: () => void;
  glOptions?: CanvasProps['gl'];
}

/**
 * Reusable <Canvas> wrapper per docs/architecture/3d-web-standard.md §3/§7:
 * owns dpr, frameloop mode, and webglcontextlost/restored handling so every
 * scene doesn't have to reimplement this. Only mounted once today
 * (hero-central) but deliberately has no hero-central-specific knowledge.
 */
export function SceneCanvas({
  children,
  dpr,
  frameloop,
  fallback = null,
  onContextLost,
  onContextRestored,
  glOptions,
}: SceneCanvasProps) {
  const cleanupRef = useRef<(() => void) | null>(null);

  const handleCreated = useCallback(
    (state: CanvasCreatedState) => {
      const canvasEl = state.gl.domElement;

      const handleLost = (event: Event) => {
        // Prevent the browser's default (which would drop the context for
        // good) so `webglcontextrestored` has a chance to fire.
        event.preventDefault();
        onContextLost?.();
      };
      const handleRestored = () => {
        onContextRestored?.();
      };

      canvasEl.addEventListener('webglcontextlost', handleLost, false);
      canvasEl.addEventListener('webglcontextrestored', handleRestored, false);

      cleanupRef.current = () => {
        canvasEl.removeEventListener('webglcontextlost', handleLost);
        canvasEl.removeEventListener('webglcontextrestored', handleRestored);
      };
    },
    [onContextLost, onContextRestored],
  );

  useEffect(() => () => cleanupRef.current?.(), []);

  return (
    <Canvas
      dpr={dpr}
      frameloop={frameloop}
      gl={{ antialias: true, powerPreference: 'high-performance', ...glOptions }}
      onCreated={handleCreated}
    >
      <Suspense fallback={fallback}>{children}</Suspense>
    </Canvas>
  );
}
