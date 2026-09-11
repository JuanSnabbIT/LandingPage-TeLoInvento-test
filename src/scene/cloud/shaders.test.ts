import { describe, expect, it } from 'vitest';
import { cloudVert } from './cloud.vert';
import { cloudFrag } from './cloud.frag';

describe('cloud shaders (GLSL3 sanity)', () => {
  it('vertex shader uses texelFetch + gl_InstanceID and no legacy uTargetMatrix uniform', () => {
    expect(cloudVert).toContain('texelFetch(');
    // La nube es InstancedMesh: el índice de partícula es la instancia, no el
    // vértice -- `position`/`normal` son los de la malla de cada partícula.
    expect(cloudVert).toContain('gl_InstanceID');
    expect(cloudVert).not.toContain('gl_VertexID');
    expect(cloudVert).not.toContain('uTargetMatrix');
  });

  it('fragment shader declares GLSL3 output and the uSurface uniform', () => {
    expect(cloudFrag).toContain('out vec4 fragColor');
    expect(cloudFrag).toContain('uSurface');
  });

  it('fragment shader no recorta sprites redondos: la silueta la da la malla', () => {
    expect(cloudFrag).not.toContain('gl_PointCoord');
    expect(cloudFrag).toContain('vShade');
  });
});
