# ITHERA · Etapa 3 · Búsqueda editorial de vuelos y hoteles

Entrega de implementación · 21 de noviembre de 2026.

## Base de continuidad

Se trabajó sobre la **Etapa 2 completa**, verificada mediante sus hashes, y no sobre el dashboard anterior.

- Commit Git original: `7abfe0156cd947b4a940b82b764afbca2ae21f72`.
- Continuidad añadida: `ITHERA_Editorial_Dashboard_Etapa2.zip`.
- SHA256 de ese ZIP: `7ec4a46548d6ec8ec54c5ee0f6de0fa5167c6f2056c9b9ecf097139e74a73f85`.

Esta es la revisión exacta disponible: commit original más los archivos entregados en Etapa 2. No se obtuvo ni se presupone el SHA de tu posterior merge en GitHub. El aplicador comprueba la continuidad por contenido, además de la historia Git. Se detiene si los archivos afectados o sus dependencias difieren de esta base.

## Cambios implementados

- Vuelos en filas con ida/regreso, horarios informados, duración, escalas, aerolínea, precio/moneda, datos disponibles de tarifa/equipaje y etiqueta de modo prueba.
- Hoteles con fotografías del servicio, skeleton de fotografía y fallback, ubicación, valoración real con fuente, características informadas y detalle de habitaciones/tarifas en diálogo.
- Formularios compactos, opciones de pasajeros/cabina y huéspedes/habitaciones; se conservan las ventanas de fechas, máximo de 50 personas y restricciones originales de habitaciones e infantes.
- Edades reales de menores para hoteles: se elimina el envío implícito de 8 años para todos. No se cambia el contrato `childrenAges` existente.
- Filtros locales funcionales por escalas, aerolínea, moneda/precio y valoración de hotel; orden por precio agrupado por moneda. Los filtros no generan otra consulta externa ni convierten divisas.
- Guardado mediante los servicios actuales de propuestas e historial. Hotel conserva `prebook`; sus fallos se distinguen de una reserva confirmada. Una propuesta guardada permite abrir el comparador existente. No hay una segunda selección ficticia que sustituya el guardado.
- Se informa por separado un fallo de propuesta, uno de historial después de guardar o uno de pre-reserva. El guardado de propuestas no cobra ni confirma compras; el checkout existente continúa siendo simulado.
- Navegación editorial de búsquedas y accesos separados de Vuelos/Hoteles en Explorar; se mantienen Lugares, Rutas y clima, Guardados, Personas, Archivos y las demás herramientas existentes. El shell compartido adopta la navegación editorial; los contenidos de lugares, mapas e historial no se rediseñan.
- `groupId` se conserva en URL y navegación, se verifica con el backend antes de permitir propuestas y tiene prioridad sobre el grupo almacenado. Cambiar de pestaña durante una búsqueda no inserta respuestas atrasadas en otra vista. Las ofertas incompletas no se guardan con precios o fechas inventados.
- Al editar el destino de un hotel se dejan de enviar las coordenadas de otra ciudad. El catálogo de aeropuertos puede fallar sin impedir capturar un código IATA manual.

No se modifican backend, endpoints, checkout, comparador, votos, comentarios, dependencias ni lockfiles. La verificación de presupuesto del dashboard se conserva. Los estilos de búsqueda tienen clases propias, con variantes para escritorio, tabletas y móvil.

## Archivos entregados

**Modificados (3):**

- `frontend/src/pages/Search/FlightHotelSearchPage.tsx`
- `frontend/src/pages/Search/SearchIntegratedShell.tsx`
- `frontend/src/pages/Itinerary/DashboardPage.tsx`

**Nuevos de implementación y pruebas (10):**

- `frontend/src/components/trip/ExploreHub.tsx`
- `frontend/src/pages/Search/AirportSearchInput.tsx`
- `frontend/src/pages/Search/SearchForms.tsx`
- `frontend/src/pages/Search/SearchFilters.tsx`
- `frontend/src/pages/Search/SearchResults.tsx`
- `frontend/src/pages/Search/search-data.ts`
- `frontend/src/pages/Search/search-types.ts`
- `frontend/src/pages/Search/search-editorial.css`
- `frontend/src/pages/Search/useSearchTrip.ts`
- `frontend/tests/editorial-search.test.mjs`

**Documentación y aplicación (4 nuevos):** esta guía, `MANIFEST_ETAPA3.json`, `VALIDACION_DOM_ETAPA3.json` y `aplicar_etapa3.py`, dentro de `docs/frontend-ui/`.

**Archivos eliminados: ninguno.** Son 17 archivos completos, sin carpeta contenedora extra. La entrega no vuelve a incluir archivos de Etapa 2 que permanecen intactos.

## Resultados de validación

| Comprobación | Resultado |
|---|---|
| Build del frontend, incluido TypeScript | Correcto |
| Lint | 0 errores y 0 advertencias |
| Pruebas Node | 20 aprobadas: 13 nuevas y 7 de Etapa 2 |
| Integración de la aplicación compilada con jsdom | 24 casos aprobados; detalle en `VALIDACION_DOM_ETAPA3.json` |
| Revisión de whitespace con `git diff --check` | Correcta |
| Aplicador del ZIP | Integridad, continuidad de Etapa 2, colisiones y extracción correctas; rechaza la versión anterior |

Las comprobaciones DOM utilizan HTTP y Socket.IO locales con fixtures: contratos de búsqueda/guardado, filtros, errores/reintentos, historial, prebook, teclado del autocomplete, estados de carga/vacíos, desconexión, permisos, respuestas atrasadas, contexto durante cargas y regreso al Resumen. El flujo normal no produjo errores de consola. El caso de fallo de historial registra deliberadamente el error controlado correspondiente. Los fixtures no forman parte de la aplicación entregada.

El aplicador se ensayó con fixtures de archivos; las guardas de rama protegida y árbol sucio se probaron con respuestas Git simuladas. Se comprobó que conserva los archivos intactos de Etapa 2 y un `.env` de prueba. No se crearon commits para validar la entrega.

El build conserva la advertencia conocida por el tamaño del bundle principal (~1.685 MB sin comprimir); no se oculta ni se aumenta su límite. Entorno de validación: Node 24.22.3.

**Límites de lo probado:** no se usaron credenciales reales, ni se probaron Duffel, LiteAPI, Google, Supabase o pagos externos. No se modificaron datos reales. Chromium no pudo arrancar por la restricción de sockets del entorno: no hay capturas reales, medición visual de responsive/desbordamientos/contraste ni prueba de la modalidad nativa del diálogo. jsdom no sustituye esas comprobaciones. No se ejecutaron pruebas del backend, que permanece intacto.

## Integración desde tu Mac

Necesitas Git, unzip, Python 3.9 o superior y la instalación de Node/npm con la que ya ejecutaste el proyecto. Descarga `ITHERA_Editorial_Busqueda_Etapa3.zip` en `~/Downloads`. Los comandos siguientes se ejecutan **desde la raíz del repositorio**; `npm --prefix` ejecuta las tareas dentro de la carpeta indicada.

### 1. Revisar el estado

```bash
cd "/Users/yaelsangrador/Desktop/Sangrador/Ingenieria de Software/ITHERA-SWE"
git status --short
```

Si aparecen cambios locales, revísalos y guárdalos antes de continuar. La Etapa 2 debe estar aplicada y registrada en Git. No se hará stash ni se descartará ningún archivo automáticamente.

### 2. Preparar la rama sobre Etapa 2

**Si Etapa 2 ya se fusionó a develop**, ejecuta:

```bash
git fetch origin
git switch develop
git pull --ff-only origin develop
git switch -c feat/editorial-busqueda
```

**Si Etapa 2 sigue únicamente en tu rama local**, utiliza este bloque en lugar del anterior:

```bash
git switch feat/editorial-dashboard
git status --short
git switch -c feat/editorial-busqueda
```

Ajusta el nombre de esa rama si la llamaste distinto. Si algún comando falla, detente y revisa su salida; no fuerces la actualización. No ejecutes ambos bloques.

### 3. Verificar la compatibilidad antes de aplicar

```bash
git rev-parse HEAD
ZIP="$HOME/Downloads/ITHERA_Editorial_Busqueda_Etapa3.zip"
APLICADOR="$(mktemp "${TMPDIR:-/tmp}/ithera-etapa3.XXXXXX")"
unzip -p "$ZIP" docs/frontend-ui/aplicar_etapa3.py > "$APLICADOR" &&
python3 "$APLICADOR" "$ZIP" --check
```

Debe terminar con **«Compatibilidad e integridad correctas»**. Se comprueban:

- Rama de trabajo distinta de main/develop y árbol limpio.
- Historia descendiente del commit conocido.
- Archivos de continuidad de Etapa 2 y dependencias relevantes por SHA256.
- Versión exacta de cada archivo que será sobrescrito y ausencia de colisiones con archivos nuevos.
- Integridad y rutas de todos los archivos del ZIP.

El número de commit local puede ser posterior al original, por ejemplo el merge de Etapa 2. Lo decisivo es que los contenidos comprobados coincidan. Si no coinciden, **no extraigas el ZIP manualmente para saltarte la comprobación**: hay que adaptar la entrega a esa revisión. El verificador no necesita tus `.env` ni sus valores.

### 4. Aplicar y revisar el diff

```bash
python3 "$APLICADOR" "$ZIP" --apply
git status --short
git diff --stat
git diff
```

`--apply` repite las comprobaciones antes de escribir en las rutas originales. No modifica `.env`, historial de Git, ramas o credenciales. El manifiesto no incluye su propio hash para evitar una referencia circular. Los archivos nuevos se revisan también al preparar el commit, en el paso 7.

### 5. Validar frontend

```bash
npm --prefix frontend ci
npm --prefix frontend run lint
npm --prefix frontend run build
node --test frontend/tests/*.test.mjs
```

No hay dependencias nuevas. Puedes omitir `npm ci` si tu instalación ya corresponde exactamente al lockfile actual. El frontend original no tiene script `npm test`; las pruebas enfocadas usan Node y TypeScript ya incluidos.

### 6. Probar localmente

En una terminal, desde la raíz:

```bash
npm --prefix backend run dev
```

En otra terminal, desde la misma raíz:

```bash
npm --prefix frontend run dev
```

Inicia sesión y abre **un viaje futuro y editable**. En Explorar elige Vuelos o Hoteles. Comprueba búsquedas reales cuando tus credenciales estén listas, filtros, propuestas, historial, comparador y regreso al viaje. Revisa en móvil y escritorio los formularios, fotos/fallback, filtros, teclado, foco y ausencia de scroll horizontal del documento. Confirma que el checkout siga identificado como simulado.

Puedes revisar el diseño aunque Google esté temporalmente sin servicio. Si el catálogo de aeropuertos falla, captura IATA manualmente. Los resultados de hoteles siguen dependiendo de LiteAPI y de la resolución de destino que requiera la integración existente; un fallo del proveedor se muestra como error, nunca como resultados inventados.

### 7. Preparar los archivos completos y revisar

```bash
git add -- frontend/src/pages/Itinerary/DashboardPage.tsx \
  frontend/src/pages/Search/FlightHotelSearchPage.tsx \
  frontend/src/pages/Search/SearchIntegratedShell.tsx \
  frontend/src/pages/Search/AirportSearchInput.tsx \
  frontend/src/pages/Search/SearchForms.tsx \
  frontend/src/pages/Search/SearchFilters.tsx \
  frontend/src/pages/Search/SearchResults.tsx \
  frontend/src/pages/Search/search-data.ts \
  frontend/src/pages/Search/search-types.ts \
  frontend/src/pages/Search/search-editorial.css \
  frontend/src/pages/Search/useSearchTrip.ts \
  frontend/src/components/trip/ExploreHub.tsx \
  frontend/tests/editorial-search.test.mjs \
  docs/frontend-ui/ETAPA3_BUSQUEDA_EDITORIAL.md \
  docs/frontend-ui/MANIFEST_ETAPA3.json \
  docs/frontend-ui/VALIDACION_DOM_ETAPA3.json \
  docs/frontend-ui/aplicar_etapa3.py
git diff --cached --stat
git diff --cached
```

### 8. Crear el commit y subir la rama

Solo después de revisar los cambios y validar:

```bash
git commit -m "feat: redisenar busqueda editorial de vuelos y hoteles"
git push -u origin feat/editorial-busqueda
```

Abre después un PR hacia develop. Si Etapa 2 aún no se fusionó, coordina primero ese merge o usa temporalmente su rama como base del PR para mostrar únicamente el cambio de Etapa 3. No se ejecutaron commits, push ni PR desde esta entrega.

## Pendientes

- Validación visual real en tus navegadores y dispositivos antes de aprobar el PR.
- Prueba de proveedores con tus credenciales, incluido el comportamiento real de tarifas y prebook.
- Comparador, votación y checkout conservan su implementación actual; su rediseño corresponde a la siguiente etapa.
- Las opciones de habitaciones del diálogo son informativas. La propuesta utiliza la oferta principal; no se añade un flujo nuevo para seleccionar otra tarifa.
- Las alternativas guardadas son propuestas persistidas mediante los endpoints actuales. Los indicadores de esta pantalla describen la búsqueda actual; al volver a consultar al proveedor no se reconstruye un contador global de propuestas guardadas.
