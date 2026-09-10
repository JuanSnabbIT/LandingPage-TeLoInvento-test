import { Component, type ReactNode } from 'react';

interface CanvasErrorBoundaryProps {
  children: ReactNode;
  /** Static node, or a function receiving the caught error (so a poster can show it in dev). */
  fallback: ReactNode | ((error: unknown) => ReactNode);
}

interface CanvasErrorBoundaryState {
  hasError: boolean;
  error?: unknown;
}

/**
 * Catches render/load failures from a canvas scene (e.g. a GLB that fails
 * to parse or comes back with degenerate geometry) and swaps to the scene's
 * static poster instead of leaving a blank/crashed page. Logs the real error
 * so a broken asset is reported, not silently replaced with a placeholder
 * primitive -- see docs/architecture/3d-web-standard.md §7 and this task's
 * "stop and report" requirement for structurally broken assets.
 */
export class CanvasErrorBoundary extends Component<CanvasErrorBoundaryProps, CanvasErrorBoundaryState> {
  state: CanvasErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: unknown): CanvasErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('[canvas-scene] failed to render, falling back to poster:', error);
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;
      return typeof fallback === 'function' ? fallback(this.state.error) : fallback;
    }
    return this.props.children;
  }
}
