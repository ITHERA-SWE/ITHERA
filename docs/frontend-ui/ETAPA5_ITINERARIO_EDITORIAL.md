# ITHERA — Integración de Etapa 5

## Qué incluye

Rediseño Editorial Travel Atlas del **Itinerario y la planificación colaborativa**, sobre el resultado completo de las Etapas 2, 3 y 4.

- Cabecera del itinerario con viaje, destino, fechas y acciones, sin duplicar la portada de Resumen.
- Navegación horizontal por días, actividad contabilizada, día seleccionado y control con flechas, Home y End. En móvil se desplaza únicamente la tira de días.
- Cronología conjunta de actividades confirmadas y propuestas; filtros, hora de inicio/fin disponibles, detalles, ubicación, descripción y acciones por permisos. Sin horas inventadas para registros incompletos.
- Coincidencias de inicio e intervalos superpuestos señalados como orientación. Las propuestas simultáneas pueden ser alternativas; el servidor sigue decidiendo los conflictos reales y no hay resolución automática ni nuevos estados.
- Formulario de actividad con búsqueda Google existente, nombre editable, descripción, día, inicio y fin opcional. Se conservan edición, creación normal y alta directa del organizador, documentos, gastos y relaciones existentes.
- Diálogos nativos para detalles, edición, confirmaciones y formularios de subgrupos, con bloqueo durante operaciones y devolución del foco. Las votaciones y conversaciones se consultan en la propuesta correspondiente de **Decisiones de Etapa 4**.
- Lugares del día y mapa bajo demanda, solo con coordenadas válidas recibidas. Fallback textual, reintento y enlace externo; sin geocodificación ni coordenadas de sustitución.
- Subgrupos con cabecera editorial y los mismos formularios, participantes, horarios, chat, validaciones y servicios.
- Compartir consulta mediante el servicio existente `GET /export/share-link/:groupId`, con URL y vencimiento del servidor. Se conserva la ruta pública `/shared/:token` y su servicio; no se añaden permisos ni se cambia su política de publicación.
- Acceso a la exportación existente: abre la vista de impresión del itinerario confirmado para **Guardar como PDF**. Conserva el HTML original; no implementa un generador PDF nuevo.
- Estados de carga específicos, vacíos separados de errores, reintentos, modos de lectura, bloqueo y desconexión. Se descartan resultados atrasados al cambiar de viaje y se cierra el formulario del viaje anterior.

No se agregaron dependencias ni se modificaron backend, base de datos, claves o `.env`. Resumen, búsquedas, checkout, servicios financieros y página pública compartida conservan su implementación. No hay drag-and-drop nuevo.

## Base exacta y compatibilidad

- Git original: `7abfe0156cd947b4a940b82b764afbca2ae21f72`.
- Encima: Etapas 2 y 3 completas.
- Encima: `ITHERA_Editorial_Decisiones_Etapa4.zip`, SHA256 `c5dc09686759c55b13c4162cfc4aac00a03b70b57683f61dea96671c642405c0`.

Los hashes de Etapa 4 y sus dependencias se comprobaron antes de editar. No se presupone un commit de merge posterior en GitHub. El aplicador comprueba contenido y ascendencia, de modo que funciona desde la rama local de Etapa 4 o desde `develop` después de fusionarla, **si los archivos coinciden**.

El ZIP contiene 15 archivos completos: 5 modificados y 10 nuevos, en sus rutas originales. Es una entrega incremental: necesita Etapa 4 completa previamente aplicada y guardada en Git. No es un repositorio completo.

Si corrigieron esos archivos durante la validación local de Etapa 4, el aplicador puede detenerse correctamente. No fuerces la extracción; hace falta adaptar la entrega a esa versión.

## Archivos modificados

```text
frontend/src/pages/Itinerary/DashboardPage.tsx
frontend/src/components/ui/DayView/DayView.tsx
frontend/src/components/ActivityProposalModal/ActivityProposalModal.tsx
frontend/src/components/subgroups/SubgroupSchedulePanel.tsx
frontend/src/components/collaboration/CollaborationView.tsx
```

El ajuste de `CollaborationView.tsx` únicamente permite seleccionar la propuesta indicada en `proposalId` al llegar desde una actividad. No rediseña nuevamente el comparador.

## Archivos nuevos

```text
frontend/src/components/itinerary/ItineraryPlanner.tsx
frontend/src/components/itinerary/DayMap.tsx
frontend/src/components/itinerary/ShareItineraryButton.tsx
frontend/src/components/itinerary/itinerary-data.ts
frontend/src/components/itinerary/itinerary.css
frontend/tests/editorial-itinerary.test.mjs
docs/frontend-ui/ETAPA5_ITINERARIO_EDITORIAL.md
docs/frontend-ui/VALIDACION_ETAPA5.json
docs/frontend-ui/MANIFEST_ETAPA5.json
docs/frontend-ui/aplicar_etapa5.py
```

## Contratos y decisiones de implementación

**Actividades:** se mantienen `groupsService.createActivity`, `updateActivity` y `deleteActivity` con los mismos endpoints y cuerpos admitidos. El fin opcional utiliza `fecha_fin`, que ya acepta el backend. La edición sin cambio de fecha/hora conserva los timestamps originales, incluido offset y precisión. Los horarios nuevos o modificados se construyen en **America/Mexico_City**, la zona usada por el backend al presentar el itinerario; se indica en el formulario. No se altera el manejo de horarios de vuelos de Etapa 3. Si no se informa un fin distinto, la interfaz no anuncia una duración inventada. Un fin en otra fecha se conserva al editar sin cambiar el horario; el control de nuevo fin del formulario corresponde al mismo día.

**Permisos:** edición de actividades propias, eliminación propia o administrativa y restricciones de propuestas vencidas se conservan. También se deshabilitan operaciones en días pasados, viaje finalizado/cerrado/archivado, itinerario bloqueado y falta de conexión de colaboración. La autorización definitiva sigue en el servidor.

**Finanzas y documentos:** permanecen `ExpenseDraftForm`, los contratos de creación/asociación de gastos, subidas y relaciones. No se rediseñan gastos, divisiones, saldos o liquidaciones. Si no se pudieron verificar los vínculos existentes, el guardado se bloquea para no borrarlos accidentalmente. Si la actividad se guardó y una operación posterior falló, se informa el resultado parcial y se impide repetir automáticamente el alta. Conserva el borrador para revisarlo; antes de continuar comprueba la actividad, propuesta, gasto/documento y relaciones en sus módulos. La prevención de dobles envíos del frontend no convierte al backend en una operación transaccional o idempotente.

**Colaboración:** sigue usando Socket.IO y la recarga existente. La agenda enlaza al `groupId` y `proposalId` reales de Decisiones. Una propuesta aprobada, una actividad confirmada y una compra/reserva simulada siguen siendo conceptos distintos. No se insertan resultados de proveedores automáticamente.

**Google:** una falla de Google no impide consultar agenda ni direcciones guardadas. Las nuevas búsquedas de lugares siguen dependiendo de la integración existente; no se introduce un proveedor alternativo ni se inventan resultados. `MapPlacesPage` y las herramientas de rutas/clima permanecen intactas.

## Validaciones

Entorno: Node 24.22.3, TypeScript 5.9.3, Vite 8.3.8 y Python 3.12.14.

| Comprobación | Resultado |
| --- | --- |
| Lint frontend | Correcto, sin errores ni advertencias ESLint |
| TypeScript (`tsc -b` y `tsc --noEmit`) | Correcto |
| Build frontend | Correcto |
| Pruebas Node | 47 correctas: 33 existentes y 14 nuevas |
| Integración Etapa 5, React + jsdom + HTTP/Socket.IO de prueba | 33 casos correctos |
| Regresión de Etapa 3 | 24 casos correctos |
| Regresión de Etapa 4 | 27 casos correctos |
| Aplicador y contenido del ZIP | 16 comprobaciones correctas de continuidad, integridad, conflictos, ramas, rollback y rechazo de reaplicación |

El informe `VALIDACION_ETAPA5.json` contiene el detalle. Las pruebas de integración usan fixtures temporales fuera de la aplicación y **no demuestran operaciones reales en Supabase ni proveedores**. Los fixtures no se incluyen en el ZIP. Las 14 nuevas pruebas unitarias sí se incluyen y se ejecutan con los comandos siguientes. Las guardas Git del aplicador se prueban con respuestas simuladas; lectura del ZIP, hashes, extracción y rollback se comprueban sobre un árbol temporal real, sin crear commits.

El build conserva la advertencia conocida de Vite sobre el bundle mayor a 500 kB. No se ejecutaron pruebas del backend porque no cambia.

**Limitaciones:** Chromium no pudo iniciarse (`socket() failed: Operation not permitted`). No hay capturas reales ni revisión visual de escritorio/tableta/móvil, contraste medido, lector de pantalla o foco/modalidad nativos. Las pruebas de teclado en jsdom verifican eventos y selección, no sustituyen una revisión con navegador. Tampoco se probaron Google, Supabase, publicación real de enlaces, correo, impresión PDF efectiva, gastos o documentos reales.

## 1. Preparar la rama en macOS

```bash
cd "/Users/yaelsangrador/Desktop/Sangrador/Ingenieria de Software/ITHERA-SWE"
git status --short
git branch --show-current
git log -1 --oneline
```

El estado debe quedar limpio. Guarda primero las correcciones y la entrega de Etapa 4 en su propia rama. Conserva el ZIP en Descargas, fuera del repositorio.

**A. Si Etapa 4 ya está fusionada en `develop`:**

```bash
git fetch origin
git switch develop
git pull --ff-only origin develop
git switch -c feat/editorial-itinerario
```

**B. Si Etapa 4 sigue en su rama local:** usa esta opción en lugar de A. Sustituye el nombre si tu rama es diferente.

```bash
git switch feat/editorial-decisiones
git status --short
git switch -c feat/editorial-itinerario
```

No ejecutes ambas opciones ni partas de un `develop` anterior a Etapa 4. No se realizaron commits, pushes, merges ni PR desde esta entrega.

## 2. Verificar y aplicar

Descarga `ITHERA_Editorial_Itinerario_Etapa5.zip` a `~/Downloads`. Usa el aplicador, sin extraer encima del repositorio con Finder o `unzip -o`.

```bash
ZIP_ETAPA5="$HOME/Downloads/ITHERA_Editorial_Itinerario_Etapa5.zip"
python3 --version
unzip -t "$ZIP_ETAPA5"
APLICADOR_ETAPA5=$(mktemp "${TMPDIR:-/tmp}/ithera-etapa5.XXXXXX")
unzip -p "$ZIP_ETAPA5" docs/frontend-ui/aplicar_etapa5.py > "$APLICADOR_ETAPA5" && python3 "$APLICADOR_ETAPA5" "$ZIP_ETAPA5" --check
```

Continúa solo si la comprobación termina correctamente. Verifica raíz, rama, árbol limpio, conflictos Git, ascendencia, hashes de continuidad, dependencias, colisiones con archivos nuevos, rutas permitidas e integridad. Rechaza `main`, `develop`, HEAD separado y una segunda aplicación. No modifica credenciales. Si falla una escritura, recupera los archivos escritos.

Si se detiene, revisa el archivo indicado y conserva tu trabajo. No fuerces la aplicación sobre archivos distintos.

```bash
python3 "$APLICADOR_ETAPA5" "$ZIP_ETAPA5" --apply
git status --short
git diff --stat
git diff --check
git diff -- frontend/src/pages/Itinerary/DashboardPage.tsx
git diff -- frontend/src/components/collaboration/CollaborationView.tsx
```

Los archivos nuevos se pueden revisar en el editor o en el diff preparado antes del commit.

## 3. Instalar y validar

No hay dependencias nuevas. Si no tienes una instalación correspondiente al lockfile:

```bash
npm --prefix frontend ci
```

Después:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
(cd frontend && npx tsc --noEmit)
node --test frontend/tests/*.test.mjs
git diff --check
```

## 4. Ejecutar localmente

Con tus `.env` locales y Supabase activo. Desde la raíz, terminal 1:

```bash
npm --prefix backend run dev
```

Terminal 2:

```bash
npm --prefix frontend run dev
```

Si al backend le faltan dependencias, ejecuta antes `npm --prefix backend ci`. Abre la URL que indique Vite.

## 5. Qué revisar en tu equipo

1. Desde Resumen, elige un día y abre Itinerario; confirma viaje, día y navegación de regreso. Prueba flechas, Home y End en la tira de días y Atrás del navegador.
2. Revisa días vacíos, propuestas, confirmadas, actividades sin horario/ubicación y coincidencias. Filtrar no debe borrar actividades ni convertir una coincidencia visual en una aprobación.
3. Crea una actividad de prueba desde un día vacío y confirma fecha/hora asignadas. Edita sin cambiar horario y después modificándolo; revisa inicio, fin y zona horaria.
4. Comprueba propietario, viajero y organizador; modos de solo lectura, días pasados y bloqueo. Elimina con confirmación y verifica recuperación ante un error.
5. Abre la propuesta vinculada en Decisiones: deben mantenerse voto, comentarios, estado y `groupId`, sin un segundo sistema de colaboración.
6. Abre lugares del día y el mapa bajo demanda. Sin coordenadas o con Google caído, consulta la información textual.
7. Revisa subgrupos: crear/editar horario, participantes, pertenencia, programación y acceso al chat. Verifica actualizaciones con dos sesiones.
8. Genera un enlace de consulta de prueba; revisa contenido público y vencimiento con el backend real. Cualquier persona con un enlace válido puede consultar lo que permita el servicio existente. Comprueba que no pueda editar.
9. Exporta confirmadas y guarda como PDF desde el diálogo de impresión de tu navegador.
10. Comprueba los vínculos de documentos y gastos existentes sin alterarlos. Si pruebas creación/asociación, usa datos de prueba y coordina con el equipo de Finanzas: la base es compartida y estas operaciones sí pueden persistir registros.
11. Desconecta la red con el formulario abierto, reintenta y cambia de viaje mientras hay solicitudes pendientes. No debe aparecer el borrador ni la respuesta del viaje anterior en el nuevo.
12. Revisa escritorio (~1440 px), tableta (~900 px), móvil (~390/360 px), nombres largos, foco, Tab/Shift+Tab, Escape, diálogos, etiquetas y ausencia de desbordamiento horizontal. Las acciones esenciales siguen disponibles en móvil.

## 6. Commit, push y PR (los ejecutas tú)

Después de validar:

```bash
git add frontend/src/components/itinerary frontend/tests/editorial-itinerary.test.mjs
git add frontend/src/pages/Itinerary/DashboardPage.tsx frontend/src/components/ui/DayView/DayView.tsx
git add frontend/src/components/ActivityProposalModal/ActivityProposalModal.tsx frontend/src/components/subgroups/SubgroupSchedulePanel.tsx
git add frontend/src/components/collaboration/CollaborationView.tsx
git add docs/frontend-ui/ETAPA5_ITINERARIO_EDITORIAL.md docs/frontend-ui/VALIDACION_ETAPA5.json docs/frontend-ui/MANIFEST_ETAPA5.json docs/frontend-ui/aplicar_etapa5.py
git diff --cached --check
git diff --cached --stat
git diff --cached
git commit -m "feat: itinerario y planificación Editorial Travel Atlas"
git push -u origin feat/editorial-itinerario
```

Si Etapa 4 ya está en `develop`:

```bash
gh pr create --base develop --head feat/editorial-itinerario --title "feat: itinerario editorial — Etapa 5" --web
```

Si Etapa 4 sigue pendiente y su rama ya existe en GitHub:

```bash
gh pr create --base feat/editorial-decisiones --head feat/editorial-itinerario --title "feat: itinerario editorial — Etapa 5" --web
```

Al fusionarse Etapa 4, cambia la base del PR a `develop` y revisa de nuevo el diff y CI. Sin GitHub CLI, crea el PR desde GitHub usando las mismas ramas. Espera los checks y la aprobación configurada.

Descripción sugerida:

> Rediseña Itinerario, navegación por días y gestión de actividades sobre la Etapa 4 completa. Conserva servicios, permisos, subgrupos, vínculos financieros, exportación y consulta compartida. Incluye verificación segura de compatibilidad. Validación: lint, TypeScript, build y 47 pruebas unitarias; integración con respuestas locales de prueba documentada. Pendiente validación visual y de servicios reales en el entorno del equipo.
