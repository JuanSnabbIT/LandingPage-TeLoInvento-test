import sys
sys.path.insert(0,str(__import__('pathlib').Path(__file__).resolve().parent))
from geometry import *
enable();OUT=ROOT/'TAREA24';OUT.mkdir(exist_ok=True)
f=bpy.data.objects['FRONT_BODY'];r=bpy.data.objects['REAR_BODY'];P=bpy.data.objects['PCB'].matrix_world.copy();I=P.inverted()
frozen={n:signature(bpy.data.objects[n]) for n in FROZEN}
before={o.name:metrics(o) for o in [f,r]}
floor=-15.42040023803711;floor_top=floor+2.4;old_seat=floor+5.6
contact_world_y=old_seat+1.0;contact_pcb_y=(I@Vector((0,contact_world_y,-1))).y
log={'task':24,'frozen_before':frozen,'before':before,'operations':[], 'floor_y':floor,'head_bearing_y':floor+3.2,'m3_contact_axis_y':contact_world_y,'contact_plane_pcb_y':contact_pcb_y}
def clean(o):
    bm=bmesh.new();bm.from_mesh(o.data)
    for _ in range(3):
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=0.0001)
        bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=0.0001)
        bmesh.ops.triangulate(bm,faces=list(bm.faces))
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
def checked(stage):
    for o in [f,r]:
        clean(o);m=metrics(o);bm=bmesh.new();bm.from_mesh(o.data);m['nonmanifold_vertices']=sum(not v.is_manifold for v in bm.verts);bm.free()
        if m['nonmanifold_edges'] or m['nonmanifold_vertices'] or m['components']!=1:
            bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'DEBUG_T24.blend'));raise AssertionError((stage,o.name,m))
        log.setdefault('checkpoints',{}).setdefault(stage,{})[o.name]=m
    for n in FROZEN[:-1]:assert signature(bpy.data.objects[n])==frozen[n]
    print('PASS',stage,flush=True)
    (OUT/'edit_audit.json').write_text(json.dumps(log,indent=2))
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stage+'.blend')))
# A. These four low ballast rails are the only identified non-mounting protrusions.
v0=metrics(r)['volume_mm3']
boolean(r,box('T24_REMOVE_REDUNDANT_BALLAST_RAILS',(18.9999,66.0001),(floor_top+0.0001,floor_top+3.2001),(-73.2001,-28.7999)))
log['operations'].append({'A_removed':'Four ballast retaining rails only','volume_removed_mm3':v0-metrics(r)['volume_mm3'],'preserved':'central PCB guide, screw mounts, PCB guides, structural floor, foot pocket backing, rear USB'})
checked('CP24_A')
# B. Restore just the four local front regions to their state before the M3 receiving tongues.
with bpy.data.libraries.load(str(ROOT/'CP03_base_extension.blend'),link=False) as (src,dst):dst.objects=['FRONT_BODY']
base=dst.objects[0];base.name='__T24_FRONT_PRE_BOSSES';bpy.context.scene.collection.objects.link(base);base.hide_viewport=False;base.hide_set(False);bpy.context.view_layer.update()
for x in [10,32,54,76]:
    roi=box('__T24_FRONT_ROI',(x-4.501,x+4.501),(old_seat-0.001,0.601),(-5.501,9.001))
    patch=copy(base,'__T24_FRONT_BASE_PATCH');boolean(patch,roi,'INTERSECT',True);boolean(f,roi);boolean(f,patch,'UNION')
delete(base)
log['front_after_boss_removal']=metrics(f)
# Keep underside access/head geometry fixed. New front pads carry the head and have clearance bores.
# Contact faces are parallel to +Z_PCB so front removal does not create a new undercut.
for x in [10,32,54,76]:
    lower=box('__T24_FRONT_PASS_PAD',(x-5.5,x+5.5),(floor,2),(-6.5,9))
    boolean(lower,box('__T24_CONTACT_BELOW',(-200,200),(-200,contact_pcb_y),(-200,200),P),'INTERSECT')
    clear=box('__T24_REAR_PAD_CLEARANCE',(x-5.8,x+5.8),(floor-0.01,2),(-6.8,18))
    boolean(clear,box('__T24_CONTACT_CLEAR',(-200,200),(-200,contact_pcb_y+0.0001),(-200,200),P),'INTERSECT')
    boolean(r,clear)
    boolean(f,lower,'UNION')
    boolean(f,cylinder('__T24_M3_FRONT_PASS',(x,-1),1.7,floor-2,3,axis='Y'))
    boolean(f,cylinder('__T24_M3_HEAD_UNCHANGED',(x,-1),3.1,floor-2,floor+3.2,axis='Y'))
    receiver=box('__T24_REAR_M3_RECEIVER',(x-4.5,x+4.5),(old_seat-3,0.6),(-5.5,4))
    boolean(receiver,box('__T24_CONTACT_ABOVE',(-200,200),(contact_pcb_y+0.0001,-0.3),(-200,2.7),P),'INTERSECT')
    boolean(r,receiver,'UNION')
    shoulder=box('__T24_M3_STRUCTURAL_SHOULDER',(x-6.4,x+6.4),(-6.2,-3.0),(-5.5,1.8))
    boolean(shoulder,box('__T24_SHOULDER_ENVELOPE',(-200,200),(-200,-0.3),(-200,2.7),P),'INTERSECT')
    boolean(r,shoulder,'UNION')
    boolean(r,cylinder('__T24_REAR_M3_PILOT',(x,-1),1.25,floor-2,old_seat+6.4,axis='Y'))
log['operations'].append({'B':'Four front threaded tongues removed; head/pass pads in FRONT, four receiving bosses and structural shoulders in REAR','axes_world_xz':[[x,-1] for x in [10,32,54,76]],'front_pass_diameter':3.4,'head_diameter_depth':[6.2,3.2],'rear_pilot_diameter':2.5,'rear_pilot_depth_axis':old_seat+6.4-contact_world_y,'reason_contact_plane':'Parallel to hardware extraction axis; preserves head recess Y and avoids trapping front under receivers'})
checked('CP24_B')
# C. Reconstruct only the port band from an adjacent, undisturbed constant-width wall section.
# This removes the old hole AND its oversized hood, without copying any PCB post or guide block.
for body in [f,r]:
    donor=copy(body,'__T24_USB_WALL_DONOR')
    boolean(donor,box('__T24_DONOR_SECTION',(10,28),(122,150),(-2,15),P),'INTERSECT')
    for v in donor.data.vertices:
        world=donor.matrix_world@v.co;world.x=28+(world.x-10)*22/18;v.co=donor.matrix_world.inverted()@world
    donor.data.update();clean(donor)
    boolean(body,box('__T24_USB_OLD_BAND',(28,50),(122,150),(-2,15),P))
    boolean(body,donor,'UNION')
    boolean(body,box('__T24_USB_NEW_9x3',(38.465,47.465),(125.23,155),(3.5,6.5),P))
usb=bpy.data.objects['USB_C_TOP_REF'];old_loc=list(usb.location);old_rot=list(usb.rotation_euler);old_scale=list(usb.scale)
screen=bpy.data.objects['SCREEN_FACE'];centre=sum((I@screen.matrix_world@v.co for v in screen.data.vertices),Vector())/len(screen.data.vertices)
old_usb=sum((I@usb.matrix_world@v.co for v in usb.data.vertices),Vector())/len(usb.data.vertices)
assert abs(centre.x-42.965)<0.0001
if abs(old_usb.x-38.03)<0.0001:usb.location.x+=centre.x-old_usb.x
else:assert abs(old_usb.x-centre.x)<0.0001,'Unexpected USB position'
bpy.context.view_layer.update()
assert list(usb.location)[1:]==old_loc[1:] and list(usb.rotation_euler)==old_rot and list(usb.scale)==old_scale
log['usb']={'old_local_centre':list(old_usb),'screen_local_centre':list(centre),'new_local_centre':list(sum((I@usb.matrix_world@v.co for v in usb.data.vertices),Vector())/len(usb.data.vertices)),'old_location_world':old_loc,'new_location_world':list(usb.location),'nominal_aperture_mm':[9,3],'range_x':[38.465,47.465],'range_z_pcb':[3.5,6.5]}
log['frozen_after']={n:signature(bpy.data.objects[n]) for n in FROZEN}
checked('CP24_C')
for o in [f,r]:o.color=(0.28,0.32,0.39,1)
for c in bpy.data.collections:c.hide_render=(c.name=='ARCHIVE_REFERENCE_DO_NOT_PRINT')
render('TAREA24/rear_internal.png',['REAR_BODY'],(125,195,215),(42,57,-28),215)
render('TAREA24/front_internal.png',['FRONT_BODY'],(140,20,-200),(42,57,-6),205)
render('TAREA24/top_usb.png',['FRONT_BODY','REAR_BODY','USB_C_TOP_REF'],(90,255,120),(43,130,-29),65)
