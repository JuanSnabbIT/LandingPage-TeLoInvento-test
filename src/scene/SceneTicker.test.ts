import { describe, it, expect } from 'vitest';
import { shouldRender } from './sceneTickerPolicy';

describe('shouldRender', () => {
  it('renderiza si hubo dirty', () => { expect(shouldRender(1000, 990, true, 1000)).toBe(true); });
  it('renderiza dentro de la gracia', () => { expect(shouldRender(1500, 1000, false, 1000)).toBe(true); });
  it('no renderiza en idle real', () => { expect(shouldRender(3000, 1000, false, 1000)).toBe(false); });
});
