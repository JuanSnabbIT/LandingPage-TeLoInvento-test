import json, os, subprocess, sys, numpy as np
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.dirname(__file__))
import bake_positions as bp  # noqa: E402

def test_hilbert_locality():
    # puntos consecutivos en orden Hilbert están cerca en el espacio
    pts = np.random.RandomState(1).rand(4096, 3).astype(np.float32) * 2 - 1
    order = bp.hilbert_order(pts, bits=6)
    d = np.linalg.norm(np.diff(pts[order], axis=0), axis=1)
    assert np.median(d) < 0.25

def test_same_seed_per_index():
    a = bp.seeds(16, 123); b = bp.seeds(16, 123)
    assert np.array_equal(a, b) and a.dtype == np.float32 and (a >= 0).all() and (a < 1).all()

def test_half_roundtrip():
    x = np.array([0.5, -0.999, 0.123], dtype=np.float32)
    h = x.astype(np.float16)
    assert np.abs(h.astype(np.float32) - x).max() < 1e-3

if __name__ == '__main__':
    for name, fn in list(globals().items()):
        if name.startswith('test_'):
            fn(); print('PASS', name)
