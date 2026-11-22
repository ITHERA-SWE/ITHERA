# ITHERA — Etapa 8: Cuentas, personas y archivos

## Base exacta

Entrega construida sobre el estado completo de la **Etapa 7**, conservando las Etapas 2 a 7.

- Commit de origen: `7abfe0156cd947b4a940b82b764afbca2ae21f72`.
- Base de elaboración: ese commit más las entregas completas de Etapas 2 → 3 → 4 → 5 → 6 → 7 superpuestas localmente. No se crearon commits nuevos.
- Continuidad inmediata: `ITHERA_Editorial_MisViajes_Etapa7.zip`.
- SHA256 de Etapa 7: `eb342ab5d6abbab0dfef51da4a5dea0501a1bb59eab4b631bcfea4ae16da7240`.
- Antes de editar se verificaron 93 hashes de archivos y dependencias de esa entrega.

El aplicador compara el contenido exacto de los archivos, no exige que tu HEAD coincida con el checkout de elaboración. Funciona tanto desde la rama local que contiene Etapa 7 como después de fusionarla a `develop`, si los archivos esperados coinciden y se conserva el ancestro Git conocido.

Si corregiste archivos durante la validación local de Etapa 7, el aplicador se detendrá cuando esas correcciones afecten los archivos o dependencias esperados. Conserva esos cambios y reconcilia la diferencia; no fuerces la extracción del ZIP.

## Cambios implementados

### Autenticación

- Login, Register, Forgot Password, Reset Password y OTP adoptan una composición editorial con el logotipo original, Instrument Serif, Plus Jakarta Sans y la paleta de ITHERA. No se agregan fotografías de sustitución.
- Se conservan campos, validaciones, disponibilidad de correo, persistencia de sesión, Google/Facebook existentes, recuperación, confirmación OTP y restricciones de intentos.
- Se mantienen canje PKCE, enlaces de recuperación y llamadas al SDK existente. No hay cambios de callbacks, configuración OAuth, credenciales o variables de entorno.
- Formularios de recuperación y nueva contraseña permiten enviar con teclado; labels, foco y avisos se adaptan a la nueva presentación.
- Bloqueos síncronos evitan envíos duplicados. La recuperación conserva el mensaje genérico «Si el correo existe…».
- **Cambio de integración necesario en `PublicRoute.tsx`:** al confirmar la sesión, el protector podía redirigir a Mis viajes antes de que finalizara `login()`. Ahora también resuelve el retorno desde `/login`, preservando los parámetros y tokens de invitación completos y rechazando destinos externos. El resto de rutas públicas conserva su destino anterior. `/join-group` permanece sin modificaciones.

### Perfil

- Espacio de cuenta con identidad, información personal, contraseña, fotografía, preferencias y eliminación de cuenta.
- El nombre completo se actualiza mediante el PATCH existente de `/auth/me`. El correo se muestra no editable: el contrato actual de ese formulario no actualiza correo.
- Foto real o iniciales; carga y eliminación mediante los servicios originales, con formatos y límite de 5 MB existentes.
- Se conserva reautenticación antes de cambiar contraseña y la restricción del proveedor. La eliminación de cuenta requiere escribir `ELIMINAR` y confirmación modal.
- Las preferencias solo se habilitan después de cargarse; un fallo permite reintentar y un guardado rechazado revierte el cambio. Las estadísticas existentes se mantienen plegadas, sin añadir métricas.

### Personas e invitaciones internas

- Directorio editorial de integrantes con nombre, avatar recibido o iniciales y rol real; solicitudes, invitaciones pendientes y enlace/QR en el área de administración.
- Se reutiliza la navegación del viaje para Resumen, Itinerario, Explorar, Decisiones, Personas y Archivos, conservando `groupId` y regreso al viaje.
- Los datos se verifican antes de exponer acciones administrativas; caché separada por usuario y viaje. Viajes finalizados y roles sin autorización mantienen sus restricciones.
- Transferir administración sigue siendo una solicitud que requiere aceptación del receptor. No se presenta como cambio inmediato de rol. Se conservan rechazo, retirada de integrantes, confirmaciones y eventos Socket.IO.
- Invitaciones por correo, vigencia y límite de usos reutilizan servicios y contratos originales. El resumen diferencia invitaciones creadas, ya pendientes e integrantes existentes.
- Al alcanzar la capacidad se bloquean nuevas invitaciones y aprobaciones, conservando la consulta de solicitudes pendientes.
- Cambiar de viaje invalida respuestas de la pantalla anterior, evitando que sobrescriban el contexto actual.

### Ajustes del viaje

- Formulario editorial para la información, fechas, capacidad, acceso y controles de colaboración ya soportados.
- El destino sigue siendo de consulta, como en el comportamiento original. No se habilita una operación de cambio de destino que ese formulario no ofrecía.
- Se conserva el payload de actualización, incluidas coordenadas y controles de los módulos. No se agrega un nuevo campo de presupuesto ni se cambia su política.
- Se conserva el inicio de viajes ya comenzados; el calendario respeta el máximo de 60 días admitido por el backend.
- Cierre y eliminación usan confirmaciones modales. Guardado, errores, reintento y modo lectura tienen estados explícitos.

### Archivos

- Colección organizada en filas con tipo, nombre, tamaño y fecha recibidos, notas y asociaciones. Categorías y búsqueda local por nombre/nota.
- El autor solo se identifica cuando existe información suficiente; no se inventan nombres, miniaturas o metadatos.
- Las URLs HTTP(S), incluidas consultas y firmas temporales, se usan sin transformarlas. No se cambian almacenamiento ni políticas de acceso. Enlaces no válidos muestran un estado sin enlace.
- La eliminación se ofrece al autor identificado por su UUID de autenticación y se bloquea en documentos marcados como inmutables o viajes en modo lectura. El backend conserva la autorización definitiva.
- Se conservan subida, descarga/apertura, eliminación y asociaciones con gastos, actividades y subgrupos. PDF, TXT, PNG, JPG y WEBP, hasta 10 MB, según los formatos del backend.
- Los comprobantes con `generatedBy: checkout_simulation` se identifican expresamente como operaciones simuladas; su folio y asociaciones se mantienen cuando se reciben.
- Se mantienen los puntos de entrada financieros existentes y `ExpenseDraftForm`, sin modificar servicios, contratos ni pantallas de Finanzas.
- Si la subida se confirma y falla una asociación posterior, el archivo aparece como guardado y se informa el resultado parcial. No se vuelve a enviar automáticamente el mismo archivo.
- Diálogos nativos compartidos, foco visible, estados de carga/error/vacío, bloqueo de duplicados y controles de desconexión.

## Archivos de la entrega

Se incluyen archivos completos, con sus rutas originales. Es una entrega incremental sobre Etapa 7: no contiene una copia adicional de todo el repositorio.

### Modificados

| Archivo | Cambio |
|---|---|
| `frontend/src/pages/Login/LoginPage.tsx` | Login editorial y control de envío/retorno |
| `frontend/src/pages/Register/RegisterPage.tsx` | Registro editorial y respuestas de correo obsoletas |
| `frontend/src/pages/ForgotPassword/ForgotPasswordPage.tsx` | Recuperación editorial y formulario accesible |
| `frontend/src/pages/ResetPassword/ResetPasswordPage.tsx` | Nueva contraseña editorial, conservando recuperación |
| `frontend/src/pages/OTP/OTPPage.tsx` | Verificación editorial y entradas accesibles |
| `frontend/src/pages/Profile/ProfilePage.tsx` | Perfil, foto, contraseña, preferencias y confirmación |
| `frontend/src/pages/GroupPanel/GroupPanelPage.tsx` | Personas, roles e invitaciones del viaje |
| `frontend/src/pages/GroupSettings/GroupSettingsPage.tsx` | Ajustes editoriales y operaciones confirmadas |
| `frontend/src/components/InviteModal/InviteModal.tsx` | Administración interna de invitaciones |
| `frontend/src/components/documents/DocumentVaultPanel.tsx` | Colección y operaciones de archivos |
| `frontend/src/components/auth/PublicRoute.tsx` | Preservar retorno de invitación al confirmar sesión |

### Nuevos

- `frontend/src/components/account/AuthEditorialLayout.tsx`
- `frontend/src/components/account/AccountTripNav.tsx`
- `frontend/src/components/account/AccountAvatar.tsx`
- `frontend/src/components/account/AccountDialog.tsx`
- `frontend/src/components/account/account-data.ts`
- `frontend/src/components/account/accounts-editorial.css`
- `frontend/tests/editorial-accounts.test.mjs`
- `docs/frontend-ui/aplicar_etapa8.py`
- `docs/frontend-ui/MANIFEST_ETAPA8.json`
- `docs/frontend-ui/VALIDACION_ETAPA8.json`
- `docs/frontend-ui/ITHERA_Etapa8_Guia_Integracion.md`

Backend, dependencias, lockfiles, AuthContext, ProtectedRoute, App.tsx, AppLayout, servicios y variables de entorno no se modifican. Los cambios visuales están limitados a estas superficies mediante selectores propios.

## Validación realizada

| Verificación | Resultado |
|---|---|
| Frontend lint | Correcto |
| TypeScript y build del frontend | Correctos |
| Pruebas unitarias frontend | 86 aprobadas: 76 existentes + 10 nuevas |
| Interacciones de Etapa 8 | 41 casos DOM aprobados |
| Regresiones de Etapas 3, 4, 5, 6 y 7 | 24 + 27 + 33 + 35 + 35 = 154 casos DOM aprobados; incluyen acceso al Resumen de Etapa 2 |
| Revisión focal del retorno de login tras el ajuste final | 2 casos aprobados, sin contarlos de nuevo en el total |
| Backend sin cambios | Build correcto; 29 pruebas aprobadas en 4 suites |
| Aplicador seguro | 16 comprobaciones aprobadas |
| Compatibilidad | Hashes de archivos de entrada y dependencias de Etapas 2 a 7 verificados |
| Comandos de la guía | Sintaxis Bash comprobada; no se ejecutaron commits, pushes o PRs |

Los casos DOM usan la aplicación React compilada en jsdom, un servidor HTTP/Socket.IO local y respuestas controladas. Para las pruebas específicas de autenticación se utiliza un reemplazo del SDK solo en el entorno de prueba, nunca en el código o ZIP entregado. No se enviaron invitaciones/correos reales, no se hicieron compras ni operaciones sobre Supabase real. Las pruebas backend utilizan mocks y configuración de prueba.

El aplicador se probó con un árbol temporal real para hashes, extracción, conflictos, integridad y rollback. Los estados Git prohibidos se probaron con respuestas controladas; no se crearon commits para esas pruebas.

El informe `VALIDACION_ETAPA8.json` incluye el detalle de los casos. Entorno de elaboración: Node 24.22.3, TypeScript 5.9.3, Vite 8.3.8 y Python 3.12.14.

### Límites y pendientes

- Chromium no pudo iniciar por la restricción del entorno `socket() failed: Operation not permitted`. No se entregan capturas ficticias ni se afirma una inspección visual en navegador. Queda pendiente revisar escritorio/tableta/móvil, overflow, contraste y foco/modalidad nativos en tu equipo.
- Los estilos incluyen composiciones responsive y reducción de movimiento; su renderizado real debe confirmarse localmente.
- Supabase Auth/Storage, Google/Facebook, entrega de correo, URLs firmadas y notificaciones externas requieren comprobación con tus servicios reales. No se cambiaron sus credenciales ni configuración.
- El backend actual devuelve URLs de almacenamiento. Esta entrega conserva las URLs recibidas y no modifica políticas; no se auditó ni se cambió la privacidad real del bucket.
- Vite conserva el aviso de bundle mayor a 500 kB; el build termina correctamente. No se modifica la partición del bundle en esta etapa.
- La integración y fusión definitiva de Etapa 7 debe resolverse antes de abrir el PR final de Etapa 8 hacia `develop`.

## Integración desde macOS

Necesitas Git, Python 3.9 o posterior, Node/npm compatibles con el proyecto y la Etapa 7 completa guardada en una rama. No hay dependencias nuevas. Conserva el ZIP en Descargas, fuera del repositorio.

### 1. Revisar estado

```bash
cd "/Users/yaelsangrador/Desktop/Sangrador/Ingenieria de Software/ITHERA-SWE"
git status --short
git branch --show-current
git log -1 --oneline
```

Si hay cambios pendientes de Etapa 7, revísalos y guárdalos primero en su rama. El aplicador requiere un árbol limpio; no uses comandos para descartar cambios.

### 2. Crear rama desde la continuidad correcta

Elige una sola alternativa.

**A. Si Etapa 7 ya está fusionada en develop:**

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feat/editorial-cuentas-personas
```

**B. Si Etapa 7 sigue en su rama local:**

```bash
git switch feat/editorial-mis-viajes
git status --short
git switch -c feat/editorial-cuentas-personas
```

La alternativa B requiere que `feat/editorial-mis-viajes` contenga la Etapa 7 completa y sus cambios estén guardados. Si esa rama tiene otro nombre en tu equipo, sustituye únicamente ese nombre. No crees la rama desde un develop anterior a Etapa 7.

### 3. Comprobar ZIP y compatibilidad sin aplicar

```bash
ITHERA_ETAPA8_ZIP="$HOME/Downloads/ITHERA_Editorial_Cuentas_Personas_Etapa8.zip"
shasum -a 256 "$ITHERA_ETAPA8_ZIP"
ITHERA_ETAPA8_APLICADOR="$(mktemp -t ithera-etapa8)"
unzip -p "$ITHERA_ETAPA8_ZIP" docs/frontend-ui/aplicar_etapa8.py > "$ITHERA_ETAPA8_APLICADOR"
python3 "$ITHERA_ETAPA8_APLICADOR" "$ITHERA_ETAPA8_ZIP" --check
```

Compara el SHA256 con el indicado al final de la guía descargable. El aplicador rechaza `main`, `develop`, HEAD separado, cambios locales, conflictos Git, historia incompatible, archivos con hashes diferentes, colisiones con archivos nuevos y una segunda aplicación. Comprueba todas las entradas antes de escribir, no extrae rutas arbitrarias y no toca `.env`.

### 4. Aplicar y revisar

En la misma terminal, solo después de que `--check` termine correctamente:

```bash
python3 "$ITHERA_ETAPA8_APLICADOR" "$ITHERA_ETAPA8_ZIP" --apply
git status --short
git diff --stat
git diff --check
git diff -- frontend/src
```

Los archivos nuevos se revisan desde las rutas indicadas arriba. Tras añadirlos al staging en el paso 8 también se podrán revisar con `git diff --cached`.

### 5. Dependencias y validación local

No se modifican `package.json` ni lockfiles. Si ya tienes instaladas las dependencias de Etapa 7, puedes omitir las dos instalaciones:

```bash
npm --prefix frontend ci
npm --prefix backend ci
```

Después:

```bash
npm --prefix frontend run lint
(cd frontend && npx tsc --noEmit -p tsconfig.app.json)
npm --prefix frontend run build
node --test frontend/tests/*.test.mjs
npm --prefix backend run build
npm --prefix backend test -- --runInBand
```

El chequeo explícito usa `tsconfig.app.json`; `npm run build` también comprueba el proyecto TypeScript completo. El archivo de pruebas nuevas se incluye y puede ejecutarse por separado:

```bash
node --test frontend/tests/editorial-accounts.test.mjs
```

Las pruebas DOM de elaboración y sus mocks no requieren nuevas dependencias en tu proyecto; el ZIP incluye su informe, no un reemplazo de Supabase en producción.

### 6. Iniciar localmente

Primera terminal, desde la raíz del repositorio:

```bash
npm --prefix backend run dev
```

Segunda terminal, desde la misma raíz:

```bash
npm --prefix frontend run dev
```

Conserva tus `.env` locales existentes. Abre la URL que indique Vite, normalmente `http://localhost:5173/`. Usa el puerto del backend configurado en tus variables, normalmente 3001.

### 7. Recorrido de aceptación

- Inicia sesión desde un enlace de invitación y confirma que regresa al mismo código/token. Prueba sesión persistente y cierre de sesión.
- Verifica Google con tus credenciales reales; recuperación, enlace recibido y OTP con una cuenta de prueba.
- Cambia nombre y foto; recarga para confirmar persistencia. Prueba contraseña con cuenta de correo y conserva restricciones de cuentas sociales.
- Revisa preferencias, guardados fallidos y recuperación de conexión.
- En Personas, compara un organizador y un viajero: solicitudes, invitaciones, rechazo/retirada y transferencia que solo se completa tras aceptación del receptor.
- Cambia de viaje y comprueba que no aparecen datos del anterior. Verifica eventos entre dos sesiones usando tu despliegue actual.
- Revisa ajustes y modo lectura de viajes finalizados. No pruebes eliminación con datos que necesites conservar.
- Sube un documento de prueba, revisa categorías, enlaces y asociaciones; confirma que un usuario ajeno al archivo no ve eliminar y los documentos inmutables no se pueden borrar.
- Abre un comprobante de checkout simulado y comprueba su folio, etiqueta y asociación.
- Revisa teclado, foco, errores, diálogos y los anchos 390, 768 y 1440 px. Comprueba que los controles esenciales siguen disponibles y no hay desbordamiento horizontal.
- Revisa Resumen, Itinerario, Explorar, Decisiones, Mis viajes y `/join-group` para confirmar continuidad con tus servicios reales.

### 8. Crear commit y subir la rama

Después de revisar el resultado y ejecutar las pruebas:

```bash
git add frontend/src/components/account frontend/src/components/InviteModal/InviteModal.tsx frontend/src/components/auth/PublicRoute.tsx frontend/src/components/documents/DocumentVaultPanel.tsx
git add frontend/src/pages/Login/LoginPage.tsx frontend/src/pages/Register/RegisterPage.tsx frontend/src/pages/ForgotPassword/ForgotPasswordPage.tsx frontend/src/pages/ResetPassword/ResetPasswordPage.tsx frontend/src/pages/OTP/OTPPage.tsx
git add frontend/src/pages/Profile/ProfilePage.tsx frontend/src/pages/GroupPanel/GroupPanelPage.tsx frontend/src/pages/GroupSettings/GroupSettingsPage.tsx
git add frontend/tests/editorial-accounts.test.mjs docs/frontend-ui/aplicar_etapa8.py docs/frontend-ui/MANIFEST_ETAPA8.json docs/frontend-ui/VALIDACION_ETAPA8.json docs/frontend-ui/ITHERA_Etapa8_Guia_Integracion.md
git diff --cached --stat
git diff --cached --check
git diff --cached
git status --short
git commit -m "feat(frontend): rediseñar cuentas, personas y archivos con estilo editorial"
git push -u origin feat/editorial-cuentas-personas
```

### 9. Abrir PR

Si Etapa 7 ya está en develop y tienes GitHub CLI autenticado:

```bash
gh pr create --base develop --head feat/editorial-cuentas-personas --web
```

Si Etapa 7 sigue sin fusionarse, el PR hacia develop incluirá también sus cambios. Para revisar únicamente Etapa 8 puedes crear primero el PR con base en `feat/editorial-mis-viajes`; una vez fusionada Etapa 7, cambia la base a develop y revisa de nuevo el diff y CI:

```bash
gh pr create --base feat/editorial-mis-viajes --head feat/editorial-cuentas-personas --web
```

También puedes abrirlo desde GitHub. No ejecutes ambas alternativas. Esta entrega no realizó commits, push, merges ni PRs y no modificó ramas remotas.
