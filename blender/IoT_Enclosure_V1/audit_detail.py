import sys
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent))
from geometry import *
enable();pcb=bpy.data.objects['PCB'];P=pcb.matrix_world.copy();I=P.inverted()
f=bpy.data.objects['FRONT_BODY'];r=bpy.data.objects['REAR_BODY']
for o in [f,r]:o.color=(0.24,0.29,0.34,1)
bpy.data.objects['SCREEN_FACE'].color=(0.025,0.055,0.07,1)
print('INTERSECTIONS',[(o.name,intersection(o,pcb)) for o in [f,r]],'HALVES',intersection(f,r))
for o in [f,r]:
    vs=[I@o.matrix_world@v.co for v in o.data.vertices]
    (ROOT/(o.name+'_vertices.json')).write_text(json.dumps([list(v) for v in vs]))
    print(o.name,'Z_LEVELS',sorted(set(round(v.z,3) for v in vs)))
render('initial-assembly.png',['FRONT_BODY','REAR_BODY','SCREEN_FACE','BTN_01','BTN_02','BTN_03'],(-160,140,220),(42,65,-24))
render('initial-rear-interior.png',['REAR_BODY'],(200,210,240),(42,65,-24))
