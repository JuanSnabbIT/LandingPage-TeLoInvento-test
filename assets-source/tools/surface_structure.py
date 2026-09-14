"""Deterministic surface lattice and local connectivity, independent of Blender."""
import math
import numpy as np


def lattice_surface(tris, areas, count):
    """Allocate by area, then sample an interior triangular lattice per face.

    Translation does not affect quotas/barycentrics, preserving exploded pairs.
    Zero-area triangles receive no samples. Exactly count particles are emitted.
    """
    weights = np.maximum(areas, 0)
    if weights.sum() <= 0 or count <= 0:
        raise ValueError('A surface needs positive area and a positive count')
    # Stratified cumulative allocation preserves tiny, heavily tessellated parts.
    # Largest-remainder allocation would starve them in favour of broad faces.
    cdf = np.cumsum(weights / weights.sum())
    selected = np.minimum(np.searchsorted(cdf, (np.arange(count) + .5) / count), len(tris)-1)
    counts = np.bincount(selected, minlength=len(tris))
    points, faces = [], []
    for face, k in enumerate(counts):
        if not k:
            continue
        tri = tris[face]
        longest = np.argmax([np.linalg.norm(tri[(i+1)%3]-tri[i]) for i in range(3)])
        a, b, c = tri[longest], tri[(longest+1)%3], tri[(longest+2)%3]
        base = np.linalg.norm(b-a)
        height = np.linalg.norm(np.cross(b-a, c-a)) / max(base, 1e-12)
        spacing = math.sqrt(max(base * height / (2*k), 1e-12))
        rows = max(1, round(height / spacing))
        ys = (np.arange(rows) + .5) / rows
        boundaries = np.round(np.concatenate([[0], np.cumsum(1-ys) / np.sum(1-ys)]) * k).astype(int)
        samples = []
        for row, y in enumerate(ys):
            n = boundaries[row+1] - boundaries[row]
            if n:
                x = (np.arange(n) + .5) / n * (1-y)
                samples.append(a + x[:, None]*(b-a) + y*(c-a))
        points.append(np.concatenate(samples))
        faces.extend([face] * k)
    return np.concatenate(points).astype(np.float32), np.array(faces, dtype=np.int64)


def surface_links(points, normals, components, radius, max_degree=4):
    """Local tangent links only, bounded degree; no all-pairs runtime search.

    Hash cells constrain candidates. Components prevent bridges between parts;
    normals and tangent-plane distance prevent chords through curved surfaces.
    """
    grid = {}
    cells = np.floor(points / radius).astype(int)
    for i, cell in enumerate(cells):
        grid.setdefault((int(components[i]), *cell), []).append(i)
    degree = np.zeros(len(points), dtype=int)
    edges = []
    for i, (cx, cy, cz) in enumerate(cells):
        candidates = []
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for dz in (-1, 0, 1):
                    candidates.extend(grid.get((int(components[i]), cx+dx, cy+dy, cz+dz), []))
        if not candidates:
            continue
        ids = np.asarray(candidates)
        delta = points[ids] - points[i]
        dist = np.linalg.norm(delta, axis=1)
        tangent = np.abs(delta @ normals[i]) / np.maximum(dist, 1e-9)
        valid = (ids > i) & (dist > radius * .08) & (dist <= radius)
        valid &= (normals[ids] @ normals[i] > .80) & (tangent < .30)
        for j in ids[valid][np.argsort(dist[valid], kind='stable')]:
            if degree[i] >= max_degree:
                break
            if degree[j] < max_degree:
                edges.append((i, int(j)))
                degree[i] += 1
                degree[j] += 1
    return np.array(edges, dtype=np.uint32).reshape(-1, 2)
