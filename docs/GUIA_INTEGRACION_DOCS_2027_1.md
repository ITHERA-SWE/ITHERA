# ITHERA — Integración de la documentación 2027/1

Esta entrega actualiza la **documentación**, sin modificar frontend, backend, dependencias ni variables de entorno.

## Qué cambia

| Archivo | Cambio |
| --- | --- |
| `README.md` | Datos académicos 2027/1, grupo 6CM3, equipo actual, arquitectura, módulos, URLs de despliegue y uso local |
| `CONTRIBUTING.md` | Flujo de ramas, PR, CI, pruebas, privacidad y colaboración del equipo actual |
| `LICENSE` | Texto MIT conservado; añade copyright 2026 de Sangrador Curiel Yael Sebastian sin retirar el aviso del titular anterior |
| `docs/DESPLIEGUE_ITHERA.md` | Configuración del entorno de pruebas Vercel/Render/Supabase/Google, sin secretos |
| `docs/GUIA_INTEGRACION_DOCS_2027_1.md` | Esta guía |
| `docs/MANIFEST_DOCS_2027_1.json` | SHA-256 por archivo de entrega |
| `docs/aplicar_docs_2027_1.py` | Verificación y aplicación con rollback |

## Nota de exactitud de la base

La documentación se elaboró a partir de una copia del README disponible en el historial del proyecto y de los datos compartidos del despliegue. **No se pudo consultar directamente el último commit remoto de `develop`**. Por seguridad, el aplicador comprueba marcadores del contenido anterior y rechaza ramas protegidas, cambios pendientes o archivos nuevos en conflicto. **Antes del commit revisa siempre el diff**, especialmente si el README o CONTRIBUTING han cambiado recientemente en GitHub. Si hubo cambios documentales posteriores, reconcilia las diferencias manualmente y no fuerces el instalador.

## 1. Preparar rama desde `develop`

```bash
cd "/Users/yaelsangrador/Desktop/Sangrador/Ingenieria de Software/ITHERA-SWE"
git status --short
git switch develop
git pull --ff-only origin develop
git switch -c docs/actualizacion-ithera-2027-1
```

La primera línea `git status --short` debe estar vacía. No ejecutes esos comandos si hay trabajo local sin registrar.

## 2. Verificar sin escribir

Coloca `ITHERA_Documentacion_2027-1.zip` en `~/Downloads`.

```bash
ZIP_DOCS="$HOME/Downloads/ITHERA_Documentacion_2027-1.zip"
APLICADOR_DOCS="$(mktemp -t ithera-docs)"
unzip -t "$ZIP_DOCS"
unzip -p "$ZIP_DOCS" docs/aplicar_docs_2027_1.py > "$APLICADOR_DOCS"
python3 "$APLICADOR_DOCS" "$ZIP_DOCS" --check
```

El aplicador revisa integridad SHA-256, rutas del ZIP, rama, árbol limpio, presencia de marcadores documentales y colisiones de nuevos archivos. No toca secretos ni ejecuta servicios externos.

## 3. Aplicar y revisar

```bash
python3 "$APLICADOR_DOCS" "$ZIP_DOCS" --apply

git status --short
git diff --check
git diff -- README.md CONTRIBUTING.md LICENSE
git diff --no-index /dev/null docs/DESPLIEGUE_ITHERA.md || true
```

**Revisa específicamente el diff de `CONTRIBUTING.md` y `README.md`** porque se entrega una versión completa, y los cambios recientes pueden no estar representados en la copia de referencia. No descartes datos legítimos nuevos: si algo falta, integra esas secciones antes del commit.

## 4. Commit, push y PR

```bash
git add README.md CONTRIBUTING.md LICENSE docs/DESPLIEGUE_ITHERA.md \
  docs/GUIA_INTEGRACION_DOCS_2027_1.md docs/MANIFEST_DOCS_2027_1.json \
  docs/aplicar_docs_2027_1.py

git diff --cached --check
git diff --cached --stat
git commit -m "docs: actualizar ITHERA para ciclo 2027-1"
git push -u origin docs/actualizacion-ithera-2027-1

gh pr create \
  --base develop \
  --head docs/actualizacion-ithera-2027-1 \
  --title "docs: actualizar equipo, materia y despliegue ITHERA" \
  --body "Actualiza README, roles del equipo y documentación de despliegue para 2027/1. Mantiene licencia MIT y atribución original, y añade el copyright del trabajo actual. Sin cambios en frontend/backend." 
```

Después, revisa el PR y los checks. El merge debe respetar las protecciones del repositorio. No hace falta ejecutar build ni instalar dependencias para un cambio exclusivamente documental.

## Sobre el copyright

La licencia MIT requiere preservar el aviso de copyright original en copias y porciones sustanciales. Por eso este paquete añade `Copyright (c) 2026 Sangrador Curiel Yael Sebastian` sin sustituir ni eliminar el aviso `Copyright (c) 2026 Demian Rom`. El texto de permisos de MIT se mantiene. Es una precaución de atribución, no asesoramiento legal.

## Alcance no modificado

La sección **Contributors** generada automáticamente por GitHub no se edita. Los archivos de diseño, flujos de autenticación, credenciales de Google/Supabase y despliegues existentes tampoco se alteran.
