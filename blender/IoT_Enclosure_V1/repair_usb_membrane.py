import sys
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent))
from geometry import *
enable();f=bpy.data.objects['FRONT_BODY'];r=bpy.data.objects['REAR_BODY'];P=bpy.data.objects['PCB'].matrix_world.copy()
# Remove the demonstrated 0.2 mm membrane between the throat and split plane.
boolean(f,box('REMOVE_USB_0_2_MEMBRANE',(33.23,42.83),(125.23,137),(2.9,3.21),P))
boolean(f,box('USB_ROOF_2_4',(29.63,46.43),(133.8,138.9),(8.5,10.9),P),'UNION')
boolean(r,box('USB_SILL_2_4',(29.63,46.43),(136.5,139.6),(-0.9,1.5),P),'UNION')
assert metrics(f)['nonmanifold_edges']==0 and metrics(f)['components']==1
params=json.loads((ROOT/'parameters.json').read_text());params['usb_top_throat']['value']=[9.6,3.8];params['usb_top_throat']['reason']='Corte frontal hasta plano de union Z=3; evita membrana de 0.2 mm. Referencia USB intacta.'
params['usb_roof_and_sill']={'value':2.4,'status':'DERIVADO','reason':'Espesor nominal APROBADO aplicado localmente: techo Z=8.5..10.9 y apoyo trasero Z=-0.9..1.5; elimina paredes de 0.2/0.9 mm en acceso USB.'}
(ROOT/'parameters.json').write_text(json.dumps(params,indent=2,ensure_ascii=False))
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'CP08_validated_geometry.blend'))
