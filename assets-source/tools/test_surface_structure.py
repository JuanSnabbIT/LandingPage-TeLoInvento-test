import unittest
import numpy as np
from surface_structure import lattice_surface, surface_links


class SurfaceStructureTests(unittest.TestCase):
    def test_count_and_translation_preserve_identity(self):
        tris = np.array([[[0,0,0],[2,0,0],[0,1,0]], [[0,0,1],[1,0,1],[0,1,1]]], dtype=float)
        areas = np.array([1., .5])
        p, faces = lattice_surface(tris, areas, 128)
        q, other_faces = lattice_surface(tris + np.array([0,0,3]), areas, 128)
        self.assertEqual(len(p), 128)
        np.testing.assert_array_equal(faces, other_faces)
        np.testing.assert_allclose(q-p, np.tile([0,0,3], (128,1)), atol=1e-6)

    def test_small_tessellated_parts_keep_their_area_share(self):
        tri = np.array([[[0,0,0],[1,0,0],[0,1,0]]], dtype=float)
        tris = np.repeat(tri, 1001, axis=0)
        areas = np.array([100.] + [.1]*1000)
        _, faces = lattice_surface(tris, areas, 200)
        self.assertEqual(np.count_nonzero(faces > 0), 100)

    def test_links_respect_components_distance_and_degree(self):
        points = np.array([[x,y,0] for x in range(6) for y in range(6)], dtype=float)
        normals = np.tile([0.,0.,1.], (len(points),1))
        groups = (points[:,0] >= 3).astype(int)
        links = surface_links(points, normals, groups, 1.5, 4)
        self.assertGreater(len(links), 0)
        self.assertTrue(np.all(groups[links[:,0]] == groups[links[:,1]]))
        self.assertLessEqual(np.linalg.norm(points[links[:,0]]-points[links[:,1]],axis=1).max(),1.5)
        self.assertLessEqual(np.bincount(links.ravel()).max(),4)

    def test_links_do_not_cross_opposite_surfaces(self):
        p = np.array([[0.,0.,0.],[.1,0,0],[0,0,.01],[.1,0,.01]])
        n = np.array([[0,0,1],[0,0,1],[0,0,-1],[0,0,-1]],dtype=float)
        links = surface_links(p,n,np.zeros(4),.2)
        self.assertTrue(all(a//2 == b//2 for a,b in links))


if __name__ == '__main__':
    unittest.main()
