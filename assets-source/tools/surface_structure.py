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


def even_surface(tris, areas, count, rng, oversample=6, accept=None):
    """Even, pattern-free spacing: area-weighted random candidates thinned by
    farthest-point sampling.

    For pieces where the lattice draws its rows as visible rings -- thin
    capsules and lathed cones (the rays and flame of the logo), whose long
    triangles wrap around the part. Deterministic for a given `rng`.

    `accept(points, tri_idx) -> bool mask`: optional candidate filter (the
    bake uses it to keep only what the camera can see). Candidates are drawn
    in rounds until `count * oversample` survive, so the spacing stays even
    over the accepted surface instead of thinning out.
    """
    weights = np.maximum(areas, 0)
    if weights.sum() <= 0 or count <= 0:
        raise ValueError('A surface needs positive area and a positive count')
    m = max(count * oversample, count)
    p = weights / weights.sum()
    cands, idxs, got = [], [], 0
    for _ in range(12):
        idx = rng.choice(len(tris), size=m, p=p)
        r1 = np.sqrt(rng.random_sample(m)); r2 = rng.random_sample(m)
        a, b, c = tris[idx, 0], tris[idx, 1], tris[idx, 2]
        pts = (1 - r1)[:, None] * a + (r1 * (1 - r2))[:, None] * b + (r1 * r2)[:, None] * c
        if accept is not None:
            keep = np.asarray(accept(pts, idx), dtype=bool)
            pts, idx = pts[keep], idx[keep]
        cands.append(pts); idxs.append(idx); got += len(pts)
        if got >= m:
            break
    if got < count:
        raise ValueError(f'Only {got} accepted candidates for {count} points')
    cand = np.concatenate(cands)[:m]; idx = np.concatenate(idxs)[:m]
    m = len(cand)
    chosen = np.empty(count, dtype=np.int64)
    dist = np.full(m, np.inf)
    cur = 0
    for i in range(count):
        chosen[i] = cur
        dist = np.minimum(dist, ((cand - cand[cur]) ** 2).sum(axis=1))
        cur = int(dist.argmax())
    return cand[chosen].astype(np.float32), idx[chosen].astype(np.int64)


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
