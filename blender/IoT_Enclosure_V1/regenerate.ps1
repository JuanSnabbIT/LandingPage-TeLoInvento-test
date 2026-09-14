param([string]$BlenderExecutable='C:\Program Files\Blender Foundation\Blender 5.2\blender.exe')
$ErrorActionPreference='Stop'
$iotRoot=$PSScriptRoot
$iotStages=@(
    @('CP00_original.blend','build_final.py'),
    @('CP06_mechanical.blend','finish_features.py'),
    @('CP07_features.blend','repair_usb_membrane.py'),
    @('CP08_validated_geometry.blend','clean_export_topology.py'),
    @('CP09_export_cleanup.blend','validate_mechanical.py'),
    @('CP09_export_cleanup.blend','audit_fdm.py'),
    @('CP09_export_cleanup.blend','package_final.py')
)
foreach($iotStage in $iotStages){
    & $BlenderExecutable --background (Join-Path $iotRoot $iotStage[0]) --python-exit-code 1 --python (Join-Path $iotRoot $iotStage[1])
    if($LASTEXITCODE -ne 0){throw "Fallo en $($iotStage[1]); consultar checkpoint previo."}
}
