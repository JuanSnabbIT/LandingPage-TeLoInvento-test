import { Component, type ReactNode } from 'react';

interface CanvasErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface CanvasErrorBoundaryState {
  hasError: boolean;
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

  static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('[canvas-scene] failed to render, falling back to poster:', error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
