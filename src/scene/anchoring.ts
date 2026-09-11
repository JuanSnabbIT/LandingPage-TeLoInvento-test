import * as THREE from 'three';
import { anchorToWorldXY, viewportWorldHeight } from './pageCameraMath';

export type Pose = 'frontal' | 'tresCuartos';
export interface AnchorTransform { x: number; y: number; scale: number; visible: boolean; }

const POSES: Record<Pose, THREE.Quaternion> = {
  frontal: new THREE.Quaternion(),
  tresCuartos: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.25, 0.5, 0, 'XYZ')),
};

export function poseQuaternion(pose: Pose): THREE.Quaternion { return POSES[pose]; }

export function computeAnchorTransform(rect: DOMRectReadOnly, size: { width: number; height: number }, opts: { fit: number; maxDim: number; margin?: number }): AnchorTransform {
  const margin = opts.margin ?? 1; // en alturas de caja
  const visible = rect.bottom > -rect.height * margin && rect.top < size.height + rect.height * margin;
  const u = (rect.left + rect.width / 2) / size.width;
  const v = (rect.top + rect.height / 2) / size.height;
  const { x, y } = anchorToWorldXY(u, v, size.width / Math.max(size.height, 1));
  const worldPerPx = viewportWorldHeight() / Math.max(size.height, 1);
  const minSide = Math.min(rect.width, rect.height);
  const scale = (opts.fit * minSide * worldPerPx) / Math.max(opts.maxDim, 1e-6);
  return { x, y, scale, visible };
}

const _pos = new THREE.Vector3(); const _scl = new THREE.Vector3();
export function anchorMatrix(t: AnchorTransform, pose: Pose, out: THREE.Matrix4): THREE.Matrix4 {
  return out.compose(_pos.set(t.x, t.y, 0), poseQuaternion(pose), _scl.setScalar(t.scale));
}
