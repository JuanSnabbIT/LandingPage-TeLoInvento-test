import sys,struct,zipfile,xml.etree.ElementTree as ET
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent))
from geometry import *
enable();audit=json.loads((ROOT/'build_audit.json').read_text());manifest=json.loads((ROOT/'export_manifest.json').read_text());results={'files':[],'hardware':{},'blend':{}}
for n,h in audit['frozen_before'].items():
    actual=signature(bpy.data.objects[n]);assert actual==h;results['hardware'][n]='UNCHANGED'
for n in ['FRONT_BODY','REAR_BODY']:
    bpy.data.objects[n]['parameter_file']='parameters.json'
    m=metrics(bpy.data.objects[n]);assert m['components']==1 and m['nonmanifold_edges']==0;results['blend'][n]=m
for entry in manifest['exports']:
    path=ROOT/entry['file'];raw=path.read_bytes();assert hashlib.sha256(raw).hexdigest()==entry['sha256']
    count=struct.unpack_from('<I',raw,80)[0];assert len(raw)==84+50*count
    verts=[];faces=[];lookup={};signed=0
    for i in range(count):
        vals=struct.unpack_from('<12fH',raw,84+50*i);face=[]
        for j in [3,6,9]:
            p=tuple(vals[j:j+3])
            if p not in lookup:lookup[p]=len(verts);verts.append(p)
            face.append(lookup[p])
        a,b,c=[Vector(verts[j]) for j in face];assert (b-a).cross(c-a).length>1e-9
        signed+=a.dot(b.cross(c))/6;faces.append(face)
    bm=bmesh.new();bvs=[bm.verts.new(v) for v in verts]
    for face in faces:bm.faces.new([bvs[j] for j in face])
    bm.normal_update();bad=sum(not e.is_manifold for e in bm.edges);inconsistent=sum(not e.is_contiguous for e in bm.edges);assert bad==0 and inconsistent==0,(path,bad,inconsistent)
    assert signed>0 and abs(signed-entry['volume_mm3'])<0.01,(path,signed,entry['volume_mm3'])
    assert abs(min(v[2] for v in verts))<0.0001
    results['files'].append({'file':entry['file'],'triangles':count,'nonmanifold_edges':bad,'inconsistent_edges':inconsistent,'positive_volume_mm3':signed,'z_min_mm':min(v[2] for v in verts)})
    bm.free()
for n in ['FRONT_BODY','REAR_BODY']:
    path=ROOT/'STL'/(n+'.3mf');ns={'m':'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'}
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None;root=ET.fromstring(z.read('3D/3dmodel.model'));assert root.attrib['unit']=='millimeter'
        tris=root.findall('.//m:triangle',ns);assert len(tris)==next(e['triangles'] for e in manifest['exports'] if e['object']==n)
    results['files'].append({'file':str(path.relative_to(ROOT)),'unit':'millimeter','triangles':len(tris),'archive_crc':'PASS'})
results['status']='PASS: delivery read back independently; physical validation remains pending'
(ROOT/'delivery_verification.json').write_text(json.dumps(results,indent=2))
# Make the handover readable from inside Blender as well as outside it.
for name in ['INFORME_FINAL.md','README.md','parameters.json','delivery_verification.json']:
    t=bpy.data.texts.get(name) or bpy.data.texts.new(name);t.clear();t.write((ROOT/name).read_text(encoding='utf-8'))
for o in bpy.data.objects:
    if o.name not in ['FRONT_BODY','REAR_BODY']+FROZEN:o.hide_set(True)
for c in bpy.data.collections:
    if c.name=='ARCHIVE_REFERENCE_DO_NOT_PRINT':c.hide_render=True;c.hide_viewport=True
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'IoT_Enclosure_V1_FINAL.blend'))
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'IoT_Enclosure_V1_CP01.blend'))
selected=['IoT_Enclosure_V1_FINAL.blend','CP00_original.blend','INFORME_FINAL.md','README.md','parameters.json','mechanical_validation.json','fdm_validation.json','export_manifest.json','delivery_verification.json','build_audit.json','regenerate.ps1','geometry.py','build_final.py','finish_features.py','repair_usb_membrane.py','clean_export_topology.py','validate_mechanical.py','audit_fdm.py','package_final.py','verify_delivery.py']
selected += [p.name for p in ROOT.glob('FINAL_*.png')]
selected += [str(p.relative_to(ROOT)) for folder in ['STL','PROBETAS','FUENTES'] for p in (ROOT/folder).iterdir() if p.is_file()]
archive_path=ROOT/'IoT_Enclosure_V1_ENTREGA.zip'
with zipfile.ZipFile(archive_path,'w',zipfile.ZIP_DEFLATED) as z:
    for name in selected:z.write(ROOT/name,'IoT_Enclosure_V1/'+name.replace('\\','/'))
with zipfile.ZipFile(archive_path) as z:assert z.testzip() is None
print(json.dumps({'status':results['status'],'verified_files':len(results['files']),'archive':str(archive_path),'archive_bytes':archive_path.stat().st_size,'hardware_unchanged':len(results['hardware'])}),flush=True)
