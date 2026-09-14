import sys
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent))
from geometry import *
from mathutils.bvhtree import BVHTree
enable();P=bpy.data.objects['PCB'].matrix_world.copy();I=P.inverted();f=bpy.data.objects['FRONT_BODY'];r=bpy.data.objects['REAR_BODY']
data={}
for o in [f,r]:
    bm=bmesh.new();bm.from_mesh(o.data);bm.transform(o.matrix_world);bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.faces.ensure_lookup_table();bm.verts.ensure_lookup_table();t=BVHTree.FromBMesh(bm)
    samples=[];unhit=0
    for face in bm.faces:
        if face.calc_area()<0.5:continue
        c=face.calc_center_median();n=face.normal;hit=t.ray_cast(c-n*0.001,-n,200)
        if hit[0]:samples.append({'thickness':hit[3]+0.001,'area':face.calc_area(),'center':list(c),'normal':list(n)})
        else:unhit+=1
    bad=[]
    for a,b in t.overlap(t):
        if a>=b:continue
        fa=bm.faces[a];fb=bm.faces[b]
        if set(fa.verts)&set(fb.verts):continue
        if fa.calc_area()<1e-5 or fb.calc_area()<1e-5:continue
        bad.append([a,b,list(fa.calc_center_median()),list(fb.calc_center_median())])
    rot=(Matrix.Rotation(math.pi,4,'X')@I).to_3x3() if o==f else Matrix.Rotation(math.pi/2,4,'X').to_3x3()
    down=sum(face.calc_area() for face in bm.faces if (rot@face.normal).z < -math.cos(math.radians(50)))
    data[o.name]={'metrics':metrics(o),'inconsistent_edges':sum(not e.is_contiguous for e in bm.edges if e.is_manifold),'thickness_sample_count':len(samples),'rays_no_exit':unhit,'thinnest_30':sorted(samples,key=lambda a:a['thickness'])[:30],'nonadjacent_triangle_overlap_candidates':bad[:40],'candidate_count':len(bad),'downfacing_area_over_50deg_mm2':down}
    bm.free()
# Designated nominal wall checks avoid confusing thin guide tongues and exterior chamfers with walls.
def ray_hits(o,origin,direction):
    t=BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices],[list(p.vertices) for p in o.data.polygons]);p=Vector(origin);d=Vector(direction).normalized();hits=[]
    for _ in range(20):
        hit=t.ray_cast(p,d,300)
        if hit[0] is None:break
        hits.append(list(hit[0]));p=hit[0]+d*0.0002
    return hits
data['designated_wall_rays']={
    'rear_side_x':ray_hits(r,(-10,65,-35),(1,0,0)),
    'base_floor_y':ray_hits(r,(42.5,-30,-50),(0,1,0)),
    'foot_floor_y':ray_hits(r,(8,-30,-66),(0,1,0)),
    'screen_overlap_z':ray_hits(f,P@Vector((12.7,70,20)),P.to_3x3()@Vector((0,0,-1)))
}
data['fastener_access']={}
for x,y in [(5,5),(80,5),(5,130),(80,130)]:
    c=cylinder('__DRIVER',(x,y),3.2,0.001,60,mat=P);data['fastener_access'][str((x,y))]={'rear_driver_mm3':intersection(r,c)};delete(c)
    c=cylinder('__HEAD',(x,y),2.4,0.001,2.5,mat=P);data['fastener_access'][str((x,y))]['front_head_mm3']=intersection(f,c);delete(c)
# Functional top access envelope and a conservative low ballast block.
c=box('__CABLE',(32.0301,44.0299),(137.001,170),(1.5001,8.4999),P);data['top_usb_cable_mm3']={o.name:intersection(o,c) for o in [f,r]};delete(c)
c=box('__BALLAST',(22.5,62.5),(-13.019,-7.019),(-69.7,-32.3));data['ballast_test_40x37_4x6_mm3']={o.name:intersection(o,c) for o in [f,r]};delete(c)
(ROOT/'fdm_validation.json').write_text(json.dumps(data,indent=2));print(json.dumps(data,indent=2))
