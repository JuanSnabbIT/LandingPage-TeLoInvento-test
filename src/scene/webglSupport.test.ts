import { describe, it, expect, vi, afterEach } from 'vitest';
import { hasWebgl2 } from './webglSupport';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('hasWebgl2', () => {
  it('false cuando getContext devuelve null', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null as never);
    expect(hasWebgl2()).toBe(false);
  });
  it('true y libera el contexto cuando existe', () => {
    const lose = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ getExtension: () => ({ loseContext: lose }) } as never);
    expect(hasWebgl2()).toBe(true); expect(lose).toHaveBeenCalled();
  });
});
