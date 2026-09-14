# 05 — PROMPT PROTOCOL PARA GEMINI + BLENDER MCP

## Regla
Una tarea por mensaje.

## Reglas permanentes
- No anticipar pasos.
- No añadir detalles.
- No modificar objetos aprobados sin autorización.
- No inventar medidas.
- Reportar valores reales tras cada operación.
- Detenerse al terminar.

## Plantilla

```text
TAREA XX — NOMBRE

OBJETOS AUTORIZADOS:
- ...

REALIZA ÚNICAMENTE:
- ...

VALORES:
- ...

NO MODIFIQUES:
- ...

VALIDA:
1. ...
2. ...

Informa el resultado y detente.
```

## Checkpoints
- PENDIENTE
- APROBADO
- RECHAZADO
- CORREGIR

No continuar si el checkpoint actual no está aprobado.

## Recuperación
Si una tarea falla:
1. No rehacer todo.
2. Identificar solo el elemento afectado.
3. Emitir prompt correctivo corto.
4. Revalidar el mismo checkpoint.
