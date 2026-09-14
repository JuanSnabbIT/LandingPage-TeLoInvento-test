import sys
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent))
from geometry import *
from mathutils.bvhtree import BVHTree
enable();P=bpy.data.objects['PCB'].matrix_world.copy();I=P.inverted();f=bpy.data.objects['FRONT_BODY'];r=bpy.data.objects['REAR_BODY'];pcb=bpy.data.objects['PCB']
data={}
for moving,static,key in [(f,r,'front_rear_motion'),(f,pcb,'front_pcb_motion'),(pcb,r,'pcb_removal')]:
    c=copy(moving,'__MOVING');start=c.matrix_world.copy();samples=[]
    for d in [0,0.1,0.3,0.5,1,2,4,8,12,20,40,80,160]:
        c.matrix_world=Matrix.Translation(P.to_3x3()@Vector((0,0,d)))@start;bpy.context.view_layer.update()
        samples.append([d,intersection(c,static)])
    data[key]=samples;delete(c)
for key,x,y,z in [('screen_pocket',(12.3001,73.6299),(22.2701,116.5999),(3.0001,8.5999)),('screen_above',(12.3,73.63),(22.27,116.6),(11.0001,11.01)),('screen_window',(13.1151,72.8149),(23.0851,115.7849),(3,14))]+[('BTN_'+str(i),(x-5,x+5),(1.2,11.2),(3,14)) for i,x in enumerate([18.3,39.5,59.8],1)]:
    c=box('__KEEPOUT',x,y,z,P);data[key]={'front':intersection(f,c),'rear':intersection(r,c)};delete(c)
env=box('__REAR_ENV',(0,85),(0,135),(-7.4199,-1.4201),P)
for x,y in [(5,5),(80,5),(5,130),(80,130)]:boolean(env,cylinder('__MOUNT_EXCLUSION',(x,y),4.5,-8,0,mat=P))
data['rear_envelope_excluding_mount_zones_mm3']=intersection(r,env);delete(env)
# Ray intersections in PCB coordinates for the original apertures.
def tree(o,mat=Matrix.Identity(4)):
    return BVHTree.FromPolygons([mat@o.matrix_world@v.co for v in o.data.vertices],[list(p.vertices) for p in o.data.polygons],all_triangles=False)
t=tree(f,I)
data['button_aperture_rays']={}
for x in [18.3,39.5,59.8]:
    hits=[]
    for origin,direction in [((x,6.2,10),(1,0,0)),((x,6.2,10),(-1,0,0)),((x,6.2,10),(0,1,0)),((x,6.2,10),(0,-1,0))]:
        a=t.ray_cast(Vector(origin),Vector(direction),20);hits.append(list(a[0]) if a[0] else None)
    data['button_aperture_rays'][str(x)]=hits
t=tree(r)
data['rear_surface_z_by_world_y']={str(y):list(t.ray_cast(Vector((42.5,y,-180)),Vector((0,0,1)),250)[0] or []) for y in [-9,0,5,10,15,20,25,30,40,60,80,100,120]}
(ROOT/'mechanical_validation.json').write_text(json.dumps(data,indent=2));print(json.dumps(data,indent=2),flush=True)
render('assembly-upright.png',['FRONT_BODY','REAR_BODY'],(-160,145,210),(42,60,-23),195)
