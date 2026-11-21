# ITHERA · Dashboard Editorial Travel Atlas · Etapa 2

Entrega de implementación del frontend. Fecha: 20 de noviembre de 2026.

**Commit base exacto:** `7abfe0156cd947b4a940b82b764afbca2ae21f72`.
Se utilizó una copia completa e identificable de esa revisión. El ZIP contiene archivos completos, sin una carpeta contenedora adicional. No se crearon commits, ramas remotas ni PR, ni se enviaron cambios a GitHub.

## Cambios implementados

- Nuevo **Resumen**: portada de 260 px en escritorio, nombre/destino/fechas/integrantes reales, foto del grupo y fallback propio cuando falta o falla. No se introduce ninguna fotografía alternativa de otro destino.
- Navegación superior con logotipo original, Mis viajes, selector de viaje en escritorio, notificaciones, perfil y chat existentes. En móvil se conservan las acciones prioritarias y se cambia de viaje desde Mis viajes.
- Navegación contextual: Resumen, Itinerario, Explorar, Decisiones, Personas y Archivos. «Más» conserva comparar/reservar, mapas, finanzas, subgrupos y configuración de organizador. Las herramientas de edición se ocultan en viajes de solo lectura.
- Agenda cronológica con selector de día y hasta tres actividades; decisiones con hasta tres propuestas pendientes, comentarios y consulta de votación. En viajes finalizados, el resumen muestra acuerdos confirmados.
- Vista incremental de todas las decisiones con filtros. La votación y las operaciones de propuestas siguen en el itinerario existente; los comentarios y el resumen de votación reutilizan sus modales.
- La URL conserva `groupId` y `tab`, admite Atrás y enlaces existentes (`tab=inicio`, `pagar`, `boveda`). El acceso sin `tab` abre Resumen.
- Skeleton, vacíos separados, error y reintento, recuperación de datos colaborativos incompletos. No se muestran cero votos como sustituto de una respuesta fallida. Se limpian miembros y presupuesto de la carga anterior al cargar otro contexto.
- Estilos acotados a la variante editorial del dashboard. Las demás pantallas mantienen su layout. Instrument Serif y Plus Jakarta Sans se cargan desde Google Fonts, con fuentes de respaldo.
- Se mantienen backend, contratos, autenticación, Socket.IO, notificaciones y reglas de presupuesto. Proponer requiere conexión, viaje editable, módulo desbloqueado y un día no pasado. No se asignan presupuestos ni registros ficticios en producción.

## Archivos

Modificados:

1. `frontend/src/pages/Itinerary/DashboardPage.tsx`
2. `frontend/src/components/layout/AppLayout/AppLayout.tsx`
3. `frontend/src/components/layout/Navbar/Navbar.tsx`

Nuevos:

1. `frontend/src/components/trip/TripOverview.tsx`
2. `frontend/src/components/trip/TripNavigation.tsx`
3. `frontend/src/components/trip/editorial-data.ts`
4. `frontend/src/components/trip/editorial.css`
5. `frontend/tests/editorial-dashboard.test.mjs`
6. `docs/frontend-ui/ETAPA2_EDITORIAL_DASHBOARD.md` (esta guía)
7. `docs/frontend-ui/VALIDACION_DOM_ETAPA2.json`
8. `docs/frontend-ui/aplicar_etapa2.py`
9. `docs/frontend-ui/MANIFEST_ETAPA2.json`

**Archivos eliminados: ninguno.** El antiguo componente interno BottomNavbar se sustituye por la navegación contextual; sus herramientas siguen accesibles. No se modifican package.json ni los lockfiles; no hay dependencias nuevas de la aplicación.

## Validación realizada

| Comprobación | Resultado |
|---|---|
| `npm --prefix frontend run build` | Correcto: TypeScript y Vite |
| `npm --prefix frontend run lint` | Correcto: 0 errores, 0 advertencias |
| `node --test frontend/tests/editorial-dashboard.test.mjs` | 7 pruebas aprobadas |
| `git diff --check` | Correcto |
| Aplicador del ZIP en una copia limpia de la base | Comprobación, extracción y hashes correctos; rechaza cambios locales y segunda aplicación |
| Integración DOM de la aplicación real compilada, con jsdom | 16 casos aprobados; detalle en VALIDACION_DOM_ETAPA2.json |

La integración DOM se ejecutó con endpoints y un servidor Socket.IO locales de prueba. Se verificaron navegación/filtros/Atrás, cambio de grupo, apertura de modales, foco al cerrar menús con Escape, roles, lectura, bloqueo, fechas pasadas, vacíos, fallback de fotografía, reintentos, votos no disponibles, desconexión, skeleton y presupuesto obligatorio. El flujo normal no produjo errores de consola; el caso de error controlado registra el mensaje de carga esperado. Los fixtures y sus herramientas temporales no forman parte del frontend entregado. No se usaron credenciales reales ni se escribieron datos en Supabase.

El build conserva la advertencia previa por el bundle principal superior a 500 kB (~1.69 MB sin comprimir). No se ocultó la advertencia ni se cambió su límite. Entorno de validación: Node 24.22.3.

**No ejecutado:** renderizado en un navegador real, capturas, medición de desbordamiento/contraste en escritorio y móvil, ni pruebas contra Supabase o Google reales. Chromium no pudo iniciar por una restricción del entorno. jsdom verifica comportamiento y DOM, pero no calcula el layout ni sustituye una revisión visual. No se ejecutaron pruebas del backend, que no cambia en esta entrega.

## Integración en tu Mac

Necesitas Git, unzip, Python 3.9 o superior y la versión de Node/npm con la que ya compiló tu frontend. Descarga `ITHERA_Editorial_Dashboard_Etapa2.zip` en `~/Downloads`.

**Todos los siguientes comandos se ejecutan desde la raíz de ITHERA-SWE.** `npm --prefix frontend` ejecuta cada tarea dentro de frontend sin cambiar de carpeta. Conserva tus `.env` locales; el ZIP no los contiene ni los modifica.

### 1. Revisar el estado

```bash
cd "/Users/yaelsangrador/Desktop/Sangrador/Ingenieria de Software/ITHERA-SWE"
git status --short
```

Si aparecen cambios, revísalos y guárdalos antes de continuar. El aplicador exige un árbol de trabajo limpio; no ejecuta stash ni descarta archivos.

### 2. Actualizar develop y crear la rama

```bash
git fetch origin
git switch develop
git pull --ff-only origin develop
git switch -c feat/editorial-dashboard
git rev-parse HEAD
```

Si algún comando falla, detente y revisa su salida. No fuerces la actualización ni reutilices una rama existente sin revisar su estado.

### 3. Comprobar compatibilidad antes de extraer

```bash
ZIP="$HOME/Downloads/ITHERA_Editorial_Dashboard_Etapa2.zip"
APLICADOR="$(mktemp -t ithera-etapa2)"
unzip -p "$ZIP" docs/frontend-ui/aplicar_etapa2.py > "$APLICADOR"
python3 "$APLICADOR" "$ZIP" --check
```

Debe terminar con «Compatibilidad e integridad correctas». El aplicador comprueba:

- Repositorio y rama de trabajo adecuados, sin cambios locales.
- Que HEAD sea el commit base o un descendiente suyo.
- Que cada archivo que será sobrescrito coincida byte por byte con su versión base y que los archivos nuevos no existan.
- Integridad de los archivos declarados y rutas dentro del repositorio.

Si develop avanzó, solo se acepta automáticamente cuando esas comprobaciones pasan. Si hay diferencias en los archivos afectados, **no se aplica el ZIP**: será necesario adaptar la entrega a esa revisión. No omitas esta comprobación ni fuerces la extracción sobre cambios incompatibles.

### 4. Aplicar y revisar

```bash
python3 "$APLICADOR" "$ZIP" --apply
git status --short
git diff --stat
git diff
```

`--apply` vuelve a comprobar todo antes de extraer los archivos en sus rutas originales. El manifiesto no se incluye a sí mismo en el listado de hashes para evitar una referencia circular. Los archivos nuevos se revisarán también con `git diff --cached` en el paso 7.

### 5. Instalar y validar

```bash
npm --prefix frontend ci
npm --prefix frontend run lint
npm --prefix frontend run build
node --test frontend/tests/editorial-dashboard.test.mjs
```

`npm ci` es opcional si ya instalaste exactamente el lockfile actual y tu node_modules está en buen estado. No agregues dependencias para esta entrega. El comando de pruebas usa Node y TypeScript ya incluido en el proyecto; no hay un script `npm test` en el frontend original.

### 6. Probar localmente

En una terminal, desde la raíz:

```bash
npm --prefix backend run dev
```

En otra terminal, desde la misma raíz:

```bash
npm --prefix frontend run dev
```

Entra al sitio, inicia sesión y abre un viaje desde Mis viajes. Comprueba primero con tus datos reales:

- Resumen, selector de día, itinerario, decisiones y comentarios.
- Cambio de viaje, recarga y botón Atrás sin perder el grupo.
- Finanzas desde Más y validación del presupuesto obligatorio.
- Viaje de solo lectura y permisos de viajero/organizador.
- Escritorio y móvil: foto/fallback, textos largos, scroll, menús, foco de teclado y ausencia de desbordamiento horizontal.

Detén los procesos con Ctrl+C cuando termines. Las credenciales de Google y sus restricciones de dominio siguen dependiendo de tu configuración existente.

### 7. Revisar los archivos completos y crear el commit

```bash
git add frontend/src/pages/Itinerary/DashboardPage.tsx
git add frontend/src/components/layout/AppLayout/AppLayout.tsx
git add frontend/src/components/layout/Navbar/Navbar.tsx
git add frontend/src/components/trip
git add frontend/tests/editorial-dashboard.test.mjs
git add docs/frontend-ui
git diff --cached --stat
git diff --cached
```

Después de revisar la salida y de que las validaciones pasen:

```bash
git commit -m "feat: implementar resumen editorial de viajes"
git push -u origin feat/editorial-dashboard
```

Luego abre el PR de `feat/editorial-dashboard` hacia **develop**. Revisa sus checks antes de aprobarlo. Esta entrega no modifica main ni las protecciones.

## Pendientes de la siguiente etapa

- Revisión visual real en tu entorno antes de aprobar el PR; todavía no se pueden dar por validados responsive, contraste o ausencia de desbordamientos.
- El itinerario completo, búsquedas, comparador, finanzas, archivos y modales conservan su presentación anterior; se adaptarán gradualmente. Personas abre el panel de integrantes existente.
- La vista Decisiones permite consultar y entrar al itinerario para votar; no se reemplaza el flujo de votación actual.
- Las fuentes requieren conexión para su descarga inicial. El tamaño del bundle permanece pendiente de una optimización separada.
