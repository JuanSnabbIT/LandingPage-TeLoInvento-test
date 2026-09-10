import { useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useLogoParticles } from './useLogoParticles';
import { buildDisplayParticleGeometry } from './displayParticles';
import { computeBestFitPlane } from './bestFitPlane';
import { particleVertexShader } from './particle.vert';
import { particleFragmentShader } from './particle.frag';
import { glowVertexShader } from './glow.vert';
import { glowFragmentShader } from './glow.frag';
import { anchorToWorldXY, viewportWorldHeight } from '../../components/canvas/pageCameraMath';
import type { ViewportAnchor } from '../../hooks/useElementViewportAnchor';
import { useNormalizedPointer } from '../../hooks/useNormalizedPointer';

const CENTRAL_URL = '/models/hero-central/central-lod1.glb';

interface HeroCentralSceneProps {
  maxParticles: number;
  /** false when prefers-reduced-motion is set -- mouse parallax is skipped/neutral. */
  animate: boolean;
  /** Where the Central+logo unit should sit on screen -- see useElementViewportAnchor. */
  anchor: ViewportAnchor;
  /**
   * 0..1, scroll-driven (currently a leva debug slider -- see
   * useDisplayProgress.ts; no real scroll trigger exists yet, that's a
   * later task). Drives the local flat->exploded dispersal mix only --
   * NOT scroll-linked travel to another section, that's future work. A
   * content-position change, not "motion" in the prefers-reduced-motion
   * sense -- read every frame regardless of `animate`.
   */
  progressRef: RefObject<number>;
}

// How tall the Central should read on screen, as a fraction of the full
// viewport height. Not locked -- raised from an earlier 0.34 per the
// visual-polish follow-up (project owner enlarged .hero__anchor's
// reserved layout space and asked for the Device to read as the dominant
// hero visual, closer to a real product-shot reference). Eyeballed
// against that reference on one dev machine.
const TARGET_HEIGHT_FRACTION = 0.58;

// Glow: how much bigger than the Device's own maxDim the glow plane is,
// and how far behind the screen (along its real normal) it sits. Both
// eyeballed -- the glow should clearly extend past the Device's silhouette
// on every side without looking like a separate hard-edged shape.
const GLOW_SIZE_FACTOR = 3.2;
const GLOW_DEPTH_FACTOR = 0.55;
const GLOW_COLOR = '#8fb4ff';
const GLOW_INTENSITY = 0.85;

// Mouse-parallax tilt range for ParallaxRig -- a device tilting to follow
// the cursor, not a toy spinning around. Not locked -- eyeballed.
// Horizontal-only per the follow-up: no pitch/vertical-mouse component
// anymore, only yaw (rotation around the vertical/Y axis) driven by
// horizontal mouse movement. Raised from an earlier 0.22 ("un poco más
// fuerte" -- a moderate bump, not extreme) to read as noticeably more
// responsive while still damped/smooth, not twitchy.
const MAX_YAW_RAD = 0.34; // ~19.5°, left/right
// Exponential-decay damping factor (per second) -- higher = snappier.
// Frame-rate independent: smoothing = 1 - exp(-ROTATION_DAMPING_SPEED * delta).
// Unchanged -- still felt right at the larger yaw range when tested.
const ROTATION_DAMPING_SPEED = 6;

export function HeroCentralScene({ maxParticles, animate, anchor, progressRef }: HeroCentralSceneProps) {
  const { scene: centralScene } = useGLTF(CENTRAL_URL);
  const logoGeometry = useLogoParticles(maxParticles);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const parallaxRigRef = useRef<THREE.Group>(null);
  const size = useThree((state) => state.size);
  const pointerRef = useNormalizedPointer();

  // Everything derived from the Device's OWN geometry. `displayGeometry`
  // carries BOTH the flat resting position (as the standard `position`
  // attribute) and the exploded/dispersed target (`explodedPosition`) --
  // see displayParticles.ts. Nothing here is recomputed per frame; the
  // shader only mixes between the two via `uProgress`.
  const {
    displayGeometry,
    displayAnchorPosition,
    displayAnchorQuaternion,
    neutralPoseQuaternion,
    glowPosition,
    glowQuaternion,
    glowSize,
    overallCenter,
    maxDim,
  } = useMemo(() => {
    centralScene.updateWorldMatrix(true, true);

    let screenMesh: THREE.Mesh | null = null;
    const overallBox = new THREE.Box3();

    centralScene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.computeBoundingBox();
      const box = child.geometry.boundingBox!.clone().applyMatrix4(child.matrixWorld);
      overallBox.union(box);
      if (/screen/i.test(child.name)) {
        screenMesh = child;
      }
    });

    if (!screenMesh) {
      throw new Error(
        '[hero-central] central-lod1.glb has no mesh matching /screen/i -- cannot derive the display plane. Refusing to fall back to a guessed orientation.',
      );
    }
    // TS narrows `screenMesh` to `never` past the guard above (a known
    // limitation with a `let` only ever reassigned inside a callback) --
    // the runtime check above already guarantees it's a real Mesh here.
    const screenMeshFound = screenMesh as THREE.Mesh;

    const overallSize = overallBox.getSize(new THREE.Vector3());
    const overallCenter = overallBox.getCenter(new THREE.Vector3());
    const maxDim = Math.max(overallSize.x, overallSize.y, overallSize.z, 0.001);

    // DisplayAnchor's real orientation -- plane-orientation follow-up fix.
    // The previous version derived this from a bounding-box-center
    // heuristic (frontNormal = normalize(screenCenter - overallCenter)),
    // which doesn't match the screen's actual incline: verified the
    // ScreenPanel glTF node has an identity local transform (no
    // rotation/translation/scale), so any tilt is baked into its vertex
    // positions, not readable off the node. Best-fit plane via PCA on the
    // mesh's own vertices is the correct source of truth here -- see
    // bestFitPlane.ts for why this doesn't suffer the front/back
    // face-normal cancellation a closed glass volume would otherwise
    // cause. `upHint`/`frontHint` are only coarse disambiguation inputs
    // (which in-plane axis is "up," which normal sign is "outward") --
    // the plane itself (center, normal, width/height) is 100% derived
    // from the mesh's real geometry, not assumed.
    const upHint = new THREE.Vector3(0, 1, 0);
    const screenWorldBox = screenMeshFound.geometry.boundingBox!.clone().applyMatrix4(screenMeshFound.matrixWorld);
    const frontHint = screenWorldBox.getCenter(new THREE.Vector3()).sub(overallCenter);
    const plane = computeBestFitPlane(screenMeshFound, upHint, frontHint);

    // Neutral-pose fix: the Device's screen is authored facing
    // `plane.normal` (~34° off pure +Z -- see the plane-orientation
    // follow-up), NOT straight at the page camera (which looks down -Z).
    // Mouse-parallax yaw/pitch already targets exactly 0 at rest, so
    // ParallaxRig itself was never the source of the "not dead-on at
    // rest" bug -- the Device's OWN authored orientation was. Fix: a
    // fixed (non-animated) corrective rotation, applied to a group
    // between ParallaxRig and the Device/DisplayAnchor.
    //
    // Roll-bug follow-up: a plain `setFromUnitVectors(normal, +Z)` only
    // pins the normal -- it leaves rotation AROUND that axis (roll)
    // unconstrained, so three.js picks an arbitrary twist, which is
    // exactly the visible tilt the project owner reported. Fix: use the
    // FULL orthonormal basis (uAxis/vAxis/normal, already up-aligned
    // from the plane-orientation PCA fix), not the bare normal. Build the
    // rotation matrix whose columns are that basis (maps canonical
    // axes -> the Device's authored frame), then invert it (== transpose,
    // it's orthonormal) to get the rotation that carries the Device's
    // authored frame INTO the canonical upright/front-facing one:
    // uAxis -> world +X, vAxis -> world +Y ("up," pinning down roll),
    // normal -> world +Z (facing the page camera).
    const planeBasisMatrix = new THREE.Matrix4().makeBasis(plane.uAxis, plane.vAxis, plane.normal);
    const neutralPoseQuaternion = new THREE.Quaternion().setFromRotationMatrix(planeBasisMatrix).invert();

    logoGeometry.computeBoundingBox();
    const logoSize = logoGeometry.boundingBox!.getSize(new THREE.Vector3());

    const FIT = 0.78;
    const fitScale =
      logoSize.x > 0 && logoSize.y > 0
        ? FIT * Math.min(plane.size.x / logoSize.x, plane.size.y / logoSize.y)
        : 0.02;

    const displayGeometry = buildDisplayParticleGeometry({
      logoGeometry,
      fitScale,
      // Real per-plane width/height (its own local 2D basis), not an
      // axis-aligned Box3 -- z isn't used by buildDisplayParticleGeometry.
      screenSize: new THREE.Vector3(plane.size.x, plane.size.y, 0),
      maxDim,
    });

    // Glow placement: behind the screen's REAL surface, along its real
    // normal (not a hardcoded world axis) -- same `plane.center`/
    // `plane.normal` already trusted for the particles above, so the
    // glow sits directly behind the display rather than at some
    // arbitrary offset. Expressed in the same Device-local space as
    // Device/DisplayAnchor (both children of NeutralPoseCorrection
    // below), so it inherits the exact same fixed correction + per-frame
    // mouse rotation as the rest of the rig -- no separate parallax math.
    const glowPosition = plane.center.clone().addScaledVector(plane.normal, -maxDim * GLOW_DEPTH_FACTOR);
    const glowSize = maxDim * GLOW_SIZE_FACTOR;

    return {
      displayGeometry,
      displayAnchorPosition: plane.center,
      displayAnchorQuaternion: plane.quaternion,
      neutralPoseQuaternion,
      glowPosition,
      glowQuaternion: plane.quaternion,
      glowSize,
      overallCenter,
      maxDim,
    };
  }, [centralScene, logoGeometry]);

  // Where the whole Central+logo unit sits on the page, derived from the
  // DOM anchor instead of a camera framed around the model itself.
  const { groupPosition, groupScale } = useMemo(() => {
    const aspect = size.width / Math.max(size.height, 1);
    const { x, y } = anchorToWorldXY(anchor.u, anchor.v, aspect);
    const desiredWorldSize = TARGET_HEIGHT_FRACTION * viewportWorldHeight();

    return {
      groupPosition: [x, y, 0] as [number, number, number],
      groupScale: desiredWorldSize / maxDim,
    };
  }, [anchor.u, anchor.v, size.width, size.height, maxDim]);

  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uFrequency: { value: 0.55 },
      uSize: { value: 2.1 },
      uPixelRatio: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1 },
      uColorA: { value: new THREE.Color('#f5a623') },
      uColorB: { value: new THREE.Color('#2b95c3') },
    }),
    [],
  );

  // Static -- no time uniform, no per-frame update anywhere for this.
  const glowUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(GLOW_COLOR) },
      uIntensity: { value: GLOW_INTENSITY },
    }),
    [],
  );

  useFrame((_, delta) => {
    // Scroll-driven progress: a content-position change, not "motion" in
    // the prefers-reduced-motion sense, so it's read every frame
    // unconditionally -- never gated by `animate`.
    if (materialRef.current) {
      materialRef.current.uniforms.uProgress.value = progressRef.current;
    }

    // Mouse parallax applies to ParallaxRig ONLY -- Device and
    // DisplayAnchor (and therefore the particles) are both its children,
    // so they inherit this exact same transform automatically. There is
    // no second, independent parallax calculation for the particles.
    const rig = parallaxRigRef.current;
    if (rig) {
      if (!animate) {
        // Reduced motion: snap back to the resting, camera-facing pose
        // rather than freezing wherever the tilt happened to be.
        rig.rotation.set(0, 0, 0);
      } else {
        // Horizontal-only: only yaw (rotation.y), driven by horizontal
        // mouse movement (pointer.x). No pitch/vertical-mouse component
        // anymore -- rotation.x is never touched here, so it stays at 0.
        const clampedDelta = Math.min(delta, 1 / 30);
        const pointer = pointerRef.current;
        const targetYaw = pointer.x * MAX_YAW_RAD;
        const smoothing = 1 - Math.exp(-ROTATION_DAMPING_SPEED * clampedDelta);
        rig.rotation.y += (targetYaw - rig.rotation.y) * smoothing;
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 2]} intensity={1.4} />
      <directionalLight position={[-2, -1, -1]} intensity={0.4} />

      {/* Outer group: places the whole unit at the DOM anchor's on-screen
          position (useElementViewportAnchor + anchorToWorldXY) and scales
          it to a sane on-screen size. Never rotates -- mouse parallax
          happens one level down, on ParallaxRig, so it pivots around the
          Device's own center rather than this anchor point. */}
      <group position={groupPosition} scale={groupScale}>
        {/* ParallaxRig: recenters the Device's own bounding-box center
            onto this group's local origin (so it rotates around its own
            middle, not some off-center point) AND is the ONLY node the
            mouse-driven rotation applies to (see the useFrame above).
            Device and DisplayAnchor are both direct children, so both
            inherit this exact transform -- one rig, one calculation, no
            separate parallax math for the particles. */}
        <group ref={parallaxRigRef} position={[-overallCenter.x, -overallCenter.y, -overallCenter.z]}>
          {/* NeutralPoseCorrection: a FIXED (non-animated) rotation that
              points the Device's real screen normal (~34° off pure +Z,
              as authored in the GLB) straight at the page camera. This
              is deliberately separate from ParallaxRig's per-frame
              mouse yaw/pitch above it -- that one already targets
              exactly 0 at rest, so it was never the source of the
              "not dead-on at rest" bug; the Device's own authored
              orientation was. Composing them this way (fixed correction
              as the child, animated mouse tilt as the parent) means
              identity mouse input = dead-on facing, and mouse tilt
              applies on top of that neutral pose in both directions. */}
          <group quaternion={neutralPoseQuaternion}>
            {/* Glow: soft radial spotlight behind the screen's real
                surface (positioned/oriented from the same plane.center/
                plane.normal already trusted for the particles -- not a
                hardcoded offset). Deliberately a rig-attached sibling of
                Device, not a fixed backdrop or a camera-facing billboard
                -- it should read as "attached to the product" and move
                coherently with mouse parallax, and being a soft
                edge-less gradient (no sharp features like the logo had),
                a slight tilt as the rig rotates is imperceptible, unlike
                the earlier billboard-vs-rigid issue with the particles.
                Additive blending (unlike the particles, which back off
                additive on purpose -- this is one low-opacity gradient,
                not thousands of overlapping points, so no oversaturation
                risk). depthTest stays on so the opaque Device correctly
                occludes the middle of the glow, reading as light pooling
                *around* the silhouette rather than through it. Static --
                no idle pulse/animation, so nothing here needs gating
                behind prefers-reduced-motion. */}
            <mesh position={glowPosition} quaternion={glowQuaternion} renderOrder={-1}>
              <planeGeometry args={[glowSize, glowSize]} />
              <shaderMaterial
                vertexShader={glowVertexShader}
                fragmentShader={glowFragmentShader}
                uniforms={glowUniforms}
                transparent
                depthWrite={false}
                depthTest
                blending={THREE.AdditiveBlending}
              />
            </mesh>

            {/* The Device: solid PBR mesh, rendered as-authored (materials/
                lighting from the GLB, not overridden). */}
            <primitive object={centralScene} />

            {/* DisplayAnchor: a plain transform node (no geometry of its
                own) sitting at the screen sub-mesh's real vertex centroid,
                oriented so its local X/Y/Z match the screen's REAL best-fit
                plane (uAxis/vAxis/normal from PCA on the mesh's own
                vertices -- see bestFitPlane.ts; the screen turned out to be
                tilted ~34° off the naive bounding-box-center heuristic this
                used before, which is exactly why NeutralPoseCorrection
                above exists). The logo particles are expressed in ITS
                local space -- that IS "the display's local space," so no
                extra offset/nudge is needed for them to read as sitting
                on the screen (this replaces the old ad-hoc
                screenCenter.z nudge from a previous round, which was
                working around the billboard/bezel occlusion problem that
                doesn't exist now that the particles are rigidly parented
                here instead of decoupled from it).
                No re-parenting: this group's PARENT never changes, only
                its own position, for its entire lifecycle. */}
            <group position={displayAnchorPosition} quaternion={displayAnchorQuaternion}>
              {/* BulbParticles: NOT a solid mesh -- rendered at its flat,
                  resting position (uProgress=0) so it reads as a static 2D
                  image glued to the display, per the "static screen image"
                  follow-up. It moves ONLY because ParallaxRig above tilts
                  as a rigid unit with the Device -- there is no
                  independent billboard/decoupling here anymore, and no
                  per-particle color/position animation either. `uProgress`
                  (scroll-driven, see HeroCentralCanvas.tsx) mixes toward
                  `explodedPosition`, dispersing the cloud behind the
                  Device using DisplayAnchor's own -Z ("back") axis --
                  real depth-tested occlusion against the opaque Device
                  mesh handles hiding particles that end up behind it,
                  nothing here fakes that with per-particle opacity. */}
              <points geometry={displayGeometry}>
                <shaderMaterial
                  ref={materialRef}
                  vertexShader={particleVertexShader}
                  fragmentShader={particleFragmentShader}
                  uniforms={uniforms}
                  transparent
                  depthWrite={false}
                  depthTest
                />
              </points>
            </group>
          </group>
        </group>
      </group>
    </>
  );
}

useGLTF.preload(CENTRAL_URL);
