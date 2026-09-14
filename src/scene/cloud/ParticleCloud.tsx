import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { registry } from '../registry';
import { computeAnchorTransform, anchorMatrix } from '../anchoring';
import { anchorToWorldXY } from '../pageCameraMath';
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

export function ParticleCloud({ manifest, lod, size, reduced, curl }: Props) {
  // El lado de la textura sale del manifest y no de una constante: si se
  // re-hornea con otro LOD, el runtime lo sigue sin que haya que tocar código.
  const S = size ?? manifest.shapes[manifest.sequence[0]]?.[lod]?.size ?? 96;
  const particleGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(S * S * 3), 3));
    return geo;
  }, [S]);
  const networks = useMemo(() => [new THREE.BufferGeometry(), new THREE.BufferGeometry()], []);
  const networkRefs = useRef<Array<THREE.LineSegments | null>>([]);
  const networkData = useRef<Array<Float32Array | undefined>>([]);
  const protectedElements = useRef<Element[]>([]);
  useEffect(() => {
    // Sólo el TEXTO de la tarjeta del carrusel, no la tarjeta entera: la caja
    // de escena vive adentro de `.capacidades__card`, y proteger el wrapper
    // descartaba todos los fragmentos del modelo (el `p` ya entra por `section p`).
    protectedElements.current = [...document.querySelectorAll('header, section h1, section h2, section p, section ul, section ol, .capacidades__card h3, form, .scene-caption')];
  }, []);
  useEffect(() => () => { particleGeometry.dispose(); networks.forEach(g => g.dispose()); }, [particleGeometry, networks]);
  const shapes = useShapeTextures(manifest, lod, [TRAMOS[0].from.shape, TRAMOS[0].to!.shape]);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const viewport = useThree((s) => s.size); const gl = useThree((s) => s.gl);
  const uniforms = useMemo(() => ({
    uViewportHeight: { value: 1 }, uPixelRatio: { value: 1 }, uNetworkRole: { value: -1 },
    uProtectedCount: { value: 0 }, uProtected: { value: Array.from({ length: 24 }, () => new THREE.Vector4()) },
    uRigid: { value: 0 },
    uShapeA: { value: null as THREE.Texture | null }, uShapeB: { value: null as THREE.Texture | null }, uSize: { value: S },
    uParamsA: { value: null as THREE.Texture | null }, uHasColorA: { value: 0 }, uTintA: { value: 0 },
    uParamsB: { value: null as THREE.Texture | null }, uHasColorB: { value: 0 }, uTintB: { value: 0 },
    uPoseA: { value: new THREE.Matrix4() }, uPoseB: { value: new THREE.Matrix4() },
    uT: { value: 0 }, uStagger: { value: cloudTokens.stagger },
    uCurl: { value: cloudTokens.curl }, uCurlOn: { value: curl ? 1 : 0 }, uCurlFreq: { value: cloudTokens.curlFreq },
    uParticleScale: { value: 0 },
    uCenterA: { value: new THREE.Vector3() }, uCenterB: { value: new THREE.Vector3() }, uSpan: { value: 1 },
    uEdgeScale: { value: cloudTokens.edgeScale }, uFaceScale: { value: cloudTokens.faceScale },
    uBackAlpha: { value: cloudTokens.backAlpha },
    uSweepDir: { value: new THREE.Vector3(0, -1, 0) }, uSweepScale: { value: 0.5 }, uSweepJitter: { value: cloudTokens.sweepJitter },
    uSpread: { value: 1 }, uSizeJitter: { value: cloudTokens.sizeJitter },
    uSwirl: { value: 0 }, uSwirlRadius: { value: cloudTokens.swirl.radius }, uSwirlTurns: { value: cloudTokens.swirl.turns },
    uTime: { value: 0 }, uFlame: { value: 0 }, uFlameFreq: { value: cloudTokens.flame.freq }, uFlameSpeed: { value: cloudTokens.flame.speed }, uFlameFlicker: { value: cloudTokens.flame.flicker },
    uPointer: { value: new THREE.Vector3() }, uPointerOn: { value: 0 }, uPointerRadius: { value: cloudTokens.pointer.radius }, uPointerPush: { value: cloudTokens.pointer.push },
    uColorProdLight: { value: new THREE.Color(scenePalette.productLight) }, uColorProdDark: { value: new THREE.Color(scenePalette.productDark) },
    uColorLogoA: { value: new THREE.Color(scenePalette.logoA) }, uColorLogoB: { value: new THREE.Color(scenePalette.logoB) },
    uSurface: { value: 0 }, uAlpha: { value: 1 }, uAlphaLight: { value: cloudTokens.alphaLight }, uAlphaDark: { value: cloudTokens.alphaDark },
  }), [S, curl]);
  const networkUniforms = useMemo(() => [0, 1].map(role => ({ ...uniforms, uNetworkRole: { value: role } })), [uniforms]);
  const tmp = useMemo(
    () => ({
      half: new THREE.Vector3(1, 1, 1),
      sweep: { dir: new THREE.Vector3(0, -1, 0), scale: 0.5 } as SweepFrame,
      fade: { from: '', to: '', start: 0 },
      // Puntero: objetivo en fracción de viewport, posición amortiguada en mundo (z = 0) y `on` (0..1) para que el empuje aparezca/desaparezca suave.
      pointer: { target: new THREE.Vector2(0.5, 0.5), has: false, on: 0, onTarget: 0, world: new THREE.Vector3() },
      // Parallax: yaw/pitch amortiguados en [-1, 1]; cada slot con `parallax` los escala a su giro máximo.
      parallax: { yaw: 0, pitch: 0 },
      q: new THREE.Quaternion(), euler: new THREE.Euler(),
    }),
    [],
  );
  // Puntero fino solamente (sin hover no hay interacción); con reduced-motion, nada se mueve con el mouse.
  useEffect(() => {
    if (reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const ptr = tmp.pointer;
    const move = (e: PointerEvent) => {
      ptr.target.set(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
      ptr.has = true; ptr.onTarget = 1;
      registry.markDirty();
    };
    const leave = () => { ptr.onTarget = 0; registry.markDirty(); };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('mouseleave', leave);
    window.addEventListener('pointercancel', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('mouseleave', leave);
      window.removeEventListener('pointercancel', leave);
    };
  }, [reduced, tmp]);
  const rectsRef = useRef<{ a: DOMRectReadOnly | null; b: DOMRectReadOnly | null; t: number; kind: TramoKind }>({ a: null, b: null, t: 1, kind: 'apagado' });

  const rectFor = (slot: string): DOMRectReadOnly | null => {
    const el = registry.getSlot(slot)?.anchorRef.current;
    return el ? el.getBoundingClientRect() : null;
  };

  /** `weight`: cuánto del parallax del slot aplica (1 en reposo; en un viaje, el origen lo pierde y el destino lo gana con `t`). */
  const poseFor = (slot: string, out: THREE.Matrix4, weight: number): { surface: number; visible: boolean } => {
    const prov = registry.getPoseProvider(slot);
    if (prov) { prov.getMatrix(out); return { surface: prov.surface === 'light' ? 1 : 0, visible: true }; }
    const s = registry.getSlot(slot); const el = s?.anchorRef.current;
    if (!s || !el) { out.identity(); return { surface: 1, visible: false }; }
    const t = computeAnchorTransform(el.getBoundingClientRect(), viewport, { fit: s.fit, maxDim: BBOX_MAXDIM });
    const extra = s.parallax && !reduced
      ? tmp.q.setFromEuler(tmp.euler.set(tmp.parallax.pitch * s.parallax * 0.5 * weight, tmp.parallax.yaw * s.parallax * weight, 0, 'XYZ'))
      : undefined;
    anchorMatrix(t, s.pose, out, extra); return { surface: s.surface === 'light' ? 1 : 0, visible: t.visible };
  };

  useFrame((state, delta) => {
    const m = mat.current; if (!m) return;
    const r = resolveTramo((i) => registry.getProgress(i), TRAMOS, { ...motion.tramo, reduced });
    // Puntero y parallax, amortiguados: piden un frame más mientras no convergen (misma idea que el crossfade de abajo).
    const dt = Math.min(delta, 1 / 30);
    const ptr = tmp.pointer; const par = tmp.parallax;
    if (ptr.has) {
      const kp = 1 - Math.exp(-cloudTokens.pointer.damping * dt);
      const w = anchorToWorldXY(ptr.target.x, ptr.target.y, viewport.width / Math.max(viewport.height, 1));
      // oxlint-disable-next-line react/immutability -- scratch memoizado mutado dentro de useFrame, patrón documentado de r3f (docs 3d-web-standard §7); estado de React acá sería un render por frame
      ptr.world.x += (w.x - ptr.world.x) * kp; ptr.world.y += (w.y - ptr.world.y) * kp;
      ptr.on += (ptr.onTarget - ptr.on) * kp;
      const ty = (ptr.target.x * 2 - 1) * ptr.on, tp = (ptr.target.y * 2 - 1) * ptr.on;
      const kr = 1 - Math.exp(-motion.parallax.damping * dt);
      par.yaw += (ty - par.yaw) * kr; par.pitch += (tp - par.pitch) * kr;
      if (Math.abs(w.x - ptr.world.x) + Math.abs(w.y - ptr.world.y) > 1e-3 || Math.abs(ptr.onTarget - ptr.on) > 1e-3 || Math.abs(ty - par.yaw) + Math.abs(tp - par.pitch) > 1e-3) registry.markDirty();
    }
    // `.catch(() => {})`, no `void`: el cargador ya avisa por consola y esto
    // corre por frame -- una promesa rechazada sin manejar por frame llena la
    // consola de `unhandledrejection` y ensucia cualquier reporte de errores.
    if (!shapes.ready(r.a)) shapes.ensure(r.a).catch(() => {});
    if (!shapes.ready(r.b)) shapes.ensure(r.b).catch(() => {});
    const next = TRAMOS[r.index + 1]?.to?.shape; if (next && !shapes.ready(next)) shapes.ensure(next).catch(() => {});
    const texA = shapes.get(r.a); const texB = shapes.get(r.b);
    if (!texA) { m.visible = false; return; }
    const u = m.uniforms;
    u.uViewportHeight.value = viewport.height;
    u.uPixelRatio.value = gl.getPixelRatio();
    let protectedCount = 0;
    for (const element of protectedElements.current) {
      const box = element.getBoundingClientRect();
      if (box.bottom <= 0 || box.top >= viewport.height || protectedCount >= 24) continue;
      u.uProtected.value[protectedCount++].set(box.left - 5, viewport.height - box.bottom - 5, box.right + 5, viewport.height - box.top + 5).multiplyScalar(gl.getPixelRatio());
    }
    u.uProtectedCount.value = protectedCount;
    [r.a, r.b].forEach((name, i) => {
      const ids = shapes.getLinks(name);
      if (ids !== networkData.current[i]) {
        networkData.current[i] = ids;
        const geo = networks[i];
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((ids?.length ?? 0) * 3), 3));
        geo.setAttribute('particleIndex', new THREE.BufferAttribute(ids ?? new Float32Array(), 1));
        geo.setDrawRange(0, ids?.length ?? 0);
      }
    });
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
    const rigid = r.kind === 'morphEnSitio' || r.kind === 'apagado';
    u.uRigid.value = rigid ? 1 : 0;
    u.uStagger.value = rigid ? 0 : cloudTokens.stagger;
    u.uCurlOn.value = curl && !rigid ? 1 : 0;
    const pa = poseFor(r.slotA, u.uPoseA.value, r.kind === 'viaje' ? 1 - t : 1); const pb = poseFor(r.slotB, u.uPoseB.value, r.kind === 'viaje' ? t : 1);
    u.uPointer.value.copy(ptr.world); u.uPointerOn.value = ptr.on;
    u.uTime.value = state.clock.elapsedTime;
    // Formas con partículas animadas (la llama del logo): la nube pide frames seguidos mientras esté a la vista.
    const animated = !!(manifest.shapes[r.a]?.[lod]?.animated || (texB && manifest.shapes[r.b]?.[lod]?.animated));
    u.uFlame.value = animated && !reduced ? cloudTokens.flame.amp : 0;
    if (r.kind === 'apagado') u.uPoseB.value.copy(u.uPoseA.value);
    const rectA = rectFor(r.slotA);
    const rectB = rectFor(r.slotB);
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
    const spread = rigid ? 1 : 1 + cloudTokens.spread * Math.sin(Math.PI * t);
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
    networkRefs.current.forEach(n => { if (n) n.visible = m.visible; });
    if (u.uFlame.value > 0 && m.visible) registry.markDirty();
  });

  const beforeRender = () => {
    const { a, b, t, kind } = rectsRef.current;
    const scissor = corridorRect(a, b, kind === 'viaje' ? t : 1, cloudTokens.stagger, 0.32, viewport);
    if (scissor) { gl.setScissorTest(true); gl.setScissor(scissor.x, scissor.y, scissor.w, scissor.h); }
  };
  const afterRender = () => gl.setScissorTest(false);
  return (
    <group>
      {networks.map((geometry, i) => (
        <lineSegments key={i} ref={n => { networkRefs.current[i] = n; }} geometry={geometry} frustumCulled={false}
          onBeforeRender={beforeRender} onAfterRender={afterRender}>
          <shaderMaterial glslVersion={THREE.GLSL3} defines={{ SURFACE_LINES: 1 }}
            vertexShader={cloudVert} fragmentShader={cloudFrag} uniforms={networkUniforms[i]}
            transparent depthWrite={false} depthTest premultipliedAlpha />
        </lineSegments>
      ))}
      <points geometry={particleGeometry} frustumCulled={false} onBeforeRender={beforeRender} onAfterRender={afterRender}>
        <shaderMaterial ref={mat} glslVersion={THREE.GLSL3} vertexShader={cloudVert} fragmentShader={cloudFrag} uniforms={uniforms}
          transparent depthWrite={false} depthTest premultipliedAlpha />
      </points>
    </group>
  );
}
