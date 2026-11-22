# ITHERA · Etapa 6: exploración editorial

## Entrega y continuidad

Implementación de Lugares, Mapas, Rutas y Clima sobre el estado completo de las Etapas 2, 3, 4 y 5. ZIP con archivos completos en sus rutas originales, no fragmentos. Sin eliminaciones, nuevas dependencias, cambios de backend, variables de entorno ni secretos.

- Commit de origen: `7abfe0156cd947b4a940b82b764afbca2ae21f72`.
- Continuidad aplicada sobre ese origen: Etapas 2 → 3 → 4 → 5 completas; las entregas estaban superpuestas localmente, sin crear un commit nuevo.
- Base inmediata: `ITHERA_Editorial_Itinerario_Etapa5.zip`.
- SHA256 de esa base: `9be969eef03c22812719a20a544b86d164ffc05a315c605c0b307732009a12ee`.
- `MANIFEST_ETAPA6.json` registra el SHA256 de entrada y salida de cada archivo modificado y las dependencias que deben conservar exactamente su contenido. También valida los manifiestos de las etapas anteriores.

Puede aplicarse desde la rama local que contiene la Etapa 5 o desde `develop` después de fusionarla, si coinciden los contenidos. **No sirve como base el `develop` anterior a la Etapa 5.** El aplicador valida contenidos y ancestro Git, no exige que el HEAD local tenga el mismo hash que el checkout de elaboración.

## Qué cambia

**Lugares.** Buscador de lugar y ubicación independiente; autocompletado con teclado; categorías de restaurantes, museos, parques y atracciones mediante búsquedas de texto existentes; filtros locales de categoría y valoración. Filas con fotografía real o fallback neutral, categoría, dirección, valoración y reseñas únicamente cuando se reciben. Ficha y detalle del lugar, horarios y enlaces recibidos. Se conserva el radio de exclusión de 80 km respecto al punto de búsqueda, sin descartar fichas que no tienen coordenadas. No se inventa una distancia para esas fichas.

**Mapa.** Dos áreas en escritorio; controles Lista/Mapa en tabletas y móviles. Selección sincronizada entre marcadores y resultados, centrado y limpieza de marcadores al cambiar los datos. Solo coordenadas numéricas válidas. Un fallo de Google Maps no impide buscar ni consultar fichas y direcciones; las propuestas siguen disponibles según permisos y conexión.

**Rutas.** Origen y destino editables, autocompletado y geocodificación existentes. Auto (`DRIVE`), caminar (`WALK`) y transporte público (`TRANSIT`), los tres medios de la pantalla anterior. Distancia, duración e indicaciones recibidas, trazado de la polilínea de backend y enlace contextual a Google Maps. La respuesta actual devuelve una ruta; no se incorporan puntos intermedios, alternativas, costos o tráfico ficticios. Al editar ubicaciones se descartan métricas y trazados anteriores.

**Clima.** Ubicación del viaje, origen o destino resuelto; condiciones actuales separadas del pronóstico diario por fecha real. Temperatura en °C, viento en km/h, humedad y probabilidad de lluvia en %. Los valores ausentes dicen «No informado», conservando los ceros reales. La probabilidad del bloque actual corresponde al día según el contrato del backend. La respuesta no incluye hora de observación ni pronóstico horario; no se inventan. Para fechas de viaje fuera del rango recibido aparece una explicación, sin extrapolar el tiempo.

**Itinerario.** Guardado real del lugar mediante `groupsService.createActivity`. El formulario consulta los días del itinerario, solicita una hora en intervalos de 30 minutos, comprueba horarios recibidos y fechas futuras, respeta lectura/bloqueo y evita solicitudes duplicadas durante el guardado. No aprueba automáticamente ni ejecuta reservas: se mantiene la decisión del backend. El retorno selecciona el día correspondiente. Las actividades con coordenadas ofrecen un acceso a Rutas y clima por su ID real y `groupId`.

**Errores y accesibilidad.** Cargas y skeletons, error de foto, servicios no disponibles, ausencia de datos, reintentos independientes, estado sin conexión, foco visible, combobox con flechas/Enter/Escape y controles sin funciones esenciales exclusivas del escritorio. Los resultados pendientes del viaje anterior se descartan al cambiar de viaje.

Se conservan autenticación, permisos, Socket.IO, propuestas/votos/comentarios, navegación Editorial, Guardados, búsqueda de vuelos y hoteles, comparador, checkout y Finanzas. No se agregó un guardado de favoritos de lugares: la pantalla anterior no tenía una operación de backend para ello; la incorporación existente es la propuesta real al itinerario.

## Archivos

Modificados completos:

| Ruta | Cambio |
|---|---|
| `frontend/src/pages/Search/MapPlacesPage.tsx` | Lugares, lista, ficha, filtros, mapa y propuestas |
| `frontend/src/pages/Search/RoutesTransportWeatherPage.tsx` | Rutas, acceso desde actividades y clima |
| `frontend/src/services/maps.ts` | Recuperación del cargador de Maps tras error/timeout; endpoints y DTO conservados |
| `frontend/src/components/itinerary/DayMap.tsx` | Acceso contextual a Rutas y clima |
| `frontend/src/pages/Itinerary/DashboardPage.tsx` | Interpretación de `day` recibido al volver desde Explorar |

Nuevos completos:

| Ruta (prefijo `frontend/src/pages/Search/exploration/`) | Responsabilidad |
|---|---|
| `GeoControls.tsx` | Combobox, avisos y fotografías |
| `InteractiveMap.tsx` | Marcadores, selección, polilínea y fallback de trazado |
| `PlaceProposal.tsx` | Calendario y propuesta real de lugar |
| `WeatherPanel.tsx` | Condiciones actuales y pronóstico |
| `useGeoContext.ts` | Punto de partida del viaje y resolución geográfica |
| `geo-data.ts` | Coordenadas, horarios, distancias, enlaces, polilínea y fechas |
| `exploration.css` | Estilo editorial y distribución responsive |

Además:

- `frontend/tests/editorial-exploration.test.mjs`: pruebas específicas sin agregar dependencias.
- `docs/frontend-ui/ETAPA6_EXPLORACION_EDITORIAL.md`: esta guía dentro del repositorio.
- `docs/frontend-ui/VALIDACION_ETAPA6.json`: resultados y límites de validación.
- `docs/frontend-ui/MANIFEST_ETAPA6.json`: compatibilidad e integridad por archivo.
- `docs/frontend-ui/aplicar_etapa6.py`: comprobador/aplicador Python estándar.

`SearchIntegratedShell.tsx` se reutiliza sin modificar: conserva la navegación de Etapa 3 y `groupId`. La ruta real del proyecto es `RoutesTransportWeatherPage.tsx`, no `RoutesWeatherPage.tsx`.

## Integraciones identificadas y configuración a revisar

Esta identificación proviene del código de backend y frontend, no de una prueba con tus claves. **No se verificaron credenciales, habilitación, cuotas, facturación ni respuestas reales de los proveedores.**

| Operación | Arquitectura y versión conservadas | Configuración que corresponde revisar |
|---|---|---|
| Mapa, marcadores y polilínea | Navegador, Maps JavaScript API | `VITE_GOOGLE_MAPS_BROWSER_KEY`; permitir Maps JavaScript API y los referentes HTTP concretos de localhost y del despliegue |
| Geocodificación | Backend → `GOOGLE_MAPS_BASE_URL` (predeterminado `https://maps.googleapis.com`), `/maps/api/geocode/json` | `GOOGLE_MAPS_API_KEY`, Geocoding API y restricciones apropiadas para el servidor |
| Autocompletado, búsqueda y detalle de lugares/fotos | Backend → **Places API (New)**; `GOOGLE_PLACES_BASE_URL` (predeterminado `https://places.googleapis.com`), `/v1/places:autocomplete`, `:searchText`, `:searchNearby`, `/v1/places/{id}` y fotos | Places API (New), facturación/cuotas; clave y field masks del backend. No sustituir por endpoints legacy |
| Cálculo de ruta | Backend → Routes API; `GOOGLE_ROUTES_BASE_URL` (predeterminado `https://routes.googleapis.com`), `/directions/v2:computeRoutes` | Routes API, clave y restricciones del servidor; conservar field masks de polilínea/indicaciones |
| Respaldo visual sin polilínea | Navegador, `DirectionsService` / `DirectionsRenderer` existentes | Solo si la configuración heredada del proyecto admite Directions Legacy. El resultado de backend sigue visible si ese respaldo falla |
| Clima | Backend → **WeatherAPI**, `/v1/forecast.json`, seis días solicitados y caché existente | `WEATHER_API_KEY` y `WEATHER_API_BASE_URL` existentes; disponibilidad y rango dependen de la respuesta/plan del proveedor |

No se encontró Open-Meteo en el flujo activo revisado; no se incorporó ni se reemplazó WeatherAPI. No se trasladaron llamadas de Places o Routes al navegador.

Las peticiones frontend permanecen en `/maps/geocoding/search`, `/maps/places/autocomplete`, `/maps/places/details/:id`, `/maps/places/text-search`, `/maps/routes/compute` y `/maps/weather`, con el token de sesión existente.

Para diagnosticar errores reales:

1. Revisar el error concreto en Network y logs de backend, sin compartir claves.
2. Para `RefererNotAllowedMapError`, revisar los referentes autorizados de la **clave del navegador**; para `ApiNotActivatedMapError`, la API de esa misma clave/proyecto.
3. Para 403/denegaciones de Places New, Routes o Geocoding, revisar las APIs habilitadas, facturación, cuotas y restricciones de la **clave del servidor**. Las restricciones de referentes HTTP de una clave web no sustituyen las restricciones apropiadas para el servidor.
4. Conservar claves separadas y permitir solo las APIs que utiliza cada una. No quitar todas las restricciones para solucionar un error.
5. Directions Legacy es un respaldo existente, no un requisito para dibujar la polilínea recibida de Routes. Google ya no permite activarlo en proyectos nuevos; no ampliar permisos ni reemplazar proveedores para forzar ese respaldo.

Fuentes oficiales de configuración:

- https://developers.google.com/maps/api-security-best-practices
- https://developers.google.com/maps/documentation/places/web-service/quick-reference
- https://developers.google.com/maps/documentation/routes/overview
- https://developers.google.com/maps/documentation/javascript/legacy/directions

## Validación realizada

- Lint, TypeScript con proyecto `tsconfig.app.json` y build de producción aprobados.
- **62 pruebas unitarias aprobadas:** las 47 anteriores y 15 nuevas de coordenadas, datos ausentes, radio, enlaces, fechas de pronóstico, horarios, decodificación de polilínea y recuperación del cargador de Maps.
- **35 casos de interacción de Etapa 6** sobre la aplicación React compilada, con HTTP/Socket.IO locales y proveedores/mapas simulados: búsqueda, filtros, fotos, selección de marcadores, autocompletado por teclado, errores/reintentos, guardado, readonly/bloqueo, cambios de viaje, tres modos de ruta, trazado y clima.
- Regresiones de etapas anteriores: se detallan en `VALIDACION_ETAPA6.json`.
- Aplicador: comprobación de hashes, base anterior/incompatible, colisiones, rutas inválidas, archivos alterados, ramas protegidas, cambios locales/conflictos, rollback y segunda aplicación, en un árbol temporal. Las respuestas de Git para estas guardas fueron simuladas; no se crearon commits.
- No hay nuevas dependencias ni cambios de `package.json` o lockfiles.
- El build conserva la advertencia de bundle mayor de 500 kB. La entrega no aborda code splitting.

**Límites:** Chromium no pudo iniciar por `socket() failed: Operation not permitted`. No se generaron capturas ni se comprobó layout, contraste medido, foco/modalidad nativos o desbordamientos en un navegador real. Se incluyeron reglas para escritorio, tabletas y móvil, pero esa inspección visual queda pendiente. Las pruebas DOM no equivalen a una prueba real de Google, WeatherAPI, Supabase o checkout.

## Integración en macOS

Requiere Git, Python 3 y las versiones de Node/npm utilizadas por el proyecto. Descarga el ZIP en `~/Downloads` y conserva tus `.env` actuales. No copies archivos manualmente sobre el proyecto ni extraigas el ZIP entero antes de comprobarlo.

### 1. Revisar el repositorio

```bash
cd "/Users/yaelsangrador/Desktop/Sangrador/Ingenieria de Software/ITHERA-SWE"
git status --short
git branch --show-current
git log -1 --oneline
```

El árbol debe estar limpio y sin conflictos. Si contiene cambios de validación local de Etapa 5, revísalos y consérvalos en tu rama antes de seguir. No uses `reset --hard` ni descartes cambios para satisfacer al aplicador.

### 2. Crear la rama desde la base correcta

Elige **una** opción.

A. Si la Etapa 5 ya está fusionada en `develop`:

```bash
git fetch origin
git switch develop
git pull --ff-only origin develop
git switch -c feat/editorial-exploracion
```

B. Si la Etapa 5 sigue en su rama local (ajusta su nombre si es distinto):

```bash
git switch feat/editorial-itinerario
git status --short
git switch -c feat/editorial-exploracion
```

El aplicador rechazará `main`, `develop`, HEAD separado, cambios locales, conflictos y contenidos que no coincidan con la continuidad esperada. No basta con renombrar la rama si el contenido es antiguo.

### 3. Verificar y aplicar

Extrae únicamente el aplicador fuera del repositorio y ejecuta desde la raíz del proyecto:

```bash
ITHERA_ETAPA6_ZIP="$HOME/Downloads/ITHERA_Editorial_Exploracion_Etapa6.zip"
ITHERA_ETAPA6_APLICADOR="$(mktemp -t ithera-etapa6)"
unzip -p "$ITHERA_ETAPA6_ZIP" docs/frontend-ui/aplicar_etapa6.py > "$ITHERA_ETAPA6_APLICADOR"
python3 "$ITHERA_ETAPA6_APLICADOR" "$ITHERA_ETAPA6_ZIP" --check
```

Si informa compatibilidad e integridad correctas:

```bash
python3 "$ITHERA_ETAPA6_APLICADOR" "$ITHERA_ETAPA6_ZIP" --apply
```

No cambia ramas ni referencias Git, no borra archivos y no toca `.env`. Verifica todos los hashes antes de la primera escritura; cada archivo se reemplaza de forma atómica y se restaura lo ya escrito si una escritura falla. El SHA256 por archivo comprueba consistencia, no es una firma digital del autor.

Si se detiene por incompatibilidad, conserva el mensaje y revisa la ruta indicada. No elimines el manifiesto ni fuerces la extracción: puede haber cambios propios o de validación de la Etapa 5 que deban reconciliarse.

### 4. Revisar cambios e instalar solo si hace falta

```bash
git status --short
git diff --stat
git diff --check
git diff -- frontend/src/pages/Search/MapPlacesPage.tsx frontend/src/pages/Search/RoutesTransportWeatherPage.tsx frontend/src/services/maps.ts frontend/src/components/itinerary/DayMap.tsx frontend/src/pages/Itinerary/DashboardPage.tsx
git ls-files --others --exclude-standard
```

Los archivos nuevos aún no aparecen en `git diff` hasta agregarlos a Git; revísalos también. Esta etapa no cambia dependencias. Si todavía no están instaladas en ese equipo:

```bash
npm --prefix frontend ci
npm --prefix backend ci
```

### 5. Validar localmente

```bash
npm --prefix frontend run lint
(cd frontend && npx tsc --noEmit -p tsconfig.app.json)
npm --prefix frontend run build
node --test frontend/tests/*.test.mjs
npm --prefix backend run build
npm --prefix backend test -- --runInBand
```

El backend no se modificó; sus comandos permiten verificar tu entorno y sus pruebas existentes, no fueron ejecutados como parte de esta entrega de frontend.

### 6. Levantar los dos procesos

Terminal 1:

```bash
cd "/Users/yaelsangrador/Desktop/Sangrador/Ingenieria de Software/ITHERA-SWE"
npm --prefix backend run dev
```

Terminal 2:

```bash
cd "/Users/yaelsangrador/Desktop/Sangrador/Ingenieria de Software/ITHERA-SWE"
npm --prefix frontend run dev
```

Abre la URL que muestre Vite. Para inspeccionar desde un móvil en la misma red puedes usar `npm --prefix frontend run dev -- --host`; conserva las restricciones de claves y configuración de red del proyecto.

### 7. Comprobación manual con tus servicios

- Abrir un viaje → Explorar → Lugares; buscar, filtrar y comprobar fotos/datos recibidos.
- Alternar Lista/Mapa; seleccionar un marcador y una fila; revisar mapa y textos con Google no disponible.
- Consultar detalle y proponer un lugar con día/hora reales; verificar la propuesta en Itinerario y Decisiones. Verificar como viajero y en viaje finalizado/bloqueado.
- Abrir una actividad con ubicación → Consultar ruta y clima; probar los tres medios disponibles y cambiar origen/destino.
- Revisar distancia, duración y trazado real; comprobar error/ausencia de ruta. La disponibilidad de transporte público depende de Google para esas ubicaciones.
- Revisar clima actual, fechas recibidas, unidades, falta de datos y fechas del viaje fuera del rango. Una ausencia de pronóstico lejano es esperada.
- Cambiar de viaje mientras una búsqueda carga; confirmar que no aparezcan resultados del anterior.
- Revisar a 1440, 1024/768 y 390/360 px; usar teclado en inputs/sugerencias, filtros y diálogos; comprobar que no haya desbordamientos y que el mapa siga siendo utilizable.
- Recorrer Vuelos, Hoteles, Guardados, comparador, votos/comentarios y checkout ya existentes. Distinguir operaciones simuladas según sus etiquetas actuales.

### 8. Commit, push y PR — ejecutar tú después de validar

```bash
git add frontend/src/pages/Search/MapPlacesPage.tsx frontend/src/pages/Search/RoutesTransportWeatherPage.tsx frontend/src/pages/Search/exploration frontend/src/services/maps.ts frontend/src/components/itinerary/DayMap.tsx frontend/src/pages/Itinerary/DashboardPage.tsx frontend/tests/editorial-exploration.test.mjs docs/frontend-ui/ETAPA6_EXPLORACION_EDITORIAL.md docs/frontend-ui/VALIDACION_ETAPA6.json docs/frontend-ui/MANIFEST_ETAPA6.json docs/frontend-ui/aplicar_etapa6.py
git diff --cached --check
git diff --cached --stat
git commit -m "feat: rediseñar exploración de lugares, rutas y clima"
git push -u origin feat/editorial-exploracion
```

Con GitHub CLI disponible y sesión propia:

```bash
gh pr create --base develop --head feat/editorial-exploracion --web
```

Si la Etapa 5 todavía no está fusionada, espera su integración antes de abrir el PR hacia `develop`, o abre temporalmente el PR contra la rama que la contiene y cambia la base después. Revisa Actions y las reglas de protección antes de fusionar. **Esta entrega no ejecutó commits, push, merges ni PRs.**

## Pendientes de comprobación local

1. Probar credenciales y proveedores reales; revisar las restricciones exactas que reporte Google si hay errores.
2. Inspección visual en escritorio, tableta y móvil; no hay capturas reales de este entorno.
3. Ejecutar las pruebas del backend en tu configuración local y validar la propuesta persistida en Supabase.
4. Si tus ajustes locales de Etapa 5 cambian archivos protegidos por hash, reconciliar primero esa diferencia; el ZIP se detendrá de forma intencional.
