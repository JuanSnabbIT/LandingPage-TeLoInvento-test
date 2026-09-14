import bpy, bmesh, math, json, hashlib
from mathutils import Vector, Matrix
from pathlib import Path
ROOT=Path(__file__).resolve().parent
FROZEN=['PCB','SCREEN_FACE','BTN_01','BTN_02','BTN_03','USB_C_TOP_REF']
def enable():
    def rec(c):
        c.exclude=False;c.hide_viewport=False
        for a in c.children:rec(a)
    rec(bpy.context.view_layer.layer_collection)
    for c in bpy.data.collections:c.hide_viewport=False
    for o in bpy.data.objects:o.hide_viewport=False;o.hide_set(False);o.update_tag()
    bpy.context.scene.frame_set(bpy.context.scene.frame_current)
    bpy.context.view_layer.update()
def signature(o):
    d={'location':list(o.location),'rotation':list(o.rotation_euler),'scale':list(o.scale),'vertices':[list(v.co) for v in o.data.vertices],'faces':[list(p.vertices) for p in o.data.polygons]}
    return hashlib.sha256(json.dumps(d,sort_keys=True).encode()).hexdigest()
def mesh(name,verts,faces,mat=None):
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
    o=bpy.data.objects.new(name,me);bpy.context.scene.collection.objects.link(o)
    if mat is not None:o.matrix_world=mat
    bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
    bpy.context.view_layer.update();return o
def box(name,x,y,z,mat=None):
    return mesh(name,[(a,b,c) for c in z for b in y for a in x],[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)],mat)
def cylinder(name,center,r,lo,hi,axis='Z',mat=None,n=64):
    v=[]
    for h in [lo,hi]:
        for i in range(n):
            a=2*math.pi*i/n;u=center[0]+r*math.cos(a);w=center[1]+r*math.sin(a)
            v.append((u,w,h) if axis=='Z' else (u,h,w))
    f=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,v,f,mat)
def rounded_box(name,x,y,z,r,mat=None,n=8):
    ring=[]
    for cx,cy,a0 in [(x[1]-r,y[1]-r,0),(x[0]+r,y[1]-r,90),(x[0]+r,y[0]+r,180),(x[1]-r,y[0]+r,270)]:
        for k in range(n+1):
            a=math.radians(a0+90*k/n);ring.append((cx+r*math.cos(a),cy+r*math.sin(a)))
    count=len(ring);v=[(a,b,c) for c in z for a,b in ring]
    faces=[tuple(reversed(range(count))),tuple(range(count,2*count))]+[(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
    return mesh(name,v,faces,mat)
def copy(o,name):
    c=o.copy();c.data=o.data.copy();c.name=name;bpy.context.scene.collection.objects.link(c);c.hide_viewport=False;c.hide_set(False);return c
def delete(o):bpy.data.objects.remove(o,do_unlink=True)
def boolean(o,c,op='DIFFERENCE',keep=False):
    bpy.context.view_layer.objects.active=o;o.hide_set(False);o.hide_viewport=False
    m=o.modifiers.new(c.name,'BOOLEAN');m.operation=op;m.solver='MANIFOLD';m.object=c
    bpy.ops.object.modifier_apply(modifier=m.name)
    if not keep:delete(c)
    return o
def metrics(o):
    bm=bmesh.new();bm.from_mesh(o.data);bm.transform(o.matrix_world)
    seen=set();parts=0
    for v in bm.verts:
        if v in seen:continue
        parts+=1;stack=[v];seen.add(v)
        while stack:
            p=stack.pop()
            for e in p.link_edges:
                q=e.other_vert(p)
                if q not in seen:seen.add(q);stack.append(q)
    r={'vertices':len(bm.verts),'faces':len(bm.faces),'volume_mm3':bm.calc_volume(signed=True),'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges),'components':parts,'bounds':[[min(v.co[i] for v in bm.verts),max(v.co[i] for v in bm.verts)] for i in range(3)] if bm.verts else []}
    bm.free();return r
def intersection(a,b):
    c=copy(a,'__INTERSECTION');boolean(c,b,'INTERSECT',True);r=metrics(c);delete(c);return r['volume_mm3']
def render(name,visible,eye,target,scale=180):
    for o in bpy.data.objects:o.hide_render=o.name not in visible
    sc=bpy.context.scene;sc.render.engine='BLENDER_WORKBENCH'
    sc.display.shading.light='STUDIO';sc.display.shading.color_type='OBJECT';sc.display.shading.show_shadows=True;sc.display.shading.show_cavity=True
    sc.display.shading.cavity_type='BOTH';sc.display.shading.background_type='WORLD';sc.world.color=(0.14,0.14,0.14);sc.render.film_transparent=False
    cam=bpy.data.objects.get('AUDIT_CAMERA')
    if not cam:
        cam=bpy.data.objects.new('AUDIT_CAMERA',bpy.data.cameras.new('AUDIT_CAMERA'));sc.collection.objects.link(cam)
    cam.location=eye
    back=(cam.location-Vector(target)).normalized();right=Vector((0,1,0)).cross(back).normalized();up=back.cross(right)
    cam.rotation_euler=Matrix((right,up,back)).transposed().to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=scale;cam.data.clip_end=2000
    sc.camera=cam;sc.render.resolution_x=1300;sc.render.resolution_y=1100;sc.render.resolution_percentage=100
    sc.render.filepath=str(ROOT/name);bpy.ops.render.render(write_still=True)
