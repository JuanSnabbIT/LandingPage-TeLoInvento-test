import sys, struct, zipfile, xml.etree.ElementTree as ET, shutil
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent))
from geometry import *
enable();P=bpy.data.objects['PCB'].matrix_world.copy();I=P.inverted();f=bpy.data.objects['FRONT_BODY'];r=bpy.data.objects['REAR_BODY'];audit=json.loads((ROOT/'build_audit.json').read_text())
for n,h in audit['frozen_before'].items():assert signature(bpy.data.objects[n])==h,n
for o in [f,r]:
    m=metrics(o);assert m['nonmanifold_edges']==0 and m['components']==1 and m['volume_mm3']>0
mech=json.loads((ROOT/'mechanical_validation.json').read_text());fdm=json.loads((ROOT/'fdm_validation.json').read_text())
for key in ['front_rear_motion','front_pcb_motion','pcb_removal']:assert max(abs(v) for d,v in mech[key])<0.001
for key in ['screen_pocket','screen_above','screen_window','BTN_1','BTN_2','BTN_3']:assert all(abs(v)<0.001 for v in mech[key].values())
for n in ['FRONT_BODY','REAR_BODY']:assert fdm[n]['candidate_count']==0 and fdm[n]['inconsistent_edges']==0
for key in ['top_usb_cable_mm3','ballast_test_40x37_4x6_mm3']:assert max(abs(v) for v in fdm[key].values())<0.001
stls=ROOT/'STL';stls.mkdir(exist_ok=True);coupons=ROOT/'PROBETAS';coupons.mkdir(exist_ok=True)
exports=[];printrot={'FRONT_BODY':Matrix.Rotation(math.pi,4,'X')@I,'REAR_BODY':Matrix.Rotation(math.pi/2,4,'X')}
def export(o,path,rot):
    # Resolve sub-micron duplicate/collinear Boolean vertices before STL triangulation.
    bm=bmesh.new();bm.from_mesh(o.data)
    for _ in range(3):
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=0.0001)
        bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=0.0001)
        bmesh.ops.triangulate(bm,faces=list(bm.faces))
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
    o.data.calc_loop_triangles();vs=[rot@o.matrix_world@v.co for v in o.data.vertices]
    mins=Vector([min(v[i] for v in vs) for i in range(3)]);vs=[v-mins for v in vs]
    fs=[tuple(t.vertices) for t in o.data.loop_triangles]
    # Independent triangle-edge check after export coordinates are quantized to 0.0001 mm.
    idx={};edges={};volume=0;degenerate=0;down=0
    for face in fs:
        a,b,c=[vs[i] for i in face];area=(b-a).cross(c-a).length/2
        if area<1e-9:degenerate+=1
        volume+=a.dot(b.cross(c))/6
        for k in range(3):
            u=tuple(round(v,5) for v in vs[face[k]]);v=tuple(round(v,5) for v in vs[face[(k+1)%3]])
            edge=tuple(sorted([u,v]));edges[edge]=edges.get(edge,0)+1
        if min(a.z,b.z,c.z)>0.01 and (b-a).cross(c-a).normalized().z < -math.cos(math.radians(50)):down+=area
    with path.open('wb') as out:
        out.write((o.name+' | IoT V1 PROTOTYPE | coordinates mm').encode()[:80].ljust(80,b' '));out.write(struct.pack('<I',len(fs)))
        for face in fs:
            a,b,c=[vs[i] for i in face];n=(b-a).cross(c-a).normalized();out.write(struct.pack('<12fH',*n,*a,*b,*c,0))
    result={'file':str(path.relative_to(ROOT)),'object':o.name,'triangles':len(fs),'dimensions_mm':[max(v[i] for v in vs) for i in range(3)],'volume_mm3':volume,'degenerate_triangles':degenerate,'edge_count_errors_quantized':sum(v!=2 for v in edges.values()),'support_candidate_area_mm2_excluding_bed':down,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    assert degenerate==0 and result['edge_count_errors_quantized']==0,result
    exports.append(result);return vs,fs,result
main=[]
for o in [f,r]:
    v,faces,record=export(o,stls/(o.name+'.stl'),printrot[o.name]);main.append((o.name,v,faces))
    assert abs(record['volume_mm3']-metrics(o)['volume_mm3'])<0.1
# A standards-based model-only 3MF per piece, units explicit; no unvalidated machine/toolpath settings.
ns='http://schemas.microsoft.com/3dmanufacturing/core/2015/02';ET.register_namespace('',ns)
for name,vs,faces in main:
    model=ET.Element('{'+ns+'}model',unit='millimeter',attrib={'{http://www.w3.org/XML/1998/namespace}lang':'es-ES'})
    meta=ET.SubElement(model,'{'+ns+'}metadata',name='Title');meta.text=name+' IoT V1 prototipo'
    resources=ET.SubElement(model,'{'+ns+'}resources');obj=ET.SubElement(resources,'{'+ns+'}object',id='1',type='model',name=name);mesh_xml=ET.SubElement(obj,'{'+ns+'}mesh');vertices=ET.SubElement(mesh_xml,'{'+ns+'}vertices')
    for v in vs:ET.SubElement(vertices,'{'+ns+'}vertex',x=f'{v.x:.7f}',y=f'{v.y:.7f}',z=f'{v.z:.7f}')
    triangles=ET.SubElement(mesh_xml,'{'+ns+'}triangles')
    for a,b,c in faces:ET.SubElement(triangles,'{'+ns+'}triangle',v1=str(a),v2=str(b),v3=str(c))
    build=ET.SubElement(model,'{'+ns+'}build');ET.SubElement(build,'{'+ns+'}item',objectid='1')
    with zipfile.ZipFile(stls/(name+'.3mf'),'w',zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>')
        z.writestr('_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>')
        z.writestr('3D/3dmodel.model',ET.tostring(model,encoding='utf-8',xml_declaration=True))
# Coupons are kept outside the product assembly. None is a button cap.
c=box('COUPON_BUTTON',(0,16.6),(0,15),(0,8));boolean(c,rounded_box('__APERTURE',(3,13.6),(1.9,12.5),(-1,9),0.8));export(c,coupons/'01_BUTTON_OPENING.stl',Matrix.Identity(4));delete(c)
for thread,ds,depth in [('M25',[2.0,2.1,2.2],6.0),('M3',[2.4,2.5,2.6],6.4)]:
    c=box('COUPON_'+thread,(0,42),(0,14),(0,depth+2.4))
    for x,d in zip([7,21,35],ds):boolean(c,cylinder('__PILOT',(x,7),d/2,2.4,depth+2.5))
    export(c,coupons/('02_'+thread+'_PILOTS.stl'),Matrix.Identity(4));delete(c)
for o in [f,r]:
    c=copy(o,'COUPON_GUIDE_'+o.name);boolean(c,box('__CROP',(-4,0.5),(50,70),(-0.5,8),P),'INTERSECT')
    assert metrics(c)['nonmanifold_edges']==0 and metrics(c)['components']==1,metrics(c)
    export(c,coupons/('03_GUIDE_'+o.name+'.stl'),Matrix.Rotation(math.pi,4,'X')@I);delete(c)
# Actual joint pair, one fixing cropped from the new product geometry.
for o in [f,r]:
    c=copy(o,'COUPON_M3_JOINT_'+o.name);boolean(c,box('__CROP',(3.5,16.5),(-15.5,-9.62 if o==r else -0.5),(-7,10)),'INTERSECT')
    assert metrics(c)['nonmanifold_edges']==0 and metrics(c)['components']==1,metrics(c)
    export(c,coupons/('04_M3_JOINT_'+o.name+'.stl'),Matrix.Rotation(math.pi/2,4,'X'));delete(c)
# Sources travel with the model and remain classified in the parameter ledger.
sources=ROOT/'FUENTES';sources.mkdir(exist_ok=True)
names=['00_MASTER_SPEC.md','01_HARDWARE_MAP.md','02_ENCLOSURE_REQUIREMENTS.md','03_DESIGN_DECISIONS (1).md','04_BLENDER_PLAN (1).md','05_PROMPT_PROTOCOL.md','06_PENDING_VALIDATIONS (1).md','PROJECT_INSTRUCTIONS (1).txt','README (1).md']
for name in names:
    dest=sources/name.replace(' (1)','');shutil.copy2(Path(r'C:\Users\soporte\Downloads')/name,dest)
    txt=bpy.data.texts.get(dest.name) or bpy.data.texts.new(dest.name);txt.clear();txt.write(dest.read_text(encoding='utf-8-sig'))
for o in [f,r]:
    o['manufacturing_status']='PROTOTIPO V1: validacion digital completada; pruebas fisicas pendientes'
    o['units']='mm';o['parameter_file']='parameters.json';o.color=(0.28,0.32,0.39,1)
hardware=[bpy.data.objects[n] for n in FROZEN]
for o in hardware:o.hide_set(False);o.hide_viewport=False
bpy.data.objects['PCB'].color=(0.32,0.38,0.08,1)
bpy.data.objects['SCREEN_FACE'].color=(0.018,0.035,0.05,1)
for n in ['BTN_01','BTN_02','BTN_03']:bpy.data.objects[n].color=(0.8,0.82,0.78,1)
for o in list(bpy.data.objects):
    if o not in [f,r]+hardware:o.hide_set(True);o.hide_render=True
for c in bpy.data.collections:c.hide_render=(c.name=='ARCHIVE_REFERENCE_DO_NOT_PRINT')
# Surface/volume geometric centroid only; no hardware mass is invented.
def centroid(o):
    o.data.calc_loop_triangles();total=0;weighted=Vector()
    for tri in o.data.loop_triangles:
        a,b,c=[o.matrix_world@o.data.vertices[i].co for i in tri.vertices];vol=a.dot(b.cross(c))/6;total+=vol;weighted+=(a+b+c)*(vol/4)
    return total,weighted/total
vf,cf=centroid(f);vr,cr=centroid(r);cg=(cf*vf+cr*vr)/(vf+vr)
summary={'exports':exports,'frozen_hardware':{n:signature(bpy.data.objects[n]) for n in FROZEN},'geometric_centroid_uniform_density_world_mm':list(cg),'mass_and_loaded_stability':'PENDIENTE: masas del hardware, lastre y patas desconocidas','assembly_bounds_world_mm':[[-3.9,88.9],[-15.4204006,137.0140991],[-78.3654022,11.6345997]],'status':'PROTOTIPO CAD FINALIZADO; VALIDACION FISICA PENDIENTE'}
(ROOT/'export_manifest.json').write_text(json.dumps(summary,indent=2))
for name in ['parameters.json','mechanical_validation.json','fdm_validation.json','export_manifest.json']:
    txt=bpy.data.texts.get(name) or bpy.data.texts.new(name);txt.clear();txt.write((ROOT/name).read_text())
# Final source file retains the real assembly coordinates and hardware transforms.
bpy.ops.object.select_all(action='DESELECT');f.select_set(True);r.select_set(True);bpy.context.view_layer.objects.active=f
render('FINAL_ensamblado.png',['FRONT_BODY','REAR_BODY']+FROZEN,(-150,115,240),(42,60,-23),215)
render('FINAL_trasera.png',['FRONT_BODY','REAR_BODY'],(155,120,-260),(42,58,-30),215)
render('FINAL_interior.png',['REAR_BODY'],(125,195,215),(42,57,-28),215)
render('FINAL_inferior.png',['FRONT_BODY','REAR_BODY'],(135,-230,100),(42,10,-30),205)
start=f.matrix_world.copy();f.matrix_world=Matrix.Translation(P.to_3x3()@Vector((0,0,38)))@start
render('FINAL_desmontaje.png',['FRONT_BODY','REAR_BODY']+FROZEN,(-170,150,255),(42,62,-8),250);f.matrix_world=start;bpy.context.view_layer.update()
render('FINAL_ensamblado.png',['FRONT_BODY','REAR_BODY']+FROZEN,(-150,115,240),(42,60,-23),215)
for n,h in audit['frozen_before'].items():assert signature(bpy.data.objects[n])==h
# Set a useful opening viewport without applying transforms to any reference object.
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_location=(42,60,-23);area.spaces.active.region_3d.view_distance=235
            area.spaces.active.region_3d.view_rotation=bpy.context.scene.camera.rotation_euler.to_quaternion();area.spaces.active.clip_end=3000
            area.spaces.active.shading.color_type='OBJECT'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'IoT_Enclosure_V1_FINAL.blend'))
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'IoT_Enclosure_V1_CP01.blend'))
print('PACKAGE_COMPLETE',json.dumps(summary),flush=True)
