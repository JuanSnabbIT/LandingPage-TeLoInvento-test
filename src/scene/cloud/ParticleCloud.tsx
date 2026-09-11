import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { registry } from '../registry';
import { computeAnchorTransform, anchorMatrix } from '../anchoring';
import { scenePalette } from '../scenePalette';
import { motion } from '../../motion/tokens';
import { TRAMOS, resolveTramo } from './sequence';
import { useShapeTextures } from './useShapeTextures';
import { cloudVert } from './cloud.vert';
import { cloudFrag } from './cloud.frag';
import { cloudTokens } from './cloudTokens';
import type { Manifest } from './shapeLoader';

interface Props { manifest: Manifest; lod: 'lod2' | 'mobile'; size?: number; reduced: boolean; curl: boolean }
const BBOX_MAXDIM = 2; // formas normalizadas a [-1,1]

export function ParticleCloud({ manifest, lod, size, reduced, curl }: Props) {
  const S = size ?? (lod === 'lod2' ? 256 : 128);
  const shapes = useShapeTextures(manifest, lod, [TRAMOS[0].from.shape, TRAMOS[0].to!.shape]);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const viewport = useThree((s) => s.size); const gl = useThree((s) => s.gl);
  const geometry = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(S * S * 3), 3)); return g; }, [S]);
  const uniforms = useMemo(() => ({
    uShapeA: { value: null as THREE.Texture | null }, uShapeB: { value: null as THREE.Texture | null }, uSize: { value: S },
    uPoseA: { value: new THREE.Matrix4() }, uPoseB: { value: new THREE.Matrix4() },
    uT: { value: 0 }, uStagger: { value: cloudTokens.stagger }, uCurl: { value: cloudTokens.curl }, uCurlOn: { value: curl ? 1 : 0 }, uCurlFreq: { value: cloudTokens.curlFreq },
    uPointSize: { value: cloudTokens.pointSize[lod] }, uPixelRatio: { value: 1 }, uFluye: { value: 0 },
    uColorProdLight: { value: new THREE.Color(scenePalette.productLight) }, uColorProdDark: { value: new THREE.Color(scenePalette.productDark) },
    uColorLogoA: { value: new THREE.Color(scenePalette.logoA) }, uColorLogoB: { value: new THREE.Color(scenePalette.logoB) },
    uSurface: { value: 0 }, uLogoTint: { value: 1 }, uAlpha: { value: 1 }, uAlphaLight: { value: cloudTokens.alphaLight }, uAlphaDark: { value: cloudTokens.alphaDark },
  }), [S, lod, curl]);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), fade: { from: '', to: '', start: 0 } }), []);

  const poseFor = (slot: string, out: THREE.Matrix4): { surface: number; visible: boolean } => {
    const prov = registry.getPoseProvider(slot);
    if (prov) { prov.getMatrix(out); return { surface: prov.surface === 'light' ? 1 : 0, visible: true }; }
    const s = registry.getSlot(slot); const el = s?.anchorRef.current;
    if (!s || !el) { out.identity(); return { surface: 1, visible: false }; }
    const t = computeAnchorTransform(el.getBoundingClientRect(), viewport, { fit: s.fit, maxDim: BBOX_MAXDIM });
    anchorMatrix(t, s.pose, out); return { surface: s.surface === 'light' ? 1 : 0, visible: t.visible };
  };

  useFrame((state) => {
    const m = mat.current; if (!m) return;
    const r = resolveTramo((i) => registry.getProgress(i), TRAMOS, { ...motion.tramo, reduced });
    if (!shapes.ready(r.a)) void shapes.ensure(r.a);
    if (!shapes.ready(r.b)) void shapes.ensure(r.b);
    const next = TRAMOS[r.index + 1]?.to?.shape; if (next && !shapes.ready(next)) void shapes.ensure(next);
    const texA = shapes.get(r.a); const texB = shapes.get(r.b);
    if (!texA) { m.visible = false; return; }
    const u = m.uniforms;
    u.uShapeA.value = texA; u.uShapeB.value = texB ?? texA;
    u.uT.value = texB ? r.t : 0;                       // forma B no cargada: esperar en A
    const pa = poseFor(r.slotA, u.uPoseA.value); const pb = poseFor(r.slotB, u.uPoseB.value);
    if (r.kind === 'apagado') { u.uPoseB.value.copy(u.uPoseA.value).multiply(tmp.m.makeTranslation(0, -1.5, 0)).multiply(tmp.m.makeScale(1.6, 1.6, 1.6)); }
    u.uSurface.value = THREE.MathUtils.lerp(pa.surface, pb.surface, r.t);
    u.uLogoTint.value = r.a === 'logo' ? 1 - r.t : r.b === 'logo' ? r.t : 0;
    u.uFluye.value = r.index === 0 ? 1 : 0;
    u.uPixelRatio.value = gl.getPixelRatio();
    let alpha = r.alpha;
    if (r.crossfade) { // reduced: fundido de alpha de 200 ms al cambiar la forma efectiva
      const eff = r.t >= 1 ? r.b : r.a;
      if (tmp.fade.to !== eff) { tmp.fade.from = tmp.fade.to; tmp.fade.to = eff; tmp.fade.start = state.clock.elapsedTime; registry.markDirty(); }
      const k = Math.min(1, (state.clock.elapsedTime - tmp.fade.start) / motion.duration.crossfade);
      alpha *= 0.3 + 0.7 * k; if (k < 1) registry.markDirty();
    }
    u.uAlpha.value = alpha;
    m.visible = alpha > 0.01 && (pa.visible || pb.visible || r.kind === 'apagado');
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial ref={mat} glslVersion={THREE.GLSL3} vertexShader={cloudVert} fragmentShader={cloudFrag} uniforms={uniforms}
        transparent depthWrite={false} depthTest blending={THREE.NormalBlending} premultipliedAlpha />
    </points>
  );
}
