import sys, shutil
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent))
from geometry import *
from mathutils.bvhtree import BVHTree
enable()
P=bpy.data.objects['PCB'].matrix_world.copy();I=P.inverted()
source=Path(bpy.data.filepath)
if not (ROOT/'CP00_original.blend').exists():shutil.copy2(source,ROOT/'CP00_original.blend')
params=json.loads((ROOT/'parameters.json').read_text())
def val(k):return params[k]['value']
f=bpy.data.objects['FRONT_BODY'];r=bpy.data.objects['REAR_BODY']
frozen={n:signature(bpy.data.objects[n]) for n in FROZEN}
log={'source':str(source),'frozen_before':frozen,'checkpoints':[],'parameters':params}
def check(stage):
    for n,s in frozen.items():assert signature(bpy.data.objects[n])==s,'Hardware cambiado: '+n
    m={o.name:metrics(o) for o in [f,r]}
    for o in [f,r]:
        if m[o.name]['nonmanifold_edges']:
            bm=bmesh.new();bm.from_mesh(o.data)
            bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=0.0001)
            bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=0.00001)
            bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
    m={o.name:metrics(o) for o in [f,r]}
    if any(d['nonmanifold_edges'] or d['components']!=1 for d in m.values()):bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'DEBUG_failed.blend'))
    for n,d in m.items():assert d['nonmanifold_edges']==0 and d['components']==1 and d['volume_mm3']>0,(stage,n,d)
    log['checkpoints'].append({'stage':stage,'metrics':m});print('CHECKPOINT',stage,json.dumps(m),flush=True)
    (ROOT/'build_audit.json').write_text(json.dumps(log,indent=2))
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/(stage+'.blend')))
def cut_half(o,front):
    boolean(o,box('__HALF',(-200,200),(-200,300),(3,200) if front else (-300,3),P),'INTERSECT');return o
def norm(o):
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.triangulate(bm,faces=list(bm.faces));bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
for o in [f,r]:norm(o)
# Preserve all originals, with scratch/reference collections hidden from exports and renders.
archive=bpy.data.collections.new('ARCHIVE_REFERENCE_DO_NOT_PRINT');bpy.context.scene.collection.children.link(archive)
for o in list(bpy.data.objects):
    if o.name not in ['FRONT_BODY','REAR_BODY']+FROZEN:
        for c in list(o.users_collection):c.objects.unlink(o)
        archive.objects.link(o);o.hide_render=True;o.hide_set(True)
for c in bpy.data.collections:c.hide_render=False
archive.hide_render=True
check('CP01_baseline')
# Four existing posts: open blind pilots without changing post or PCB positions.
for x,y in [(5,5),(80,5),(5,130),(80,130)]:
    boolean(r,cylinder('PILOT_M25',(x,y),val('pcb_pilot_diameter')/2,-1.42-val('pcb_pilot_depth'),-1.40,mat=P))
check('CP02_pcb_pilots')
# A low base extension accommodates four bottom M3 fixings below the PCB outline.
# Existing exterior/frame remains; only the old base floor is opened into the new lower cavity.
old_floor=-5.820400238037109;floor=old_floor-val('base_extension');floor_top=floor+val('wall')
outer_z=(-78.36540222167969,11.634599685668945)
for body,front in [(r,False),(f,True)]:
    add=box('BASE_EXTENSION',(-3.9,88.9),(floor,-3.2),outer_z)
    # 2.4 mm walls/floor. Rounded exterior corners are added only to this new feature.
    bpy.context.view_layer.objects.active=add
    bevel=add.modifiers.new('Base edge radius INICIAL 1.2','BEVEL');bevel.width=1.2;bevel.segments=4
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    boolean(add,box('BASE_CAVITY',(-1.5,86.5),(floor_top,2),(-75.9654,9.2346)))
    cut_half(add,front);boolean(body,add,'UNION')
    if not front:
        cutter=box('BALLAST_ACCESS_OLD_FLOOR',(18,67),(floor_top,-2.8),(-74,-24));boolean(body,cutter)
check('CP03_base_extension')
seat=floor+5.6
bolt_x=[10,32,54,76];bolt_z=-1.0
# Tongues attach to the front's new lower band. Their upper edge stays below PCB local Y=-0.3.
for x in bolt_x:
    tongue=box('FRONT_M3_TONGUE',(x-4.5,x+4.5),(seat,0.6),(-5.5,9.0))
    boolean(tongue,box('PCB_EXTRACTION_LIMIT',(-100,200),(-100,-0.3),(-100,100),P),'INTERSECT')
    boolean(tongue,box('FRONT_ENVELOPE_LIMIT',(-100,200),(-100,200),(-100,10.8),P),'INTERSECT')
    # Machined clearance in rear under the lower board edge; seat itself remains coplanar.
    clearance=box('TONGUE_CLEARANCE',(x-4.8,x+4.8),(seat+0.0002,3.0),(-5.8,18))
    boolean(clearance,box('CLEARANCE_Y_LIMIT',(-100,200),(-100,0),(-100,100),P),'INTERSECT')
    boolean(r,clearance)
    boolean(f,tongue,'UNION')
    boolean(r,cylinder('REAR_M3_SEAT',(x,bolt_z),5.2,floor_top-0.3,seat,axis='Y'),'UNION')
    boolean(f,cylinder('M3_BLIND_PILOT',(x,bolt_z),val('m3_pilot_diameter')/2,seat-0.01,seat+val('m3_pilot_depth'),axis='Y'))
    boolean(r,cylinder('M3_THROUGH',(x,bolt_z),val('m3_clearance_diameter')/2,floor-2,seat+0.01,axis='Y'))
    boolean(r,cylinder('M3_HEAD_RECESS',(x,bolt_z),val('m3_head_recess_diameter')/2,floor-2,floor+val('m3_head_recess_depth'),axis='Y'))
check('CP04_bottom_fasteners')
# Four rubber-foot pockets, locally backed so 2.4 mm remains above each 1.2 mm pocket.
for x in [8,77]:
    for z in [-66,-17]:
        boolean(r,cylinder('FOOT_BACKING',(x,z),9.9,floor_top-0.2,floor_top+val('foot_depth'),axis='Y'),'UNION')
        boolean(r,cylinder('FOOT_POCKET',(x,z),val('foot_diameter')/2,floor-2,floor+val('foot_depth'),axis='Y'))
# Internal rectangular ballast tray, open upward; no batteries/door.
for xr,zr in [((19,22.2),(-70,-32)),((62.8,66),(-70,-32)),((19,66),(-73.2,-70)),((19,66),(-32,-28.8))]:
    boolean(r,box('BALLAST_RAIL',xr,(floor_top-0.2,floor_top+3.2),zr),'UNION')
# Low rear reserved USB aperture: capsule generated from a bevelled box, through the rear wall.
slot=box('REAR_USB_RESERVED',(42.5-val('rear_usb_width')/2,42.5+val('rear_usb_width')/2),(-9.2-val('rear_usb_height')/2,-9.2+val('rear_usb_height')/2),(-82,-73))
boolean(r,slot)
check('CP05_feet_ballast_usb')
log['layout']={'floor_world_y':floor,'seat_world_y':seat,'m3_centres_world_xz':[[x,bolt_z] for x in bolt_x],'feet_world_xz':[[x,z] for x in [8,77] for z in [-66,-17]],'ballast_free_x':[22.2,62.8],'ballast_free_z':[-70,-32],'ballast_floor_y':floor_top,'ballast_rail_top_y':floor_top+3.2}
log['frozen_after']={n:signature(bpy.data.objects[n]) for n in FROZEN}
log['intersections']={'halves_mm3':intersection(f,r),'front_pcb_mm3':intersection(f,bpy.data.objects['PCB']),'rear_pcb_mm3':intersection(r,bpy.data.objects['PCB'])}
(ROOT/'build_audit.json').write_text(json.dumps(log,indent=2))
for o in [f,r]:o.color=(0.20,0.24,0.29,1);o.hide_render=False;o.hide_set(False)
check('CP06_mechanical')
print('FINAL_INTERSECTIONS',log['intersections'],flush=True)
render('mechanical-front.png',['FRONT_BODY','REAR_BODY'],(-170,190,240),(42,60,-23),200)
render('mechanical-interior.png',['REAR_BODY'],(160,180,240),(42,60,-23),200)
render('mechanical-underside.png',['FRONT_BODY','REAR_BODY'],(160,-230,-150),(42,20,-30),200)
