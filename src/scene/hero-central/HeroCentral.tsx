import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { registry } from '../registry';
import { computeAnchorTransform } from '../anchoring';
import { computeBestFitPlane } from './bestFitPlane';
import { glowVertexShader } from './glow.vert';
import { glowFragmentShader } from './glow.frag';
import { scenePalette } from '../scenePalette';
import { motion } from '../../motion/tokens';

const URL = '/models/hero-central/central-v2.glb';
useGLTF.preload(URL);
const HERO_FIT = 0.8;
const LOGO_FIT = 0.9; // fracción de la pantalla que ocupa el logo plano

export function HeroCentral({
  anchorRef,
  animate,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  animate: boolean;
}) {
  const { scene } = useGLTF(URL);
  const group = useRef<THREE.Group>(null);
  const rig = useRef<THREE.Group>(null);
  const size = useThree((s) => s.size);
  const yaw = useRef({ target: 0, current: 0 });

  const { model, maxDim, screen } = useMemo(() => {
    const clone = scene.clone(true);
    clone.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(clone);
    const c = box.getCenter(new THREE.Vector3());
    const d = box.getSize(new THREE.Vector3());

    let screenMesh: THREE.Mesh | null = null;
    clone.traverse((o) => {
      if (o instanceof THREE.Mesh && /screen/i.test(o.name)) screenMesh = o;
    });
    if (!screenMesh) throw new Error('[hero] central-v2.glb: no Screen mesh');
    // TS can't narrow `screenMesh` past the guard above through the
    // traverse() closure (known limitation, same as v1's HeroCentralScene) --
    // the runtime check already guarantees it's a real Mesh here.
    const screenMeshFound = screenMesh as THREE.Mesh;

    // bestFitPlane's real signature (see bestFitPlane.ts) is
    // `computeBestFitPlane(mesh, upHint, frontHint)` -- not the brief's
    // placeholder `computeBestFitPlane(screenMesh)` -- and it returns
    // center/normal in the SAME space as `mesh.matrixWorld` (here, the
    // clone's own root space, since the clone is unparented when this
    // runs, exactly like v1's centralScene). `upHint`/`frontHint` are
    // coarse disambiguation inputs derived the same way v1 derives them:
    // world +Y for "up", and the screen mesh's own bounding-box center
    // relative to the whole model's center for "outward".
    screenMeshFound.geometry.computeBoundingBox();
    const screenWorldBox = screenMeshFound.geometry.boundingBox!.clone().applyMatrix4(screenMeshFound.matrixWorld);
    const upHint = new THREE.Vector3(0, 1, 0);
    const frontHint = screenWorldBox.getCenter(new THREE.Vector3()).sub(c);
    const plane = computeBestFitPlane(screenMeshFound, upHint, frontHint);

    clone.position.sub(c);
    return {
      model: clone,
      maxDim: Math.max(d.x, d.y, d.z),
      screen: { center: plane.center.clone().sub(c), quaternion: plane.quaternion, size: plane.size },
    };
  }, [scene]);

  // Puntero fino solamente; reset al salir
  useEffect(() => {
    if (!animate || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const move = (e: PointerEvent) => {
      yaw.current.target = ((e.clientX / window.innerWidth) * 2 - 1) * motion.parallax.maxYaw;
      registry.markDirty();
    };
    const reset = () => {
      yaw.current.target = 0;
      registry.markDirty();
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerleave', reset);
    window.addEventListener('pointercancel', reset);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerleave', reset);
      window.removeEventListener('pointercancel', reset);
    };
  }, [animate]);

  useEffect(() => {
    // Computed once per `screen` change (not per getMatrix call) -- the
    // local transform never varies frame to frame, only rig's matrixWorld
    // does, so there's nothing to gain from reallocating it every call.
    const local = new THREE.Matrix4().compose(
      screen.center,
      screen.quaternion,
      new THREE.Vector3().setScalar((LOGO_FIT * Math.min(screen.size.x, screen.size.y)) / 2),
    );
    return registry.registerPoseProvider({
      id: 'hero-display',
      surface: 'dark',
      getMatrix: (out) => {
        const g = group.current;
        if (!g || !rig.current) return out.identity();
        // Walk up to `group` (and beyond) AND recompute `rig`'s own local
        // matrix from its current rotation.y, then its matrixWorld --
        // updating `group` alone (`g.updateWorldMatrix(true, false)`)
        // would leave `rig.matrixWorld` one frame stale, since it
        // wouldn't re-derive rig's local matrix from this frame's yaw.
        rig.current.updateWorldMatrix(true, false);
        return out.multiplyMatrices(rig.current.matrixWorld, local);
      },
    });
  }, [screen]);

  useFrame((_, delta) => {
    const g = group.current;
    const el = anchorRef.current;
    if (!g || !el) return;
    const t = computeAnchorTransform(el.getBoundingClientRect(), size, { fit: HERO_FIT, maxDim });
    g.position.set(t.x, t.y, 0);
    g.scale.setScalar(t.scale);
    g.visible = t.visible;
    const travelling = registry.getProgress(0) > motion.tramo.reposoCola;
    const target = travelling ? 0 : yaw.current.target; // congela/decae a 0 durante el viaje
    const k = 1 - Math.exp(-motion.parallax.damping * Math.min(delta, 1 / 30));
    yaw.current.current += (target - yaw.current.current) * k;
    if (rig.current) rig.current.rotation.y = yaw.current.current;
    if (Math.abs(target - yaw.current.current) > 1e-4) registry.markDirty();
  });

  return (
    <group ref={group}>
      <group ref={rig}>
        <primitive object={model} />
        <mesh
          position={screen.center.clone().addScaledVector(new THREE.Vector3(0, 0, 1).applyQuaternion(screen.quaternion), -maxDim * 0.55)}
          quaternion={screen.quaternion}
          renderOrder={-1}
        >
          <planeGeometry args={[maxDim * 3.2, maxDim * 3.2]} />
          <shaderMaterial
            vertexShader={glowVertexShader}
            fragmentShader={glowFragmentShader}
            transparent
            depthWrite={false}
            uniforms={{ uColor: { value: new THREE.Color(scenePalette.glow) }, uIntensity: { value: 0.85 } }}
          />
        </mesh>
      </group>
    </group>
  );
}
