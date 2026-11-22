# ITHERA · Etapa 7: Mis viajes, creación e invitaciones

## Base exacta y compatibilidad

Implementación sobre la **Etapa 6 completa**, conservando las Etapas 2 a 6. No se utilizó un `develop` antiguo.

- Commit de origen: `7abfe0156cd947b4a940b82b764afbca2ae21f72`.
- Estado base: ese commit más las entregas completas de las Etapas 2 → 3 → 4 → 5 → 6, superpuestas localmente sin crear nuevos commits.
- Entrega inmediata de continuidad: `ITHERA_Editorial_Exploracion_Etapa6.zip`.
- SHA256 de esa entrega: `1ce0ddc3e4291fcb12d0d52615b5eb483044374fb46342fde24c24ac36bb3422`.
- Se verificaron sus 83 hashes de archivos y dependencias antes de empezar esta implementación.

El manifiesto de Etapa 7 registra los contenidos exactos de entrada y salida y las dependencias de las etapas anteriores. Puede aplicarse sobre la rama local de Etapa 6 o después de fusionarla a `develop`, si los contenidos coinciden y se conserva el ancestro Git conocido. El HEAD local no necesita tener el mismo hash del checkout de elaboración.

**Si hiciste correcciones locales durante la validación de Etapa 6, no las sobrescribas.** El aplicador se detendrá si afectan archivos o dependencias esperados. Hay que reconciliar esa diferencia antes de aplicar la entrega.

## Implementación

### Mis viajes

- Galería editorial de viajes reales, con fotografía recibida o fallback neutral en los colores de ITHERA. Las imágenes rotas también muestran fallback. No se agregan fotografías externas de sustitución ni peticiones adicionales por cada tarjeta.
- Secciones En curso, Próximos viajes, Por organizar y Viajes anteriores. Se derivan de fechas civiles y estados recibidos, usando `America/Mexico_City` para determinar el día actual. No cambian estados persistidos ni sustituyen el estado recibido por uno inventado.
- Fechas ausentes/inválidas no se presentan como viajes en curso. Cerrados, finalizados y archivados conservan acceso para consulta. La política de cierre automático del backend permanece intacta.
- Nombre, destino, estado, rol y cantidad de integrantes solo cuando existe el dato correspondiente. Se eliminan duplicados del historial por ID real.
- Búsqueda local por nombre/destino, filtros y orden por fecha/nombre. Los filtros no disparan consultas de servidor.
- Se conserva `/my-trips#viajes-pasados` como entrada al historial.
- Carga inicial, estado vacío editorial, error con reintento, conservación de resultados ante desconexión y actualización por los eventos Socket.IO ya existentes. Las respuestas antiguas del historial no reemplazan una actualización más reciente.
- Al abrir una tarjeta se guarda el ID y rol recibidos y se entra al Resumen mediante `/dashboard?groupId=...&tab=resumen`. El dashboard vuelve a verificar el viaje con los servicios existentes.

### Crear viaje

Un formulario único, con secciones de información, fechas, configuración e invitaciones opcionales. Se mantienen los campos y límites existentes:

| Campo | Validación conservada |
|---|---|
| Nombre | Obligatorio; hasta 60 caracteres |
| Destino | Obligatorio; sugerencia de Google o texto escrito, como en el flujo anterior |
| Descripción | Opcional; hasta 300 caracteres |
| Salida y regreso | Fechas válidas; salida desde hoy, regreso posterior; máximo 60 días de diferencia |
| Capacidad | De 1 a 50 personas, incluyendo al organizador; valor inicial existente: 10 |
| Presupuesto | Obligatorio y positivo; hasta 9,999,999,999.99 MXN; dos decimales, sin separadores de miles |
| Acceso por código | Desactivado por defecto: requiere aprobación; activado: ingreso directo con código |
| Invitaciones | Opcionales; correos válidos, sin duplicados y hasta capacidad menos organizador |

Los selectores de fecha son controles nativos con etiquetas, mínimos y máximos. Las fechas viajan como `YYYY-MM-DD`, sin conversiones a medianoche UTC que cambien el día mostrado. La validación usa el mismo día de México que las etapas recientes.

La selección de destino reutiliza el combobox accesible de Etapa 6 y los métodos `autocompletePlaces` y `getPlaceDetails`. Editar el destino borra sus coordenadas e ID anteriores. Si Google no responde, se conserva el texto; la validación/resolución real del backend sigue siendo la autoridad y puede devolver un error. No se afirma que una creación real con Google caído haya sido probada.

El presupuesto no se elimina ni se genera automáticamente. Su captura no realiza cargos ni amplía el módulo financiero.

Se conserva el POST `/groups` y su payload. El envío tiene protección contra doble clic. Después de crear se muestra el identificador real, el código recibido y la entrada al Resumen; copiar el código comunica éxito solo si la operación del navegador se confirma.

Las invitaciones por correo usan el servicio existente, después de crear el viaje. Se distinguen los estados reales `created`, `already_invited` y `existing_member`; no se cuenta toda la respuesta como invitaciones nuevas ni se afirma que el correo haya sido entregado al destinatario. Si este paso falla, **el viaje sigue confirmado** y el reintento llama únicamente a sus invitaciones, sin repetir la creación. Las invitaciones incluidas en un envío confirmado de creación continúan si se cambia de pantalla, sin reemplazar el contexto de otro viaje.

Reducir la capacidad ajusta la lista de correos y muestra un aviso; una capacidad de una persona conserva la creación sin invitaciones. Los errores por nombre duplicado, fechas ocupadas o permisos se siguen mostrando desde el servidor.

### Unirse a un viaje

- `/join-group` acepta captura manual del código y los enlaces existentes con `code` y `token`.
- Consulta mediante `getInvitePreview`; no consulta los detalles protegidos del grupo antes de tener autorización.
- Se muestran únicamente datos del preview público que el backend ya proporciona. No se muestra el correo personal invitado a usuarios sin sesión.
- Se separan invitación disponible, capacidad alcanzada, invitación no disponible, error de conexión/servicio, solicitud pendiente y acceso concedido.
- Una invitación personal conserva el token exacto en preview, aceptación y retorno desde login. No se transforma automáticamente en una invitación por código si falla el token.
- Cambiar deliberadamente el código elimina el token personal asociado al código anterior y conserva los otros parámetros de URL.
- La API agrupa invitaciones usadas/revocadas/no válidas en `EMAIL_INVITE_INVALID`; la interfaz conserva su mensaje sin fingir que distingue cada causa o que se trata necesariamente de expiración.
- `requiresApproval` o el error real `JOIN_REQUEST_PENDING` muestran solicitud pendiente. No se guarda membresía ni se permite entrar en ese estado.
- El acceso se confirma solo tras `joinGroup`; se conserva el ID devuelto y se ofrece entrar al Resumen editorial. Es una confirmación explícita con botón, en lugar del salto inmediato al panel antiguo.
- Un usuario sin sesión va al login conservando el enlace completo en `redirect` y en el mecanismo de sesión existente. No se ejecutan incorporaciones anónimas.
- Cambiar de enlace durante un preview pendiente descarta la respuesta anterior. No hay aceptación automática por abrir un enlace.

## Archivos completos incluidos

Modificados:

1. `frontend/src/pages/MyTrips/MyTripsPage.tsx`
2. `frontend/src/pages/CreateGroup/CreateGroupPage.tsx`
3. `frontend/src/pages/JoinGroup/JoinGroupPage.tsx`

Nuevos:

1. `frontend/src/components/trips/TripAccessLayout.tsx` — reutiliza AppLayout y Navbar Editorial, avisos, campos y ornamento neutral.
2. `frontend/src/components/trips/TripCover.tsx` — fotografía real, carga y fallback.
3. `frontend/src/components/trips/TripDestination.tsx` — destino con los servicios y combobox existentes.
4. `frontend/src/components/trips/trip-data.ts` — fechas civiles, clasificación local y validaciones.
5. `frontend/src/components/trips/trip-access.css` — composiciones editoriales y reglas responsive.
6. `frontend/tests/editorial-trips.test.mjs` — pruebas focalizadas, sin dependencias nuevas.
7. `docs/frontend-ui/ETAPA7_MIS_VIAJES_EDITORIAL.md` — esta guía dentro del repositorio.
8. `docs/frontend-ui/VALIDACION_ETAPA7.json` — resultados y limitaciones.
9. `docs/frontend-ui/MANIFEST_ETAPA7.json` — compatibilidad e integridad.
10. `docs/frontend-ui/aplicar_etapa7.py` — aplicador seguro Python estándar.

Las rutas reales son las indicadas, sin una carpeta `pages/Groups`. Los índices de exportación y rutas de `App.tsx` se conservan. El componente antiguo `DestinationSearch.tsx` permanece intacto para sus otros consumidores; Crear viaje reutiliza el combobox de Etapa 6 mediante un adaptador específico.

## Funcionalidad preservada

No se modifican AppLayout, Navbar, AuthProvider, ProtectedRoute, Login, roles, permisos, Socket.IO, endpoints, DTO, backend, base de datos, dependencias, `.env`, credenciales ni configuración personal. Resumen, Itinerario, Explorar, Decisiones, comparador, checkout, archivos y Finanzas conservan sus archivos completos. Las reglas de invitaciones y presupuesto siguen en el backend.

Servicios reutilizados: `getMyHistory`, `createGroup`, `getInvitePreview`, `joinGroup`, `sendInvitations`, `saveCurrentGroup`, `autocompletePlaces` y `getPlaceDetails`. No se agregan APIs, claves ni proveedores.

## Validaciones y límites

El informe `VALIDACION_ETAPA7.json` contiene los resultados por caso y el alcance exacto.

- Lint, TypeScript (`tsconfig.app.json`) y build de producción aprobados.
- **76 pruebas unitarias**: 62 previas y 14 nuevas. Incluyen fechas civiles, cambio de fecha en México respecto de UTC, clasificación por fecha/estado, datos ausentes, deduplicación, orden, presupuesto positivo, límites de fechas/capacidad y correo.
- Las 14 pruebas de esta etapa también se ejecutaron con `TZ=Pacific/Auckland` para comprobar independencia de la zona del equipo.
- **35 casos de interacción de Etapa 7**, con aplicación React compilada y respuestas controladas: galería, historial, fotos, errores/reintentos, contexto real, presupuesto, creación sin duplicados, destino, invitaciones y fallo parcial, login/retorno, capacidad, token, solicitudes pendientes y respuestas atrasadas.
- **119 regresiones de las Etapas 2 a 6**: 24 casos de búsqueda/navegación, 27 de decisiones/checkout, 33 de itinerario y 35 de exploración geográfica. Incluyen la regresión del Resumen de Etapa 2.
- Aplicador probado en un árbol temporal: hashes, base incompatible, colisiones, integridad, rutas inválidas, ramas protegidas, cambios/conflictos Git, rollback y doble aplicación. Las guardas Git usan respuestas simuladas; no se crearon commits de prueba.
- Sin dependencias nuevas. El build conserva la advertencia de bundle mayor a 500 kB.

**No son operaciones reales:** los casos DOM usan HTTP/Socket.IO, Google y sesiones de prueba controlados; no crearon viajes reales en Supabase ni enviaron correos reales. No se probó Google con tus credenciales ni la entrega de emails. Las pruebas DOM se ejecutaron con herramientas aisladas del entorno; la entrega incluye las pruebas unitarias reproducibles y el informe, sin agregar esas herramientas como dependencias del producto.

**Revisión visual pendiente:** Chromium no pudo iniciar por `socket() failed: Operation not permitted`. No hay capturas reales ni validación de layout, desbordamientos, modalidad/foco nativos, contraste medido o recorte fotográfico en navegador. Se implementaron reglas para escritorio, tableta y móvil, pero deben inspeccionarse localmente.

Las mutaciones no se reintentan automáticamente. Si se pierde la conexión justo después de crear o aceptar, puede no recibirse la confirmación aunque el servidor haya procesado la solicitud; la interfaz indica revisar Mis viajes antes de repetirla. No se implementó idempotencia nueva en el backend.

## Integración en macOS

Descarga el ZIP en `~/Downloads`. Requiere Git, Python 3 y las versiones de Node/npm que utiliza tu proyecto. Conserva tus `.env` actuales.

### 1. Revisar estado y base

```bash
cd "/Users/yaelsangrador/Desktop/Sangrador/Ingenieria de Software/ITHERA-SWE"
git status --short
git branch --show-current
git log -1 --oneline
```

El árbol debe estar limpio y sin conflictos. Si estás validando la Etapa 6, termina de revisar y conservar sus cambios en tu rama antes de integrar esta entrega. No descartes cambios para satisfacer el aplicador.

### 2. Crear una rama desde la Etapa 6

Elige una sola alternativa.

A. Si Etapa 6 ya se fusionó en `develop`:

```bash
git fetch origin
git switch develop
git pull --ff-only origin develop
git switch -c feat/editorial-mis-viajes
```

B. Si Etapa 6 está en su rama local, ajustando su nombre si es distinto:

```bash
git switch feat/editorial-exploracion
git status --short
git switch -c feat/editorial-mis-viajes
```

No prepares esta rama desde un `develop` anterior a la Etapa 6. El aplicador rechazará contenidos incompatibles incluso si el nombre de la rama parece correcto.

### 3. Comprobar el ZIP antes de aplicar

Desde la raíz del repositorio, extrae únicamente el aplicador fuera del proyecto:

```bash
ITHERA_ETAPA7_ZIP="$HOME/Downloads/ITHERA_Editorial_MisViajes_Etapa7.zip"
ITHERA_ETAPA7_APLICADOR="$(mktemp -t ithera-etapa7)"
unzip -p "$ITHERA_ETAPA7_ZIP" docs/frontend-ui/aplicar_etapa7.py > "$ITHERA_ETAPA7_APLICADOR"
python3 "$ITHERA_ETAPA7_APLICADOR" "$ITHERA_ETAPA7_ZIP" --check
```

Si compatibilidad e integridad son correctas:

```bash
python3 "$ITHERA_ETAPA7_APLICADOR" "$ITHERA_ETAPA7_ZIP" --apply
```

El script verifica todos los contenidos antes de escribir, comprueba conflictos y cambios locales, rechaza `main`, `develop` y HEAD separado, no toca `.env` ni borra archivos y evita una segunda aplicación. Reemplaza cada archivo de forma atómica y restaura lo ya escrito si falla una escritura. Los hashes comprueban consistencia, no son una firma digital del autor.

Si se detiene, conserva el mensaje y revisa la ruta indicada. No borres el manifiesto ni extraigas el ZIP sobre archivos incompatibles. Las diferencias pueden corresponder a ajustes locales válidos de Etapa 6.

### 4. Revisar el diff

```bash
git status --short
git diff --stat
git diff --check
git diff -- frontend/src/pages/MyTrips/MyTripsPage.tsx frontend/src/pages/CreateGroup/CreateGroupPage.tsx frontend/src/pages/JoinGroup/JoinGroupPage.tsx
git ls-files --others --exclude-standard
```

Los archivos nuevos no aparecen en `git diff` hasta agregarlos; revísalos también. No hay cambios de dependencias. Si no están instaladas en ese equipo:

```bash
npm --prefix frontend ci
npm --prefix backend ci
```

### 5. Ejecutar validaciones locales

```bash
npm --prefix frontend run lint
(cd frontend && npx tsc --noEmit -p tsconfig.app.json)
npm --prefix frontend run build
node --test frontend/tests/*.test.mjs
npm --prefix backend run build
npm --prefix backend test -- --runInBand
```

Los comandos del backend permiten verificar tu entorno; no se ejecutaron para esta entrega, que no modifica ese código.

### 6. Iniciar ambos procesos

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

Abre la URL indicada por Vite.

### 7. Revisión manual con tus servicios

- Abrir Mis viajes y comprobar fotos, fallback, fechas, estado, rol e integrantes reales. Revisar próximos, en curso, anteriores y fechas pendientes, búsqueda/orden y `#viajes-pasados`.
- Abrir dos viajes distintos y verificar ID, Resumen y permisos; consultar uno finalizado sin habilitar ediciones.
- Crear un viaje con presupuesto vacío/cero y fechas inválidas: debe rechazarse. Después crear uno válido con un presupuesto definido por ti; comprobar persistencia real y nombre duplicado.
- Elegir un destino, editarlo y comprobar que se invalide su ubicación previa. Si Google falla, verificar el mensaje real; no dar por válidas coordenadas que no se recibieron.
- Crear con y sin invitaciones; comprobar la lista y los resultados reales. Si falla el envío, usar «Reintentar solo invitaciones» y comprobar que haya un único viaje.
- Abrir invitación pública, privada y personal; comprobar capacidad y respuesta real del backend. Una solicitud pendiente no debe conceder acceso.
- Abrir una invitación personal sin sesión: ir a login y comprobar el retorno con `code` y `token` intactos. Usar la cuenta invitada y comprobar el error con otra cuenta cuando corresponda.
- Probar enlace usado/revocado y errores de red; no asumir que cada caso tiene un código de error distinto.
- Revisar a 1440, 1024/768 y 390/360 px; comprobar recorte de fotos, galería, formularios, teclado/foco, dropdown de destino, mensajes y ausencia de desbordamiento horizontal. No deben perderse acciones en móvil.
- Recorrer Vuelos, Hoteles, Decisiones, Itinerario y Exploración para confirmar continuidad con tus datos reales.

### 8. Commit, push y PR — ejecutar tú después de validar

```bash
git add frontend/src/pages/MyTrips/MyTripsPage.tsx frontend/src/pages/CreateGroup/CreateGroupPage.tsx frontend/src/pages/JoinGroup/JoinGroupPage.tsx frontend/src/components/trips frontend/tests/editorial-trips.test.mjs docs/frontend-ui/ETAPA7_MIS_VIAJES_EDITORIAL.md docs/frontend-ui/VALIDACION_ETAPA7.json docs/frontend-ui/MANIFEST_ETAPA7.json docs/frontend-ui/aplicar_etapa7.py
git diff --cached --check
git diff --cached --stat
git commit -m "feat: rediseñar Mis viajes, creación e invitaciones"
git push -u origin feat/editorial-mis-viajes
```

Con GitHub CLI y tu sesión:

```bash
gh pr create --base develop --head feat/editorial-mis-viajes --web
```

Si Etapa 6 aún no se fusionó, espera su integración antes de abrir el PR hacia `develop`, o utiliza temporalmente su rama como base y cámbiala después. Revisa Actions y las protecciones antes del merge. **Esta entrega no ejecutó commits, push, merges ni PRs.**
