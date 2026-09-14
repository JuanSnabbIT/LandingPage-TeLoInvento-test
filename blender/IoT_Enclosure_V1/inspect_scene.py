import bpy, json, bmesh
from mathutils import Vector
from pathlib import Path
out=Path(__file__).resolve().parent
def include(c):
    c.exclude=False;c.hide_viewport=False
    for a in c.children:include(a)
include(bpy.context.view_layer.layer_collection)
for c in bpy.data.collections:c.hide_viewport=False
for o in bpy.data.objects:o.hide_viewport=False;o.hide_set(False);o.update_tag()
bpy.context.scene.frame_set(bpy.context.scene.frame_current)
bpy.context.view_layer.update()
pcb=bpy.data.objects['PCB']; inv=pcb.matrix_world.inverted()
data={'units':bpy.context.scene.unit_settings.scale_length,'objects':[]}
for o in bpy.data.objects:
    row={'name':o.name,'type':o.type,'location':list(o.location),'rotation':list(o.rotation_euler),'scale':list(o.scale),'collections':[c.name for c in o.users_collection],'hidden':o.hide_get(),'hide_render':o.hide_render,'properties':{k:str(v) for k,v in o.items()},'modifiers':[]}
    for m in o.modifiers:
        row['modifiers'].append({'name':m.name,'type':m.type,**{k:str(getattr(m,k)) for k in ['operation','object','thickness','width','segments','solver'] if hasattr(m,k)}})
    if o.type=='MESH':
        ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get()); me=ev.to_mesh()
        world=[o.matrix_world@v.co for v in me.vertices]; local=[inv@v for v in world]
        row['world_bounds']=[[min(v[i] for v in world),max(v[i] for v in world)] for i in range(3)] if world else []
        row['pcb_bounds']=[[min(v[i] for v in local),max(v[i] for v in local)] for i in range(3)] if local else []
        bm=bmesh.new();bm.from_mesh(me);bm.transform(o.matrix_world)
        row.update(vertices=len(me.vertices),faces=len(me.polygons),volume=bm.calc_volume(signed=True),nonmanifold=sum(not e.is_manifold for e in bm.edges))
        seen=set();parts=[]
        for v in bm.verts:
            if v in seen:continue
            stack=[v];seen.add(v);comp=[]
            while stack:
                a=stack.pop();comp.append(a)
                for e in a.link_edges:
                    n=e.other_vert(a)
                    if n not in seen:seen.add(n);stack.append(n)
            parts.append({'verts':len(comp),'pcb_bounds':[[min((inv@v.co)[i] for v in comp),max((inv@v.co)[i] for v in comp)] for i in range(3)]})
        row['components']=parts;bm.free();ev.to_mesh_clear()
    data['objects'].append(row)
(out/'initial_audit.json').write_text(json.dumps(data,indent=2))
print(json.dumps([{k:o[k] for k in ['name','pcb_bounds','vertices','volume','nonmanifold','components'] if k in o} for o in data['objects'] if o['name'] in ['FRONT_BODY','REAR_BODY','REAR_BODY.003','PCB','SCREEN_FACE','USB_C_TOP_REF']],indent=2))
