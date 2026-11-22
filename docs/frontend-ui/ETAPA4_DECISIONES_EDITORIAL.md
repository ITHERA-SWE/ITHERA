# ITHERA — Guía de integración de Etapa 4

## Entrega y continuidad

Implementación de **comparación, Decisiones, conversaciones, votaciones y checkout simulado** en Editorial Travel Atlas. Se conservan el logotipo, Instrument Serif, Plus Jakarta Sans y los colores #4B2FA3, #1E0A4E y #1E6FD9.

Base exacta reconstruida y comprobada antes de editar:

- Git: `7abfe0156cd947b4a940b82b764afbca2ae21f72`.
- Encima: entrega completa `ITHERA_Editorial_Dashboard_Etapa2.zip`.
- Encima: entrega completa `ITHERA_Editorial_Busqueda_Etapa3.zip`, SHA256 `7ec365c1a7be7a512683181522e928d8cac3097bbe39e5302114838a07b761ad`.
- No se conoce ni se supone el SHA de un eventual merge posterior en tu GitHub. La compatibilidad se decide por contenido: hashes de los archivos que se reemplazan y de las dependencias relevantes de ambas etapas.

El ZIP es incremental: contiene **archivos completos nuevos y modificados de Etapa 4**, en sus rutas originales. Necesita las Etapas 2 y 3 aplicadas y guardadas en Git. No contiene el repositorio entero, `.git`, `node_modules`, `dist`, `.env`, claves ni fixtures de la API de prueba. No cambia dependencias ni backend. No se ejecutaron commits, push ni PR.

## Cambios

- **Comparador:** hasta cuatro alternativas persistidas en columnas de escritorio; selección explícita para revisar, separada del voto. Vuelos con trayecto, horarios, escalas, duración, pasajeros, tarifa y equipaje cuando existen. Hoteles con foto recibida, ubicación, estancia, habitaciones y condiciones. No clasifica importes de monedas distintas como equivalentes.
- **Decisiones:** listado de propuestas reales de todas las categorías y panel de detalle con filtros de categoría y estado. Funciona aunque la agenda esté vacía. No requiere que un vuelo/hotel esté incorporado a un día del itinerario para encontrarlo.
- **Participación:** votos a favor, en contra y abstención; resultados y voto propio del servidor. Bloqueo de dobles envíos, votaciones cerradas y acciones no permitidas. Confirmación para aprobar, descartar y eliminar; edición de propuestas propia o administrativa según las reglas actuales.
- **Conversaciones:** carga y reintento, autor/fecha disponibles, publicación, edición y eliminación propias. Actualizaciones por los eventos Socket.IO existentes, filtradas por viaje y propuesta, con deduplicación.
- **Modales del itinerario:** detalle de actividad y confirmación adaptados al lenguaje editorial; se conserva la confirmación legacy mediante `estado: confirmado`, distinta de la aprobación administrativa.
- **Checkout:** resumen y formulario editorial; verificación de propuesta, tipo y viaje; aprobación requerida; operación simulada claramente identificada. Conserva validaciones y payload de tarjeta de prueba, pasajero/huésped, correo y notas. Usa los endpoints existentes y muestra el folio, estado, comprobante y gasto cuando el servidor los devuelve. No integra pagos reales.
- **Estados:** skeletons, vacíos, errores y reintentos; modos de solo lectura y sin conexión; acciones en proceso; respuesta atrasada de un viaje anterior descartada. Si falla la participación no muestra un conteo inventado de cero votos.
- **Datos ausentes:** precio desconocido no equivale a cero; no se asume moneda, valoración, foto ni número de pasajeros. `proposals.ts` conserva fechas ausentes como vacías en lugar de fabricar la hora actual. No cambian endpoints, contratos ni estados persistidos.

## Funciones preservadas

Autenticación, roles, `groupId`, navegación del viaje, Resumen e Itinerario de Etapa 2, búsquedas Duffel/LiteAPI de Etapa 3, propuestas persistidas, comentarios, votos, decisiones administrativas y checkout existente. Se reutilizan `proposalsService`, `checkoutService`, `groupsService`, lectura de presupuesto y hooks de red/Socket.IO.

**Finanzas:** no se modifica su UI, servicio, registro de gastos, repartos ni liquidaciones. El checkout sigue llamando al backend existente, responsable del comprobante y del gasto asociado; el frontend no duplica esos registros. La respuesta puede contener `expense: null`; en ese caso la interfaz indica que hay que revisar Finanzas y no afirma que se registró un gasto. Las pruebas locales usan respuestas controladas: no demuestran creación real de documentos o gastos en Supabase.

## Archivos modificados (9)

```text
frontend/src/pages/Comparison/ComparisonPage.tsx
frontend/src/pages/Itinerary/DashboardPage.tsx
frontend/src/pages/Checkout/CheckoutPage.tsx
frontend/src/components/ProposalDetailModal/ProposalDetailModal.tsx
frontend/src/components/ConfirmProposalModal/ConfirmProposalModal.tsx
frontend/src/components/checkout/CheckoutSummaryCard.tsx
frontend/src/components/checkout/PaymentCardForm.tsx
frontend/src/components/checkout/PurchaseSuccessModal.tsx
frontend/src/services/proposals.ts
```

## Archivos nuevos (10)

```text
frontend/src/components/collaboration/CollaborationView.tsx
frontend/src/components/collaboration/EditorialDialog.tsx
frontend/src/components/collaboration/useProposalWorkspace.ts
frontend/src/components/collaboration/proposal-data.ts
frontend/src/components/collaboration/collaboration.css
frontend/tests/editorial-decisions.test.mjs
docs/frontend-ui/ETAPA4_DECISIONES_EDITORIAL.md
docs/frontend-ui/VALIDACION_ETAPA4.json
docs/frontend-ui/MANIFEST_ETAPA4.json
docs/frontend-ui/aplicar_etapa4.py
```

Este documento también se entrega por separado como `ITHERA_Etapa4_Guia_Integracion.md`.

## Validación ejecutada

Entorno: Node **24.22.3**, TypeScript **5.9.3**, Vite **8.3.8**, Python **3.12.14**.

| Validación | Resultado |
| --- | --- |
| `npm --prefix frontend run lint` | Correcto; sin errores ni advertencias ESLint |
| `npm --prefix frontend run build` | Correcto; incluye `tsc -b` |
| `cd frontend` y `npx tsc --noEmit` | Correcto |
| `node --test frontend/tests/*.test.mjs` | 33 pruebas correctas: 20 existentes y 13 nuevas |
| React compilado + jsdom + API HTTP y Socket.IO locales | 27 casos de Etapa 4 correctos |
| Regresión de búsqueda de Etapa 3 con la nueva aplicación | 24 casos correctos |
| Aplicador y ZIP | 16 comprobaciones correctas; incluye integridad, conflictos, ramas protegidas y rollback |

Las 13 pruebas nuevas se incluyen en `frontend/tests/editorial-decisions.test.mjs`. Se ejecutan con Node y la dependencia TypeScript ya existente. La integración en jsdom se realizó con un servidor y fixtures temporales fuera de la aplicación; **no son datos de producción ni proveedores reales**. El informe `VALIDACION_ETAPA4.json` detalla los casos ejecutados. Las guardas Git del aplicador se comprobaron con respuestas simuladas; la lectura del ZIP, los hashes, la aplicación y el rollback se ejecutaron en un árbol temporal real. No se crearon commits para estas pruebas. Los comandos de prueba que se incluyen abajo reproducen las comprobaciones de código y unidades; los fixtures temporales del entorno no forman parte del ZIP.

Se mantiene la advertencia previa de Vite sobre el bundle de más de 500 kB. No impide compilar; la división global del bundle queda fuera de esta etapa. No se ejecutaron pruebas del backend porque sus fuentes no cambian.

**Límites:** no se probaron Supabase, Duffel, LiteAPI, Google, correo, almacenamiento de PDFs ni registros financieros reales. Chromium no pudo iniciarse: `socket() failed: Operation not permitted`. Por eso no hay capturas reales ni validación visual de responsive, contraste medido, lector de pantalla, foco/trampa nativos o teclado en navegador. CSS incluye diseños de 4/2/1 columnas, panel móvil, campos adaptables, foco visible y reducción de movimiento; requieren revisión en tu equipo.

## 1. Comprobar Git y preparar la rama

En la terminal de macOS:

```bash
cd "/Users/yaelsangrador/Desktop/Sangrador/Ingenieria de Software/ITHERA-SWE"
git status --short
git branch --show-current
git log -1 --oneline
```

`git status --short` debe quedar vacío. Si hay cambios, revísalos y guarda primero el trabajo de Etapa 3 en su propia rama; no lo descartes. El ZIP debe estar en Descargas, fuera del repositorio.

**Opción A: la Etapa 3 ya está fusionada en `develop`:**

```bash
git fetch origin
git switch develop
git pull --ff-only origin develop
git switch -c feat/editorial-decisiones
```

**Opción B: la Etapa 3 solo existe en tu rama local.** Usa esta opción en lugar de A; sustituye `feat/editorial-busqueda` si tu rama tiene otro nombre:

```bash
git switch feat/editorial-busqueda
git status --short
git switch -c feat/editorial-decisiones
```

No crees la nueva rama desde un `develop` anterior a Etapa 3. No ejecutes ambas opciones. El aplicador rechaza `main`, `develop` y HEAD separado.

## 2. Verificar y aplicar el ZIP

Descarga `ITHERA_Editorial_Decisiones_Etapa4.zip` a `~/Downloads`. No lo extraigas encima del repositorio con Finder o `unzip -o`: usa el aplicador.

```bash
ZIP_ETAPA4="$HOME/Downloads/ITHERA_Editorial_Decisiones_Etapa4.zip"
python3 --version
unzip -t "$ZIP_ETAPA4"
APLICADOR_ETAPA4=$(mktemp "${TMPDIR:-/tmp}/ithera-etapa4.XXXXXX")
unzip -p "$ZIP_ETAPA4" docs/frontend-ui/aplicar_etapa4.py > "$APLICADOR_ETAPA4" && python3 "$APLICADOR_ETAPA4" "$ZIP_ETAPA4" --check
```

Continúa solo si la comprobación finaliza correctamente. Valida antes de escribir: raíz y rama, árbol limpio, conflictos sin resolver, ascendencia Git, presencia de Etapa 3, hashes base, colisiones con nuevos archivos, integridad del contenido y rutas permitidas. Detiene una segunda aplicación. No toca `.env` ni credenciales. La aplicación usa reemplazos atómicos y recupera los archivos escritos si una operación de escritura falla.

Si se detiene, **no fuerces la extracción**. Puede significar que Etapa 3 no está aplicada, que hay trabajo pendiente o que uno de los archivos evolucionó. Conserva tus archivos y revisa el mensaje; se necesita adaptar la entrega a esa base.

```bash
python3 "$APLICADOR_ETAPA4" "$ZIP_ETAPA4" --apply
git status --short
git diff --stat
git diff --check
git diff -- frontend/src/pages/Itinerary/DashboardPage.tsx frontend/src/services/proposals.ts
git diff -- frontend/src/pages/Comparison/ComparisonPage.tsx frontend/src/pages/Checkout/CheckoutPage.tsx
```

`git diff` no muestra todavía el contenido de los archivos nuevos; puedes abrirlos en tu editor o revisarlos cuando queden en el área de preparación del commit.

## 3. Dependencias y validaciones locales

No se agregaron paquetes. Si ya tienes las dependencias instaladas y coinciden con tu lockfile, no necesitas reinstalarlas. En un checkout limpio, o si no estás seguro:

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

Usa una versión de Node compatible con la configuración Vite de tu proyecto. Esta entrega se validó con Node 24.22.3.

## 4. Iniciar frontend y backend

Con tus `.env` locales existentes y Supabase activo. En una terminal, desde la raíz:

```bash
npm --prefix backend run dev
```

En otra terminal, desde la misma raíz:

```bash
npm --prefix frontend run dev
```

Si al backend le faltan dependencias, ejecuta primero `npm --prefix backend ci`. No copies claves al repositorio. Abre la URL local que muestre Vite.

## 5. Revisión funcional en tu equipo

Usa un viaje y propuestas de prueba; el checkout simulado puede generar documentos y gastos reales dentro de la base compartida aunque no cobre dinero.

1. Entra a un viaje y a **Explorar**. Busca y guarda un vuelo y un hotel usando el flujo existente. Abre el comparador sin perder `groupId`.
2. Compara opciones, quita/restaura alternativas, cambia categoría y estado. Revisar una opción no debe votar; importes en monedas distintas deben permanecer separados.
3. En **Decisiones**, abre vuelos, hoteles y actividades reales. Comprueba resultados, voto propio, votos cerrados, abstención, comentarios y permisos con organizador y viajero.
4. Usa dos sesiones para comprobar eventos de votos/comentarios y que un cambio de otro viaje no se mezcle con el activo.
5. Aprueba o descarta una propuesta de prueba con confirmación. Edita y elimina solo lo permitido. Un error debe conservar el formulario y permitir revisar/reintentar.
6. Para una propuesta aprobada, abre el checkout. Debe indicar simulación en formulario y resultado. Si decides ejecutarlo, usa exclusivamente datos de prueba y comprueba comprobante/gasto en los módulos existentes. Revisa el estado antes de reintentar una respuesta de red ambigua: la prevención frontend no sustituye idempotencia del backend.
7. Cambia de viaje, desconecta la red y abre un viaje finalizado; no deben habilitarse escrituras no permitidas.
8. Revisa Resumen, Itinerario, Archivos y navegación de Etapa 2, más formularios, filtros y propuestas de Etapa 3.
9. Revisa escritorio (~1440 px), tableta (~900 px) y móvil (~390/360 px), textos largos, fotografías fallidas, ausencia de desbordamiento horizontal, Tab/Shift+Tab, Escape, foco de diálogos, etiquetas y legibilidad.

El comparador muestra hasta cuatro propuestas a la vez, pero el selector y Decisiones permiten acceder al resto. Las actividades mantienen el flujo de confirmación del itinerario; no reciben un checkout de vuelo/hotel.

## 6. Commit, push y Pull Request (los ejecutas tú)

Después de las pruebas:

```bash
git add frontend/src/components/collaboration frontend/tests/editorial-decisions.test.mjs
git add frontend/src/pages/Comparison/ComparisonPage.tsx frontend/src/pages/Checkout/CheckoutPage.tsx frontend/src/pages/Itinerary/DashboardPage.tsx
git add frontend/src/components/ProposalDetailModal/ProposalDetailModal.tsx frontend/src/components/ConfirmProposalModal/ConfirmProposalModal.tsx
git add frontend/src/components/checkout/CheckoutSummaryCard.tsx frontend/src/components/checkout/PaymentCardForm.tsx frontend/src/components/checkout/PurchaseSuccessModal.tsx frontend/src/services/proposals.ts
git add docs/frontend-ui/ETAPA4_DECISIONES_EDITORIAL.md docs/frontend-ui/VALIDACION_ETAPA4.json docs/frontend-ui/MANIFEST_ETAPA4.json docs/frontend-ui/aplicar_etapa4.py
git diff --cached --check
git diff --cached --stat
git diff --cached
git commit -m "feat: comparador y decisiones Editorial Travel Atlas"
git push -u origin feat/editorial-decisiones
```

Si Etapa 3 ya está fusionada en `develop`, abre el PR con GitHub CLI:

```bash
gh pr create --base develop --head feat/editorial-decisiones --title "feat: comparador y decisiones editoriales — Etapa 4" --web
```

Si Etapa 3 sigue pendiente en `feat/editorial-busqueda`, usa temporalmente esa base para revisar únicamente Etapa 4:

```bash
gh pr create --base feat/editorial-busqueda --head feat/editorial-decisiones --title "feat: comparador y decisiones editoriales — Etapa 4" --web
```

La rama base temporal debe existir en GitHub. Después de fusionar Etapa 3, cambia la base del PR a `develop` y comprueba de nuevo el diff y los checks. Si no tienes `gh`, crea el PR desde GitHub seleccionando esas mismas ramas. Espera CI y la aprobación configurada; esta guía no hace merges ni omite protecciones.

Descripción sugerida:

> Rediseña el comparador, Decisiones, conversaciones, votaciones y checkout simulado sobre las Etapas 2 y 3. Conserva servicios, permisos, contexto y efectos financieros del backend. Validación: lint, TypeScript, build y 33 pruebas automatizadas; integración local con API de prueba documentada. Pendiente revisión visual y validación de proveedores/checkout con el entorno real del equipo.
