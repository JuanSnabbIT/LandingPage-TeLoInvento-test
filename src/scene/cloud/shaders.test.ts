import { describe, expect, it } from 'vitest';
import { cloudVert } from './cloud.vert';
import { cloudFrag } from './cloud.frag';

describe('cloud shaders (GLSL3 sanity)', () => {
  it('vertex shader uses texelFetch + gl_VertexID and no legacy uTargetMatrix uniform', () => {
    expect(cloudVert).toContain('texelFetch(');
    expect(cloudVert).toContain('gl_VertexID');
    expect(cloudVert).not.toContain('uTargetMatrix');
  });

  it('fragment shader declares GLSL3 output and the uSurface uniform', () => {
    expect(cloudFrag).toContain('out vec4 fragColor');
    expect(cloudFrag).toContain('uSurface');
  });
});
