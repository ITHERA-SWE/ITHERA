# ITHERA — Guía de integración de la Etapa 9

## Qué contiene

Estabilización incremental sobre **Etapa 8 completa**: correcciones de documentos, propuestas y ordenamiento; unificación de diálogos, controles, autenticación, subgrupos, chats, notificaciones, exportación y landing. No reconstruye las etapas anteriores. Conserva servicios, `groupId`, permisos, finanzas y checkout simulado.

**Causas corregidas:** inserción duplicada del mismo documento tras una recarga Socket.IO; filtro de estado incompatible al cambiar categoría en Decisiones; comparador de fechas no transitivo en Mis viajes; ausencia de padding en el cuerpo compartido de diálogos; ayuda posicionada dentro de contenedores que la recortaban.

Se reutilizan `EditorialDialog`, `AccountConfirmDialog`, Logo, servicios y estados de etapas anteriores. Se crean `ChatSurface`, `EditorialLoading`, posicionamiento de ayuda y estilos editoriales compartidos acotados a sus superficies. No hay nuevas dependencias de producción ni cambios en package.json/lockfiles. El kit DOM opcional instala herramientas solamente en un directorio temporal.

No se editó backend, OAuth, `.env`, credenciales, LICENSE ni configuración de Vercel/Render/Supabase. La guía de despliegue incorporada conserva la versión documental conocida; no cambia infraestructura. Se mantienen las pantallas de búsqueda, comparador, votos/comentarios, propuestas y finanzas.

## Versión exacta de continuidad

- Commit original: `7abfe0156cd947b4a940b82b764afbca2ae21f72`.
- Base real: ese commit **más las Etapas 2–8 completas**, no develop antiguo. El entorno conserva esas etapas como cambios aplicados; por ello no existe un único commit remoto nuevo que represente toda la base.
- Overlay inmediato: `ITHERA_Editorial_Cuentas_Personas_Etapa8.zip`.
- SHA256 Etapa 8: `dbc08f2927319277cf63f7337a88f1ac5c206eab29427f2304e935cc17a5e753`.
- `MANIFEST_ETAPA9.json` incluye los hashes originales, finales y dependencias necesarias de las etapas anteriores. El aplicador valida el contenido, además de la ascendencia Git.
- README, CONTRIBUTING y guía de despliegue admiten tanto la base original como los bytes exactos de la entrega documental conocida `ITHERA_Documentacion_2027-1.zip`. Un PR posterior con otros bytes provoca conflicto; no se sobrescribe automáticamente.

El ZIP es una **actualización con archivos completos**, no un repositorio independiente: requiere tu repositorio con Etapa 8 ya aplicada. Incluye documentación, manifiesto, aplicador y pruebas; no incluye `.git`, dependencias instaladas, build, claves ni datos privados.

## Integración en macOS

Ejecuta desde Terminal. Estos comandos se proporcionan para que tú los ejecutes; no se ejecutaron commits, push ni PR durante la preparación.

### 1. Revisar Git

```bash
cd "/Users/yaelsangrador/Desktop/Sangrador/Ingenieria de Software/ITHERA-SWE"
git status --short
git branch --show-current
git log -1 --oneline
```

Antes de seguir, la Etapa 8 debe estar completa y guardada en tu rama. Si hay cambios, revísalos y guárdalos de forma deliberada; el aplicador rechaza un árbol con cambios o archivos sin seguimiento. No ejecutes reset/clean ni descartes trabajo para pasar la comprobación.

### 2. Crear la rama desde la base correcta

**A. Si Etapa 8 ya está fusionada en develop:**

```bash
git fetch origin
git switch develop
git pull --ff-only origin develop
git switch -c feat/editorial-estabilizacion
```

**B. Si Etapa 8 sigue en su rama local:**

```bash
git switch feat/editorial-cuentas-personas
git status --short
git switch -c feat/editorial-estabilizacion
```

Elige solo una alternativa. Sustituye el nombre de la rama de Etapa 8 si en tu equipo es distinto. No continúes desde develop si todavía no contiene esa etapa. Si la rama de Etapa 9 ya existe, revísala y utiliza `git switch feat/editorial-estabilizacion`; no la recrees ni la sobrescribas.

### 3. Comprobar y aplicar

Descarga el ZIP en Descargas con su nombre original. El aplicador se extrae fuera del repositorio para que no altere el estado Git antes de verificarlo.

```bash
ITHERA_ETAPA9_ZIP="$HOME/Downloads/ITHERA_Editorial_Estabilizacion_Etapa9.zip"
ITHERA_ETAPA9_APLICADOR="$(mktemp -t ithera-etapa9-aplicador)"
python3 --version
shasum -a 256 "$ITHERA_ETAPA9_ZIP"
unzip -p "$ITHERA_ETAPA9_ZIP" docs/frontend-ui/aplicar_etapa9.py > "$ITHERA_ETAPA9_APLICADOR"
python3 "$ITHERA_ETAPA9_APLICADOR" "$ITHERA_ETAPA9_ZIP" --check
```

Usa **Python 3.10 o posterior**. Si la comprobación informa una diferencia, detente: revisa el archivo/rama señalado y conserva los cambios. No desactives hashes ni fuerces la aplicación. Si todo es compatible:

```bash
python3 "$ITHERA_ETAPA9_APLICADOR" "$ITHERA_ETAPA9_ZIP" --apply
git status --short
git diff --stat
git diff --check
git diff -- frontend/src README.md CONTRIBUTING.md
```

`git diff` no muestra el contenido de archivos nuevos hasta agregarlos; revísalos también con tu editor y la lista del manifiesto. El aplicador rechaza `main`, `develop`, HEAD separado, conflictos, cambios locales, dependencias incompatibles, rutas inseguras, hashes alterados y una segunda aplicación. Verifica todo antes de escribir y restaura archivos si falla una escritura; no ejecuta Git de escritura, servicios ni migraciones.

### 4. Dependencias y comprobaciones

No se modifican dependencias. Si ya están instaladas según sus lockfiles puedes omitir los dos `npm ci`. Para reproducir desde una instalación limpia:

```bash
node --version
npm --version
npm --prefix frontend ci
npm --prefix backend ci
npm --prefix frontend run lint
(cd frontend && npx tsc --noEmit -p tsconfig.app.json)
npm --prefix frontend run build
node --test frontend/tests/*.test.mjs
git diff --check
```

Entorno de entrega: Node 24.22.3, npm 11.19.1, TypeScript 5.9.3 y Vite 8.3.8. Usa una versión compatible con los lockfiles/CI del proyecto. El build comprueba también el proyecto TypeScript completo. La advertencia de chunk grande permanece visible. No uses `npm audit fix --force` como parte de esta integración.

El backend no cambia. Si deseas comprobarlo adicionalmente, utiliza su configuración de pruebas existente:

```bash
npm --prefix backend run lint
npm --prefix backend run build
npm --prefix backend test -- --runInBand
```

### 5. Regresión DOM focalizada reproducible (opcional)

Se incluyen 15 casos de la aplicación y 4 del chat de subgrupo. Ejecutan React real con **HTTP/Socket.IO local y sesión/proveedores controlados**. No se conectan a tu Supabase ni validan compras reales. Requieren frontend/backend instalados y puerto 3009 libre. Se copian fuera del repo para que bundles, fixtures de ejecución e informes no queden como cambios del proyecto.

```bash
ITHERA_ETAPA9_TEST_DIR="$(mktemp -d -t ithera-etapa9-pruebas)"
cp docs/frontend-ui/pruebas-etapa9/* "$ITHERA_ETAPA9_TEST_DIR/"
npm install --prefix "$ITHERA_ETAPA9_TEST_DIR/deps" --no-save --no-package-lock jsdom@31.0.1 fake-indexeddb@6.2.8
export ITHERA_REPO_ROOT="$PWD"
export ITHERA_TEST_MODULES="$ITHERA_ETAPA9_TEST_DIR/deps/node_modules"
node "$ITHERA_ETAPA9_TEST_DIR/build-dom.mjs"
node "$ITHERA_ETAPA9_TEST_DIR/test-dom.cjs"
node "$ITHERA_ETAPA9_TEST_DIR/build-components.mjs"
node "$ITHERA_ETAPA9_TEST_DIR/test-components.cjs"
```

El script finaliza cada servidor al terminar su proceso. Consulta los JSON generados en el directorio temporal. Las 195 comprobaciones de las etapas anteriores se ejecutaron además en el entorno de entrega; no se redistribuyen todas esas herramientas temporales. Las pruebas unitarias sí se incluyen en el frontend.

### 6. Iniciar localmente

Terminal 1, desde la raíz del repo:

```bash
npm --prefix backend run dev
```

Terminal 2, desde la raíz:

```bash
npm --prefix frontend run dev
```

Abre `http://localhost:5173`. Utiliza tus `.env` existentes; no vienen en el ZIP. Verifica que el frontend apunte a tu backend previsto, que Supabase esté activo y que las URLs OAuth autorizadas correspondan a ese entorno. Esta entrega no modifica ninguna de esas configuraciones.

### 7. Revisar, crear commit, subir y abrir PR

Después de revisar los cambios y pruebas:

```bash
git add -- README.md CONTRIBUTING.md docs/DESPLIEGUE_ITHERA.md docs/PROYECTO_ACADEMICO_2027_1.md docs/frontend-ui frontend/src frontend/tests
git diff --cached --stat
git diff --cached --check
git diff --cached --name-only
git commit -m "fix: estabilizar experiencia editorial de ITHERA"
git push -u origin feat/editorial-estabilizacion
```

Antes del commit verifica que solo estén los archivos de esta entrega y ningún `.env` o archivo ajeno. Si usas GitHub CLI:

```bash
gh pr create --base develop --head feat/editorial-estabilizacion --web
```

Si Etapa 8 todavía no está fusionada, puedes abrir primero un PR apilado para revisar únicamente Etapa 9:

```bash
gh pr create --base feat/editorial-cuentas-personas --head feat/editorial-estabilizacion --web
```

Elige una base, no abras ambos PR. Después de fusionar Etapa 8, cambia la base del PR a develop y comprueba de nuevo diff, CI y aprobaciones. Mantén las protecciones actuales; no hace falta bypass ni cambios directos sobre main/develop.

## Validación y límites

Lint, TypeScript y build correctos; **105 pruebas unitarias, 195 regresiones DOM anteriores, 19 interacciones DOM nuevas y 22 comprobaciones del aplicador** correctas. Resultados detallados en `VALIDACION_ETAPA9.json`; informe compacto en `ITHERA_ETAPA9_VALIDACION_FINAL.md`.

La carrera de documentos se reprodujo en frontend; la captura no permite determinar si tus dos registros concretos tenían el mismo ID persistido. Se conservan archivos homónimos y asociaciones; no hay limpieza automática de registros. El caso de propuestas privadas no puede certificarse sin tu sesión y datos: se prueban todos los tipos/estados recibidos y filtros sobre fixtures.

Chromium no inició por una restricción del entorno (`socket() failed: Operation not permitted`). No se entregan capturas ni se afirma inspección visual real. Quedan por revisar píxeles, overflow, modalidad/foco nativos y paginación PDF. No se probaron credenciales ni APIs de producción.

## Comprobación posterior en Vercel y Render

Mantén la estrategia actual de despliegue desde develop y la revisión por PR.

- [ ] Tras la aprobación y fusión autorizadas, comprobar el commit desplegado en frontend y backend actuales; esta etapa solo requiere nuevo frontend.
- [ ] Abrir `https://ithera-theta.vercel.app`; verificar la API configurada hacia `https://ithera-backend.onrender.com` según tu configuración existente. No introducir secretos en el cliente.
- [ ] Esperar la activación inicial de Render; distinguir carga, error recuperable y servicio sin datos. Probar reintento y reconexión.
- [ ] Revisar 390/768/1440 px: landing, login/registro/recuperación/OTP, modales, días, tooltip junto a bordes, chats y notificaciones; sin scroll horizontal involuntario.
- [ ] Subir una vez un documento de prueba; comprobar en red un POST y en API/BD un ID. Recargar, revisar asociaciones, error parcial y dos archivos legítimos con igual nombre. No borrar registros existentes para validar.
- [ ] Consultar Decisiones con todas las categorías y estados; comparar IDs con respuesta API del viaje. Revisar búsqueda, conteos, selección, scroll, votos, comentarios y simulación sin compras reales.
- [ ] Cambiar orden/filtros de Mis viajes y comprobar las secciones. Recorrer Resumen → Itinerario → Explorar → Decisiones → Personas → Archivos conservando el viaje.
- [ ] Con dos cuentas, comprobar invitaciones/permisos y chats general/subgrupo; un envío/un mensaje, aislamiento de salas, contador de no leídas y reconexión.
- [ ] Revisar acceso OAuth y retorno de invitaciones con configuración real. Las credenciales Google/cuotas y URLs autorizadas se administran fuera de este ZIP.
- [ ] Exportar confirmadas, abrir consulta compartida e imprimir/guardar PDF; revisar márgenes y saltos con datos reales de distinta longitud.
- [ ] Revisar texto académico y licencia/atribuciones antes de cerrar el PR. Finanzas mantiene sus contratos; no hay funcionalidades financieras nuevas.

## Archivos de la entrega

Las rutas siguientes contienen archivos completos. El manifiesto es la referencia de integridad; el ZIP no elimina archivos.

- `CONTRIBUTING.md`
- `README.md`
- `docs/DESPLIEGUE_ITHERA.md`
- `docs/PROYECTO_ACADEMICO_2027_1.md`
- `docs/frontend-ui/ITHERA_ETAPA9_VALIDACION_FINAL.md`
- `docs/frontend-ui/ITHERA_Etapa9_Guia_Integracion.md`
- `docs/frontend-ui/MANIFEST_ETAPA9.json`
- `docs/frontend-ui/VALIDACION_ETAPA9.json`
- `docs/frontend-ui/aplicar_etapa9.py`
- `docs/frontend-ui/pruebas-etapa9/build-components.mjs`
- `docs/frontend-ui/pruebas-etapa9/build-dom.mjs`
- `docs/frontend-ui/pruebas-etapa9/mock-api.cjs`
- `docs/frontend-ui/pruebas-etapa9/supabase-stub.ts`
- `docs/frontend-ui/pruebas-etapa9/test-components.cjs`
- `docs/frontend-ui/pruebas-etapa9/test-dom.cjs`
- `frontend/src/components/account/account-data.ts`
- `frontend/src/components/account/accounts-editorial.css`
- `frontend/src/components/auth/ProtectedRoute.tsx`
- `frontend/src/components/auth/PublicRoute.tsx`
- `frontend/src/components/chat/ChatDrawer.tsx`
- `frontend/src/components/chat/ChatSurface.tsx`
- `frontend/src/components/chat/SubgroupChatDrawer.tsx`
- `frontend/src/components/collaboration/CollaborationView.tsx`
- `frontend/src/components/collaboration/EditorialDialog.tsx`
- `frontend/src/components/collaboration/proposal-data.ts`
- `frontend/src/components/documents/DocumentVaultPanel.tsx`
- `frontend/src/components/itinerary/editorial-print.css`
- `frontend/src/components/layout/Navbar/Navbar.tsx`
- `frontend/src/components/subgroups/SubgroupSchedulePanel.tsx`
- `frontend/src/components/trips/trip-data.ts`
- `frontend/src/components/ui/ConfirmDialog/ConfirmDialog.tsx`
- `frontend/src/components/ui/EditorialLoading.tsx`
- `frontend/src/components/ui/HelpButton/HelpButton.tsx`
- `frontend/src/components/ui/Toast/ToastContainer.tsx`
- `frontend/src/components/ui/editorial-position.ts`
- `frontend/src/components/ui/editorial-system.css`
- `frontend/src/hooks/useNotifications.ts`
- `frontend/src/main.tsx`
- `frontend/src/pages/CreateGroup/CreateGroupPage.tsx`
- `frontend/src/pages/Itinerary/DashboardPage.tsx`
- `frontend/src/pages/Landing/LandingPage.tsx`
- `frontend/src/pages/Landing/landing-editorial.css`
- `frontend/src/pages/MyTrips/MyTripsPage.tsx`
- `frontend/src/pages/Shared/SharedItineraryPage.tsx`
- `frontend/src/pages/Shared/shared-editorial.css`
- `frontend/tests/editorial-stabilization.test.mjs`
