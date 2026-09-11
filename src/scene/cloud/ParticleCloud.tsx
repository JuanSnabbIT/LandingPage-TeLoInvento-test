import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { registry } from '../registry';
import { computeAnchorTransform, anchorMatrix } from '../anchoring';
import { scenePalette } from '../scenePalette';
import { motion } from '../../motion/tokens';
import { TRAMOS, resolveTramo, type TramoKind } from './sequence';
import { corridorRect } from './scissor';
import { useShapeTextures } from './useShapeTextures';
import { cloudVert } from './cloud.vert';
import { cloudFrag } from './cloud.frag';
import { cloudTokens } from './cloudTokens';
import type { Manifest } from './shapeLoader';

interface Props { manifest: Manifest; lod: 'lod2' | 'mobile'; size?: number; reduced: boolean; curl: boolean }
const BBOX_MAXDIM = 2; // formas normalizadas a [-1,1]

/**
 * Caja sintética del destino del tramo 'apagado': la nube no viaja a otro slot,
 * cae y se desvanece bajo el último. La pose B la baja 1.5 y la escala x1.6 en
 * los tres ejes, así que el corredor del scissor tiene que crecer igual en las
 * dos direcciones: 1.5 + 1 alturas hacia abajo (de ahí height x2.5) y x1.6 de
 * ancho alrededor de su centro. Sin el ensanche el recorte cortaba los bordes
 * laterales del enjambre mientras se apagaba.
 */
function apagadoRect(a: DOMRectReadOnly): DOMRectReadOnly {
  const cx = a.left + a.width / 2; const width = a.width * 1.6;
  const left = cx - width / 2;
  return { left, right: left + width, width, top: a.top, bottom: a.bottom + 1.5 * a.height, height: a.height * 2.5 } as DOMRectReadOnly;
}

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
    uFluyeDrop: { value: cloudTokens.fluye.drop }, uFluyeCurl: { value: cloudTokens.fluye.curl },
    uColorProdLight: { value: new THREE.Color(scenePalette.productLight) }, uColorProdDark: { value: new THREE.Color(scenePalette.productDark) },
    uColorLogoA: { value: new THREE.Color(scenePalette.logoA) }, uColorLogoB: { value: new THREE.Color(scenePalette.logoB) },
    uSurface: { value: 0 }, uLogoTint: { value: 1 }, uAlpha: { value: 1 }, uAlphaLight: { value: cloudTokens.alphaLight }, uAlphaDark: { value: cloudTokens.alphaDark },
  }), [S, lod, curl]);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), fade: { from: '', to: '', start: 0 } }), []);
  const heroAnchorRef = useRef<HTMLElement | null>(null);
  const rectsRef = useRef<{ a: DOMRectReadOnly | null; b: DOMRectReadOnly | null; t: number; kind: TramoKind }>({ a: null, b: null, t: 1, kind: 'apagado' });

  const rectFor = (slot: string): DOMRectReadOnly | null => {
    if (slot === 'hero-display') {
      if (!heroAnchorRef.current) heroAnchorRef.current = document.querySelector('.hero__anchor');
      return heroAnchorRef.current?.getBoundingClientRect() ?? null;
    }
    const el = registry.getSlot(slot)?.anchorRef.current;
    return el ? el.getBoundingClientRect() : null;
  };

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
    // `.catch(() => {})`, no `void`: el cargador ya avisa por consola y esto
    // corre por frame -- una promesa rechazada sin manejar por frame llena la
    // consola de `unhandledrejection` y ensucia cualquier reporte de errores.
    if (!shapes.ready(r.a)) shapes.ensure(r.a).catch(() => {});
    if (!shapes.ready(r.b)) shapes.ensure(r.b).catch(() => {});
    const next = TRAMOS[r.index + 1]?.to?.shape; if (next && !shapes.ready(next)) shapes.ensure(next).catch(() => {});
    const texA = shapes.get(r.a); const texB = shapes.get(r.b);
    if (!texA) { m.visible = false; return; }
    const u = m.uniforms;
    u.uShapeA.value = texA; u.uShapeB.value = texB ?? texA;
    // `t` efectivo: con la forma B sin cargar la nube espera en A, y TODO lo que
    // depende del progreso (posición, superficie, tinte del logo, alpha del
    // viaje) tiene que usar el mismo valor. Con `r.t` en el color y 0 en la
    // geometría, la nube quieta en A se teñía del color del destino.
    const t = texB ? r.t : 0;
    u.uT.value = t;
    const pa = poseFor(r.slotA, u.uPoseA.value); const pb = poseFor(r.slotB, u.uPoseB.value);
    if (r.kind === 'apagado') { u.uPoseB.value.copy(u.uPoseA.value).multiply(tmp.m.makeTranslation(0, -1.5, 0)).multiply(tmp.m.makeScale(1.6, 1.6, 1.6)); }
    const rectA = rectFor(r.slotA);
    const rectB = r.kind === 'apagado' && rectA ? apagadoRect(rectA) : rectFor(r.slotB);
    rectsRef.current = { a: rectA, b: rectB, t, kind: r.kind };
    u.uSurface.value = THREE.MathUtils.lerp(pa.surface, pb.surface, t);
    u.uLogoTint.value = r.a === 'logo' ? 1 - t : r.b === 'logo' ? t : 0;
    u.uFluye.value = r.index === 0 ? 1 : 0;
    u.uPixelRatio.value = gl.getPixelRatio();
    let alpha = r.alpha;
    if (r.crossfade) { // reduced: fundido de alpha de 200 ms al cambiar la forma efectiva
      const eff = t >= 1 ? r.b : r.a;
      // oxlint-disable-next-line react/immutability -- mutar un objeto scratch memoizado dentro de useFrame es el patrón documentado de r3f (docs 3d-web-standard, sección 7): asignar estado por frame forzaría un render por frame
      if (tmp.fade.to !== eff) { tmp.fade.from = tmp.fade.to; tmp.fade.to = eff; tmp.fade.start = state.clock.elapsedTime; registry.markDirty(); }
      const k = Math.min(1, (state.clock.elapsedTime - tmp.fade.start) / motion.duration.crossfade);
      alpha *= 0.3 + 0.7 * k; if (k < 1) registry.markDirty();
    }
    if (r.kind === 'viaje') alpha *= 1 - cloudTokens.travelDip * Math.sin(Math.PI * t);
    u.uAlpha.value = alpha;
    m.visible = alpha > 0.01 && (pa.visible || pb.visible || r.kind === 'apagado');
  });

  return (
    <points
      geometry={geometry}
      frustumCulled={false}
      onBeforeRender={() => {
        const { a, b, t, kind } = rectsRef.current;
        const scissor = corridorRect(a, b, kind === 'viaje' ? t : 1, cloudTokens.stagger, 0.2, viewport);
        if (scissor) { gl.setScissorTest(true); gl.setScissor(scissor.x, scissor.y, scissor.w, scissor.h); }
      }}
      onAfterRender={() => { gl.setScissorTest(false); }}
    >
      <shaderMaterial ref={mat} glslVersion={THREE.GLSL3} vertexShader={cloudVert} fragmentShader={cloudFrag} uniforms={uniforms}
        transparent depthWrite={false} depthTest blending={THREE.NormalBlending} premultipliedAlpha />
    </points>
  );
}
