# ITHERA — Validación final de la Etapa 9

Fecha: 22 de noviembre de 2026. Estado: implementación y comprobaciones automatizadas completadas; aceptación visual y servicios de producción pendientes.

## Correcciones realizadas

| Área | Resultado y alcance comprobado |
|---|---|
| Archivos | Se reprodujo una carrera: una actualización Socket.IO podía cargar el documento antes de que terminara el POST, y después se insertaba de nuevo el mismo ID. Se conserva el bloqueo de envío; se combina por ID y se descartan cargas atrasadas. Los documentos homónimos con IDs diferentes permanecen. Se prueban asociaciones y resultados parciales. |
| Decisiones | Cambiar de categoría limpia un estado incompatible que ocultaba propuestas. Se muestran conteos y acción para quitar filtros. Se reconocen lugares guardados con metadatos reales, además de actividades, vuelos, hospedajes y tipos restantes. Los estados no se alteran. |
| Mis viajes | Orden estable y no mutante por sección; fechas válidas y desempate por nombre e ID. Selector, búsqueda y filtros combinados comprobados. |
| Diálogos y controles | Cuerpo compartido con padding, encabezados y acciones separados; límites de tamaño, foco visible y redistribución móvil. Confirmaciones reutilizan el diálogo existente. |
| Subgrupos y ayuda | Tabs de días con teclado y datos originales; control de vistas editorial. Ayuda mediante portal y cálculo de posición limitado al viewport. |
| Chats y notificaciones | Superficie de diálogo común; historial, errores y reintento; bloqueo de envíos simultáneos; salas y eventos originales. La notificación repetida no incrementa dos veces el contador. |
| Decisiones: detalle | Scroll independiente en escritorio; transición lista/detalle y regreso en móvil. Votos, comentarios, permisos y checkout simulado conservados. |
| Acceso y landing | Ajustes de composición y recursos existentes; carga de sesión con identidad ITHERA. Landing conserva estructura y accesos; ilustración del producto identificada como tal. Se retiran cifras y testimonios sin respaldo. |
| Itinerario exportado | HTML editorial, identidad original, impresión A4 y reglas para evitar cortes; consulta compartida con reintento e impresión. Solo datos recibidos y actividades confirmadas en la exportación. |
| Documentación | Ingeniería de Software, IPN/ESCOM, 2027/1, 6CM3, Ismael Rojas Mexicano; seis integrantes y roles solicitados. Licencia y documentos históricos intactos. |

## Validaciones ejecutadas

| Comprobación | Resultado |
|---|---|
| Frontend lint | Correcto, sin errores |
| TypeScript, `tsconfig.app.json` | Correcto; el build también comprueba las referencias del proyecto |
| Build de producción | Correcto. Continúa la advertencia de bundle superior a 500 kB; no se oculta ni se cambia el límite |
| Pruebas unitarias del frontend | **105/105**, incluidas 19 nuevas |
| Regresión DOM Etapas 3–8 (incluye entradas de Etapa 2) | **195/195**: 24 + 27 + 33 + 35 + 35 + 41 |
| Interacción DOM nueva Etapa 9 | **19/19**: aplicación completa 15 y chat de subgrupo 4 |
| Aplicador | **22 comprobaciones correctas**: compatibilidad, documentación conocida/posterior, integridad, ramas protegidas, cambios locales, rutas, rollback y segunda aplicación |
| Backend | Sin modificaciones en esta entrega; no se volvió a ejecutar su suite |
| Navegador real | No disponible: Chromium no pudo iniciar por `socket() failed: Operation not permitted` |

Las pruebas DOM ejecutan componentes React compilados. Utilizan jsdom, autenticación controlada y servidor HTTP/Socket.IO local; la prueba aislada del chat de subgrupo controla los callbacks Socket.IO. **No equivalen a pruebas contra Supabase, Google, Duffel, LiteAPI, Resend o producción.** Algunos casos anteriores generan errores de consola esperados para comprobar respuestas fallidas.

En la regresión de Etapa 5 se actualizaron únicamente las expectativas del encabezado y botón de impresión de la consulta compartida; permanece la comprobación de ausencia de edición. La suite portable nueva se incluye en `docs/frontend-ui/pruebas-etapa9/`. Resultados detallados: `docs/frontend-ui/VALIDACION_ETAPA9.json`.

## Límites y verificación manual pendiente

- La captura de archivos no revela IDs de base de datos. Se corrigió y reprodujo la duplicación visual por ID; no se pudo determinar si aquellos dos registros concretos eran dos filas persistidas. No se elimina ningún archivo.
- Sin la sesión y propuestas privadas del usuario, no se puede certificar por qué faltaba cada alternativa concreta. Se comprobó la representación de todos los tipos y estados devueltos por la API con fixtures, sin incorporar resultados de búsqueda no guardados.
- Verificar visualmente en **390, 768 y 1440 px**: Login/Registro, landing, invitación y subida, días/ayuda, chats, notificaciones y detalle desplazable. jsdom no mide layout ni overflow real.
- Probar foco y confinamiento modal nativos, teclado/tacto, contraste renderizado y desplazamiento. Revisar PDF real y saltos de página en el navegador, incluyendo impresión sin acceso a fuentes remotas.
- Ejecutar smoke test con dos cuentas reales: sesión/OAuth, permisos, invitaciones, documentos y asociaciones, votos/comentarios, eventos de chat por sala y reconexión. Revisar activación inicial de Render y credenciales/cuotas de proveedores en su configuración actual.
- Sin cambios de backend, endpoints, contratos, dependencias de producción, credenciales, variables de entorno, ramas o despliegues. No se realizaron commits, push, merge ni PR.

## Base y compatibilidad

Commit original: `7abfe0156cd947b4a940b82b764afbca2ae21f72`, más el estado completo de las Etapas 2–8 verificado antes de editar. Overlay inmediato: `ITHERA_Editorial_Cuentas_Personas_Etapa8.zip`, SHA256 `dbc08f2927319277cf63f7337a88f1ac5c206eab29427f2304e935cc17a5e753`.

La continuidad se verifica por hashes de archivos; no se presupone que Etapa 8 esté fusionada en develop. Se aceptan exclusivamente las variantes documentales revisadas de `ITHERA_Documentacion_2027-1.zip`. Cualquier otra modificación posterior de README/CONTRIBUTING/despliegue detiene el aplicador para revisión manual.
