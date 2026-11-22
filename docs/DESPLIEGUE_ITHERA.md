# Despliegue de ITHERA — integración (2026)

Este documento corresponde al despliegue de integración confirmado durante el rediseño **Editorial Travel Atlas**. No incluye valores secretos.

## Entornos

| Servicio | Proveedor | Enlace |
| --- | --- | --- |
| Aplicación web | Vercel | https://ithera-theta.vercel.app |
| API REST y Socket.IO | Render | https://ithera-backend.onrender.com |
| Base de datos y autenticación | Supabase | Proyecto privado configurado en variables de entorno |
| Código fuente | GitHub | https://github.com/ITHERA-SWE/ITHERA/tree/develop |

`develop` es la rama de producción configurada en Vercel para **este entorno de integración**. La rama `main` se reserva para versiones estables y no se debe confundir con el despliegue actual.

## Backend — Render

- Repositorio: `ITHERA-SWE/ITHERA`
- Branch: `develop`
- Root Directory: `backend`
- Language: Node
- Build Command: `npm ci --include=dev && npm run build`
- Start Command: `npm start`
- Configuración de aplicación: `NODE_ENV=production`
- Render proporciona la variable de puerto; el servidor debe escuchar en `process.env.PORT` y en una interfaz accesible desde la plataforma.
- `FRONTEND_URL=https://ithera-theta.vercel.app` para la configuración que consume esa variable (incluida CORS cuando corresponda).
- El plan Free puede suspender instancias inactivas, afectando el primer tiempo de respuesta y las reconexiones.

**Variables principales (nombres, no valores):** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY`, `GOOGLE_MAPS_API_KEY`, claves de Duffel/LiteAPI/Amadeus, `WEATHER_API_KEY`, `RESEND_API_KEY`, `MAIL_FROM` y URLs base correspondientes.

## Frontend — Vercel

- Repositorio: `ITHERA-SWE/ITHERA`
- Root Directory: `frontend`
- Framework: Vite
- Build: `npm run build`
- Output: `dist`
- Producción del entorno de integración: `develop`
- `frontend/vercel.json` define el rewrite SPA hacia `/index.html` para rutas React.

Variables públicas:

```env
VITE_API_URL=https://ithera-backend.onrender.com/api
VITE_SUPABASE_URL=<URL_PUBLICA_SUPABASE>
VITE_SUPABASE_ANON_KEY=<CLAVE_PUBLICA_SUPABASE>
VITE_GOOGLE_MAPS_BROWSER_KEY=<CLAVE_MAPS_RESTRINGIDA_PARA_NAVEGADOR>
```

**No** coloques `SUPABASE_SECRET_KEY`, tokens de proveedores ni `GOOGLE_MAPS_API_KEY` del servidor en variables `VITE_*`. Estas variables se incorporan al JavaScript servido al cliente.

## Autenticación Google / Supabase

En Supabase, `Authentication > URL Configuration`:

- `Site URL`: `https://ithera-theta.vercel.app` (entorno actual).
- Redirecciones permitidas: dominio de Vercel y `http://localhost:5173` para desarrollo; configurar los patrones realmente utilizados.
- Mantener las redirecciones antiguas solo mientras aún sean necesarias para otros entornos controlados.

Cuando el proveedor es Google a través de Supabase, en Google OAuth el callback web autorizado apunta al proyecto Supabase: `https://<ID-PROYECTO>.supabase.co/auth/v1/callback`. **No** lo sustituyas por el frontend.

## Google Maps Platform

Hay **dos claves** con funciones diferentes:

- Navegador: `VITE_GOOGLE_MAPS_BROWSER_KEY` para Maps JavaScript API, con restricciones de referentes por dominio.
- Servidor: `GOOGLE_MAPS_API_KEY` para Places API (New), Routes API y Geocoding API, limitada a las APIs necesarias y almacenada únicamente en backend.

El entorno utiliza `localhost` y despliegues de Vercel. Si se permite `https://*.vercel.app/*` para previews de PR, ten presente que es una restricción más amplia: para estabilización final conviene separar producción de previews y controlar cuotas. Los permisos y facturación se administran en Google Cloud. Los presupuestos de facturación pueden enviar alertas, pero no representan automáticamente un interruptor de gastos.

Las claves de Google Maps son distintas del cliente OAuth de Google para autenticación.

## Verificaciones posteriores a despliegue

1. Verifica que la versión de `develop` está publicada en Vercel y Render.
2. Prueba una ruta de salud y una respuesta REST desde el backend. Si Render Free estaba suspendido, espera el arranque y observa logs.
3. Inicia sesión desde el dominio actual; confirma regreso al mismo dominio.
4. Abre un viaje de prueba y verifica contexto, roles, actividades y conexión de Socket.IO.
5. Prueba mapa, búsqueda de lugares, rutas y clima con las API habilitadas.
6. Verifica Vuelos/Hoteles, propuestas, votos y checkout simulado sin operaciones reales de compra.
7. Inspecciona consola y Network para errores 401/403, CORS, fallos de proveedor y redirecciones.
8. En previews de PR, revisa por separado la política CORS, redirecciones OAuth y referentes Google; que Maps cargue no garantiza que funcione todo el login.

## Cambios y revisión

Toda modificación a secretos, puertos, dominios, CORS, cuotas o rutas de callback debe documentarse sin incluir valores sensibles. Los cambios a código pasan por PR a `develop`; la actualización de configuración en plataformas debe validarse contra un deploy concreto.
