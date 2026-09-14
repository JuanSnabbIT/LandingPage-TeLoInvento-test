import sys
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent))
from geometry import *
enable()
def clean(o):
    old=metrics(o);bm=bmesh.new();bm.from_mesh(o.data)
    for _ in range(3):
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=0.0001)
        bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=0.0001)
        bmesh.ops.triangulate(bm,faces=list(bm.faces))
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
    new=metrics(o);assert new['nonmanifold_edges']==0 and new['components']==1,(o.name,new)
    assert abs(old['volume_mm3']-new['volume_mm3'])<0.1,(old,new)
    print(o.name,old,new,flush=True)
for name in ['FRONT_BODY','REAR_BODY']:clean(bpy.data.objects[name])
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'CP09_export_cleanup.blend'))
