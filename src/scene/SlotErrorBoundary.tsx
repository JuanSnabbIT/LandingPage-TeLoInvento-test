import { Component, type ReactNode } from 'react';

export class SlotErrorBoundary extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error(`[scene] slot "${this.props.name}" failed, disabled:`, error); }
  render() { return this.state.failed ? null : this.props.children; }
}
