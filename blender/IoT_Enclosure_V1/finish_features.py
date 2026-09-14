import sys
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent))
from geometry import *
from mathutils.bvhtree import BVHTree
enable();P=bpy.data.objects['PCB'].matrix_world.copy();f=bpy.data.objects['FRONT_BODY'];r=bpy.data.objects['REAR_BODY']
audit=json.loads((ROOT/'build_audit.json').read_text());params=json.loads((ROOT/'parameters.json').read_text())
# Demonstrated interference of 1.551 mm3 per sharp 10 mm button envelope.
# Keep approved width/height/centres, relieve corner radii only.
for x in [18.3,39.5,59.8]:boolean(f,rounded_box('BUTTON_CORNER_RELIEF',(x-5.3,x+5.3),(0.9,11.5),(2.9,11.1),0.8,P))
params['button_aperture_corner_radius']={'value':0.8,'status':'INICIAL','reason':'Radio anterior 1.5 intersectaba el envolvente conservador cuadrado de 10 mm; ancho, alto y centros conservados.'}
# Port/cable access: leave 2.5 mm material below nominal external Z=11 face.
for body in [f,r]:
    boolean(body,box('USB_TOP_THROAT',(33.23,42.83),(125.23,137),(3.2,6.8),P))
    boolean(body,box('USB_TOP_PLUG_ACCESS',(32.03,44.03),(136.5,155),(1.5,8.5),P))
params['usb_top_throat']={'value':[9.6,3.6],'status':'INICIAL'}
params['usb_top_cable_envelope']={'value':[12,7],'status':'INICIAL','reason':'Ancho/alto de acceso elegido; medir sobremolde del cable real y probar insercion.'}
# Raised provisional typographic IoT mark follows the actual rear surface.
t=BVHTree.FromPolygons([r.matrix_world@v.co for v in r.data.vertices],[list(p.vertices) for p in r.data.polygons])
font=bpy.data.curves.new('IoT_MARK','FONT');font.body=params['logo_text']['value'];font.size=22;font.extrude=0.6;font.resolution_u=10
o=bpy.data.objects.new('LOGO_TOOL',font);bpy.context.scene.collection.objects.link(o)
bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o=bpy.context.object
xs=[v.co.x for v in o.data.vertices];ys=[v.co.y for v in o.data.vertices];zs=[v.co.z for v in o.data.vertices]
cx=(min(xs)+max(xs))/2;cy=(min(ys)+max(ys))/2;scale=42/(max(xs)-min(xs));lo=min(zs);hi=max(zs)
for v in o.data.vertices:
    x=42.5-(v.co.x-cx)*scale;y=77+(v.co.y-cy)*scale
    hit=t.ray_cast(Vector((x,y,-150)),Vector((0,0,1)),200)[0];assert hit is not None
    depth=-0.4+(v.co.z-lo)/(hi-lo)*(params['logo_relief']['value']+0.4)
    v.co=(x,y,hit.z-depth)
bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=0.0001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
assert metrics(o)['nonmanifold_edges']==0,metrics(o)
before=metrics(r)['volume_mm3'];boolean(r,o,'UNION');assert metrics(r)['volume_mm3']>before+50,'Logo no integrado'
for body in [f,r]:
    m=metrics(body);print(body.name,m,flush=True);assert m['nonmanifold_edges']==0 and m['components']==1 and m['volume_mm3']>0
for name,h in audit['frozen_before'].items():assert signature(bpy.data.objects[name])==h
(ROOT/'parameters.json').write_text(json.dumps(params,indent=2,ensure_ascii=False))
for name in ['parameters.json','build_audit.json']:
    txt=bpy.data.texts.get(name) or bpy.data.texts.new(name);txt.clear();txt.write((ROOT/name).read_text())
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'CP07_features.blend'))
for body in [f,r]:body.color=(0.30,0.34,0.40,1)
render('rear-logo.png',['FRONT_BODY','REAR_BODY'],(170,125,-230),(42,58,-30),205)
render('front-empty.png',['FRONT_BODY','REAR_BODY'],(-160,120,230),(42,60,-23),215)
