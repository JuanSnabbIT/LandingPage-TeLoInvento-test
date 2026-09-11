import * as THREE from 'three';

export interface BestFitPlane {
  /** Real centroid of the mesh's vertices (world space). */
  center: THREE.Vector3;
  /** Real geometric normal of the mesh's dominant flat surface. */
  normal: THREE.Vector3;
  /** In-plane "width" basis vector (unit length, orthogonal to normal). */
  uAxis: THREE.Vector3;
  /** In-plane "height" basis vector (unit length, orthogonal to uAxis and normal). */
  vAxis: THREE.Vector3;
  /** Orientation with local X=uAxis, Y=vAxis, Z=normal. */
  quaternion: THREE.Quaternion;
  /** Real extent of the mesh's vertices along uAxis (x) and vAxis (y), world units. */
  size: THREE.Vector2;
}

interface JacobiResult {
  eigenvalues: [number, number, number];
  eigenvectors: [THREE.Vector3, THREE.Vector3, THREE.Vector3];
}

/**
 * Classic cyclic Jacobi eigenvalue algorithm for a symmetric 3x3 matrix.
 * Self-contained (no new dependency) -- appropriate here since we only
 * ever need this for one small, well-conditioned covariance matrix per
 * mesh, not a general-purpose linear-algebra path.
 */
function jacobiEigenSymmetric3x3(m: {
  xx: number;
  xy: number;
  xz: number;
  yy: number;
  yz: number;
  zz: number;
}): JacobiResult {
  const a = [
    [m.xx, m.xy, m.xz],
    [m.xy, m.yy, m.yz],
    [m.xz, m.yz, m.zz],
  ];
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  for (let iter = 0; iter < 100; iter++) {
    let p = 0;
    let q = 1;
    let maxOff = Math.abs(a[0][1]);
    if (Math.abs(a[0][2]) > maxOff) {
      p = 0;
      q = 2;
      maxOff = Math.abs(a[0][2]);
    }
    if (Math.abs(a[1][2]) > maxOff) {
      p = 1;
      q = 2;
      maxOff = Math.abs(a[1][2]);
    }
    if (maxOff < 1e-14) break;

    const app = a[p][p];
    const aqq = a[q][q];
    const apq = a[p][q];
    const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
    const c = Math.cos(phi);
    const s = Math.sin(phi);

    a[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    a[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    a[p][q] = 0;
    a[q][p] = 0;

    for (let i = 0; i < 3; i++) {
      if (i !== p && i !== q) {
        const aip = a[i][p];
        const aiq = a[i][q];
        a[i][p] = c * aip - s * aiq;
        a[p][i] = a[i][p];
        a[i][q] = s * aip + c * aiq;
        a[q][i] = a[i][q];
      }
    }

    for (let i = 0; i < 3; i++) {
      const vip = v[i][p];
      const viq = v[i][q];
      v[i][p] = c * vip - s * viq;
      v[i][q] = s * vip + c * viq;
    }
  }

  return {
    eigenvalues: [a[0][0], a[1][1], a[2][2]],
    eigenvectors: [
      new THREE.Vector3(v[0][0], v[1][0], v[2][0]),
      new THREE.Vector3(v[0][1], v[1][1], v[2][1]),
      new THREE.Vector3(v[0][2], v[1][2], v[2][2]),
    ],
  };
}

/**
 * Computes the real best-fit plane of a mesh's vertices via PCA
 * (eigen-decomposition of the position covariance matrix).
 *
 * Why PCA and not the node transform: verified against central-lod1.glb
 * directly -- the ScreenPanel node has an identity local transform (no
 * rotation/translation/scale in the glTF), so whatever incline the
 * screen actually has is baked into its vertex positions, not readable
 * off the node. And why PCA and not averaged face/vertex normals: this
 * mesh is a closed glass volume (front + back faces), so normal
 * averaging cancels toward ~0 -- confirmed in an earlier round. The
 * smallest-variance eigenvector of the vertex-position covariance is the
 * true geometric plane normal regardless of face winding, and doesn't
 * suffer that cancellation.
 *
 * `upHint` (typically world +Y) picks which of the two in-plane
 * eigenvectors is "height" (vAxis) vs "width" (uAxis) -- NOT by raw PCA
 * variance magnitude, which has no notion of "up" and could otherwise
 * assign width/height backwards (rotating flattened content 90°) if the
 * screen's short axis ever had more spread than its long one for some
 * other asset. `frontHint` (a rough outward direction, doesn't need to
 * be precise) fixes the normal's sign, since eigenvectors are only
 * defined up to a ± ambiguity.
 */
export function computeBestFitPlane(mesh: THREE.Mesh, upHint: THREE.Vector3, frontHint: THREE.Vector3): BestFitPlane {
  const positionAttribute = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
  const count = positionAttribute.count;
  const scratch = new THREE.Vector3();
  const points: THREE.Vector3[] = new Array(count);

  for (let i = 0; i < count; i++) {
    scratch.fromBufferAttribute(positionAttribute, i).applyMatrix4(mesh.matrixWorld);
    points[i] = scratch.clone();
  }

  const center = new THREE.Vector3();
  for (const p of points) center.add(p);
  center.divideScalar(count);

  let xx = 0;
  let xy = 0;
  let xz = 0;
  let yy = 0;
  let yz = 0;
  let zz = 0;
  for (const p of points) {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    const dz = p.z - center.z;
    xx += dx * dx;
    xy += dx * dy;
    xz += dx * dz;
    yy += dy * dy;
    yz += dy * dz;
    zz += dz * dz;
  }
  xx /= count;
  xy /= count;
  xz /= count;
  yy /= count;
  yz /= count;
  zz /= count;

  const { eigenvalues, eigenvectors } = jacobiEigenSymmetric3x3({ xx, xy, xz, yy, yz, zz });
  const order = [0, 1, 2].sort((a, b) => eigenvalues[a] - eigenvalues[b]);

  const normal = eigenvectors[order[0]].clone().normalize();
  if (normal.dot(frontHint) < 0) normal.negate();

  // This mesh is a closed volume (front + back glass surfaces, plus
  // sides), so the plain vertex-position centroid computed above sits
  // roughly mid-depth -- behind the actual visible front surface, not on
  // it. Isolate the front-facing half of the vertices (split by depth
  // along `normal`, at the midpoint of the depth range) and use THEIR
  // centroid/extent instead, so the returned center/size describe the
  // real front face, not the volume's interior. Confirmed necessary
  // while fixing this: with the plain whole-volume centroid, particles
  // rendered in the correct shape/position but were fully hidden behind
  // the opaque front glass under normal depth-testing.
  let minDepth = Infinity;
  let maxDepth = -Infinity;
  const depths = new Array<number>(points.length);
  const toCenter = new THREE.Vector3();
  for (let i = 0; i < points.length; i++) {
    const depth = toCenter.copy(points[i]).sub(center).dot(normal);
    depths[i] = depth;
    if (depth < minDepth) minDepth = depth;
    if (depth > maxDepth) maxDepth = depth;
  }
  const midDepth = (minDepth + maxDepth) / 2;

  const frontPoints = points.filter((_, i) => depths[i] >= midDepth);
  const frontCenter = new THREE.Vector3();
  for (const p of frontPoints) frontCenter.add(p);
  frontCenter.divideScalar(Math.max(frontPoints.length, 1));

  const inPlaneA = eigenvectors[order[1]].clone().normalize();
  const inPlaneB = eigenvectors[order[2]].clone().normalize();

  let uAxis: THREE.Vector3;
  let vAxis: THREE.Vector3;
  if (Math.abs(inPlaneA.dot(upHint)) >= Math.abs(inPlaneB.dot(upHint))) {
    vAxis = inPlaneA;
    uAxis = inPlaneB;
  } else {
    vAxis = inPlaneB;
    uAxis = inPlaneA;
  }
  if (vAxis.dot(upHint) < 0) vAxis.negate();

  // Keep (uAxis, vAxis, normal) a proper right-handed orthonormal basis --
  // flip uAxis (not vAxis, its sign is already fixed by upHint above) if
  // needed rather than leaving an improper/mirrored basis.
  const cross = new THREE.Vector3().crossVectors(uAxis, vAxis);
  if (cross.dot(normal) < 0) uAxis.negate();

  const quaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(uAxis, vAxis, normal));

  // Width/height from the FRONT-face cluster only, same reasoning as the
  // center above -- the whole volume's extent (including the back/side
  // vertices) isn't "that face's" real shape.
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  const relative = new THREE.Vector3();
  for (const p of frontPoints) {
    relative.copy(p).sub(frontCenter);
    const u = relative.dot(uAxis);
    const v = relative.dot(vAxis);
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }

  return {
    center: frontCenter,
    normal,
    uAxis,
    vAxis,
    quaternion,
    size: new THREE.Vector2(maxU - minU, maxV - minV),
  };
}
