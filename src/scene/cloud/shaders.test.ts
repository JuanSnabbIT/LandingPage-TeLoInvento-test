import { describe, expect, it } from 'vitest';
import { cloudVert } from './cloud.vert';
import { cloudFrag } from './cloud.frag';

describe('cloud shaders (GLSL3 sanity)', () => {
  it('vertex shader uses texelFetch + point/link indices and no legacy uTargetMatrix uniform', () => {
    expect(cloudVert).toContain('texelFetch(');
    expect(cloudVert).toContain('gl_VertexID');
    expect(cloudVert).toContain('particleIndex');
    expect(cloudVert).not.toContain('uTargetMatrix');
  });

  it('fragment shader declares GLSL3 output and the uSurface uniform', () => {
    expect(cloudFrag).toContain('out vec4 fragColor');
    expect(cloudFrag).toContain('uSurface');
  });

  it('round dots and surface networks have separate fragment coverage', () => {
    expect(cloudFrag).toContain('gl_PointCoord');
    expect(cloudFrag).toContain('SURFACE_LINES');
    expect(cloudFrag).toContain('vNetwork');
  });
});
