import { PerspectiveCamera } from '@react-three/drei';
import { PAGE_CAMERA_DISTANCE, PAGE_CAMERA_FOV_DEG } from './pageCameraMath';

/**
 * The persistent page-level camera: fixed position/fov, shared by every
 * scene mounted in PersistentSceneLayer. Individual scenes don't compute
 * or own a camera anymore -- they place their own content using
 * anchorToWorldXY (pageCameraMath.ts) against this fixed camera instead.
 */
export function PageCamera() {
  return (
    <PerspectiveCamera makeDefault position={[0, 0, PAGE_CAMERA_DISTANCE]} fov={PAGE_CAMERA_FOV_DEG} near={0.1} far={100} />
  );
}
