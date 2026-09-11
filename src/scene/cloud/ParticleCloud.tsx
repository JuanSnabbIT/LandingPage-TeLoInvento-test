import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
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
import { sweepFrame, normalizedHalfExtents, poseCenter, poseScale, type SweepFrame } from './sweep';
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

useGLTF.preload(cloudTokens.particleMesh.lod2);

export function ParticleCloud({ manifest, lod, size, reduced, curl }: Props) {
  // El lado de la textura sale del manifest y no de una constante: si se
  // re-hornea con otro LOD, el runtime lo sigue sin que haya que tocar código.
  const S = size ?? manifest.shapes[manifest.sequence[0]]?.[lod]?.size ?? 96;
  const { scene: particleScene } = useGLTF(cloudTokens.particleMesh[lod]);
  const particleGeometry = useMemo(() => {
    let g: THREE.BufferGeometry | null = null;
    particleScene.traverse((o) => { if (!g && o instanceof THREE.Mesh) g = o.geometry; });
    if (!g) throw new Error('[cloud] la malla de partícula no trae geometría');
    // La malla viene descentrada en su propio espacio (bbox de py-lod1:
    // x -0.71..0.36, y -0.27..0.80): sin recentrar, cada partícula queda
    // corrida de la posición que le tocó en el horneado, y la forma entera
    // sale desplazada respecto de su caja.
    const geo = (g as THREE.BufferGeometry).clone();
    geo.computeBoundingBox();
    const c = geo.boundingBox!.getCenter(new THREE.Vector3());
    geo.translate(-c.x, -c.y, -c.z);
    return geo;
  }, [particleScene]);
  const shapes = useShapeTextures(manifest, lod, [TRAMOS[0].from.shape, TRAMOS[0].to!.shape]);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const viewport = useThree((s) => s.size); const gl = useThree((s) => s.gl);
  const uniforms = useMemo(() => ({
    uShapeA: { value: null as THREE.Texture | null }, uShapeB: { value: null as THREE.Texture | null }, uSize: { value: S },
    uParamsA: { value: null as THREE.Texture | null }, uHasColorA: { value: 0 }, uTintA: { value: 0 },
    uParamsB: { value: null as THREE.Texture | null }, uHasColorB: { value: 0 }, uTintB: { value: 0 },
    uPoseA: { value: new THREE.Matrix4() }, uPoseB: { value: new THREE.Matrix4() },
    uT: { value: 0 }, uStagger: { value: cloudTokens.stagger },
    uSpringOmega: { value: cloudTokens.spring.omega }, uSpringZeta: { value: cloudTokens.spring.zeta }, uCurl: { value: cloudTokens.curl }, uCurlOn: { value: curl ? 1 : 0 }, uCurlFreq: { value: cloudTokens.curlFreq },
    uParticleScale: { value: 0 }, uFluye: { value: 0 },
    uCenterA: { value: new THREE.Vector3() }, uCenterB: { value: new THREE.Vector3() }, uSpan: { value: 1 },
    uEdgeScale: { value: cloudTokens.edgeScale }, uFaceScale: { value: cloudTokens.faceScale },
    uBackAlpha: { value: cloudTokens.backAlpha }, uSpin: { value: cloudTokens.spin },
    uOrientNoise: { value: cloudTokens.orientNoise }, uBillboard: { value: cloudTokens.billboard ? 1 : 0 },
    uSweepDir: { value: new THREE.Vector3(0, -1, 0) }, uSweepScale: { value: 0.5 }, uSweepJitter: { value: cloudTokens.sweepJitter },
    uSpread: { value: 1 }, uSizeJitter: { value: cloudTokens.sizeJitter },
    uFluyeDrop: { value: cloudTokens.fluye.drop }, uFluyeCurl: { value: cloudTokens.fluye.curl },
    uSwirl: { value: 0 }, uSwirlRadius: { value: cloudTokens.swirl.radius }, uSwirlTurns: { value: cloudTokens.swirl.turns },
    uColorProdLight: { value: new THREE.Color(scenePalette.productLight) }, uColorProdDark: { value: new THREE.Color(scenePalette.productDark) },
    uColorLogoA: { value: new THREE.Color(scenePalette.logoA) }, uColorLogoB: { value: new THREE.Color(scenePalette.logoB) },
    uSurface: { value: 0 }, uAlpha: { value: 1 }, uAlphaLight: { value: cloudTokens.alphaLight }, uAlphaDark: { value: cloudTokens.alphaDark },
  }), [S, curl]);
  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      v: new THREE.Vector3(),
      half: new THREE.Vector3(1, 1, 1),
      sweep: { dir: new THREE.Vector3(0, -1, 0), scale: 0.5 } as SweepFrame,
      fade: { from: '', to: '', start: 0 },
    }),
    [],
  );
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
    // Las dos puntas del morph llevan su propia textura de parámetros (color +
    // cercanía a arista). Cae a la de A (y no a null) porque un sampler sin
    // textura en WebGL2 lee negro y dispara warnings de "no texture bound".
    // `hasColor` sale del manifest: TODA forma trae params, pero sólo algunas
    // traen color de verdad en el RGB.
    const prA = shapes.getParams(r.a); const prB = texB ? shapes.getParams(r.b) : null;
    u.uParamsA.value = prA ?? texA;
    u.uParamsB.value = prB ?? prA ?? texA;
    u.uHasColorA.value = prA && manifest.shapes[r.a]?.[lod]?.hasColor ? 1 : 0;
    u.uHasColorB.value = prB && manifest.shapes[r.b]?.[lod]?.hasColor ? 1 : 0;
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
    // Una forma se pinta con su color horneado si lo tiene; el logo además se
    // tiñe aunque su .bin falle (cae al degradado por seed). Sin forma B cargada
    // la punta B copia a la A, así la nube quieta no se destiñe hacia nada.
    u.uTintA.value = u.uHasColorA.value || r.a === 'logo' ? 1 : 0;
    u.uTintB.value = texB ? (u.uHasColorB.value || r.b === 'logo' ? 1 : 0) : u.uTintA.value;
    // Tamaño de partícula atado a la escala de la pose activa: la nube se ve
    // con el mismo grano en la franja chica de Capacidades y en la caja grande
    // de Valor, en vez de granulada en una y sólida en la otra.
    const span = THREE.MathUtils.lerp(poseScale(u.uPoseA.value), poseScale(u.uPoseB.value), t);
    u.uParticleScale.value = span * cloudTokens.particleScale;
    // El enjambre respira: se abre a mitad del tramo y se cierra exacto al llegar.
    // El fade de profundidad se mide sobre la nube ABIERTA, no sobre la horneada.
    const spread = 1 + cloudTokens.spread * Math.sin(Math.PI * t);
    u.uSpread.value = spread;
    u.uSpan.value = span * spread;
    poseCenter(u.uPoseA.value, u.uCenterA.value);
    poseCenter(u.uPoseB.value, u.uCenterB.value);
    // Barrido: dirección en espacio de la forma de ORIGEN y factor que la
    // normaliza a su ancho real sobre ese eje (ver sweep.ts). Va contra la pose
    // A y el bbox de la forma A, las dos cosas fijas dentro del tramo, así que
    // el orden de salida no cambia mientras la transición corre.
    const bboxA = manifest.shapes[r.a]?.[lod]?.bbox;
    if (bboxA) normalizedHalfExtents(bboxA, tmp.half); else tmp.half.set(1, 1, 1);
    sweepFrame(u.uPoseA.value, TRAMOS[r.index].sweep, tmp.half, tmp.sweep);
    u.uSweepDir.value.copy(tmp.sweep.dir);
    u.uSweepScale.value = tmp.sweep.scale;
    u.uFluye.value = r.index === 0 ? 1 : 0;
    u.uSwirl.value = r.kind === 'viaje' ? 1 : 0;
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
    <instancedMesh
      args={[undefined, undefined, S * S]}
      frustumCulled={false}
      onBeforeRender={() => {
        const { a, b, t, kind } = rectsRef.current;
        // El margen del corredor tiene que cubrir lo que el enjambre se aparta del
        // eje en vuelo (curl + giro): con 0.2 el giro nuevo llegaba al borde del
        // recorte y las partículas de afuera se cortaban en una línea recta.
        // El margen tiene que cubrir lo que el enjambre se aparta del eje: curl,
        // giro y respiración. En un morph en sitio o un apagado no hay viaje,
        // pero la respiración sí infla la nube, así que 0.2 se quedaba corto.
        const scissor = corridorRect(a, b, kind === 'viaje' ? t : 1, cloudTokens.stagger, kind === 'viaje' ? 0.32 : 0.28, viewport);
        if (scissor) { gl.setScissorTest(true); gl.setScissor(scissor.x, scissor.y, scissor.w, scissor.h); }
      }}
      onAfterRender={() => { gl.setScissorTest(false); }}
    >
      <primitive object={particleGeometry} attach="geometry" />
      <shaderMaterial ref={mat} glslVersion={THREE.GLSL3} vertexShader={cloudVert} fragmentShader={cloudFrag} uniforms={uniforms}
        transparent depthWrite={false} depthTest blending={THREE.NormalBlending} premultipliedAlpha side={THREE.DoubleSide} />
    </instancedMesh>
  );
}
