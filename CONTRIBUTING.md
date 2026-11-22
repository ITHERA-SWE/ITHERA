# Contribuir a ITHERA

Este documento describe el flujo de colaboración de **ITHERA-SWE/ITHERA**, proyecto académico de Análisis y Diseño de Sistemas (ESCOM-IPN, ciclo 2027/1, grupo 6CM3).

## Ramas y permisos

| Rama | Uso | Reglas |
| --- | --- | --- |
| `develop` | Integración del equipo y despliegue de pruebas | Solo por PR revisado y CI aprobado |
| `main` | Base estable para una entrega | Merge restringido conforme a las protecciones del repositorio |
| `feat/*` | Funcionalidades y rediseños | Nace de `develop`, PR a `develop` |
| `fix/*` | Correcciones | Nace de `develop`, PR a `develop` |
| `docs/*` | Documentación | Nace de `develop`, PR a `develop` |
| `chore/*`, `ci/*` | Mantenimiento o automatización | Nace de `develop`, PR a `develop` |

No se realizan commits ni pushes directos a ramas protegidas. No se deben eludir revisiones, checks ni reglas de aprobación.

## Flujo habitual

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feat/nombre-corto

# Modificar archivos y ejecutar validaciones
git diff --check
git add <archivos-del-alcance>
git commit -m "feat: descripción breve"
git push -u origin feat/nombre-corto

gh pr create --base develop --head feat/nombre-corto --web
```

Para documentación, usa una rama `docs/*` y un commit `docs:`. Antes de preparar el PR revisa que los cambios pertenezcan al objetivo de esa rama.

## Revisión del Pull Request

1. Describe el problema y la solución, y enlaza la tarea o issue cuando exista.
2. Identifica áreas, rutas y servicios afectados; documenta variables nuevas sin copiar valores secretos.
3. Comprueba lint, compilación y pruebas correspondientes. No afirmes que se probaron proveedores reales si se usaron simulaciones.
4. Si hay cambios visibles, adjunta capturas de escritorio y móvil sin claves, correos, sesiones o datos privados.
5. Solicita revisión y espera el CI; integra solo con la aprobación y permisos previstos.
6. Verifica el despliegue de `develop` en Vercel y Render cuando la PR afecte la aplicación.

## Comandos útiles

```bash
npm --prefix backend run build
npm --prefix backend test -- --runInBand
npm --prefix frontend run lint
npm --prefix frontend run build
node --test frontend/tests/*.test.mjs
```

La configuración de Render instala también los tipos de desarrollo para compilar TypeScript. Para pruebas locales se utilizan los archivos `.env` propios basados en `.env.example`.

## Separación de responsabilidades

Los equipos del curso comparten parte de la infraestructura y datos. Cualquier cambio en roles, permisos, presupuestos, gastos, flujos de checkout o esquema de Supabase debe revisarse con los responsables de esas áreas. Un rediseño visual no autoriza cambios silenciosos en reglas de negocio ni en contratos de API.

El checkout de vuelos y hoteles es **simulado**; no se describirá como compra o reserva real. Los módulos pueden persistir registros de prueba en una base compartida; emplea viajes y usuarios de prueba al validar mutaciones.

## Seguridad y privacidad

- Nunca subas `.env`, claves privadas, secretos de Supabase, tokens o credenciales a Git.
- Los valores `VITE_*` son públicos para el navegador; no los uses para guardar claves del backend.
- No reveles claves al compartir capturas o logs.
- Respeta autorizaciones del backend y controles de Supabase, incluso si la interfaz oculta una opción.
- Mantén las restricciones de Google Maps y cuotas apropiadas por entorno.

## Documentación

- Cambios en endpoints: actualiza `docs/api/endpoints.md`.
- Cambios de arquitectura o de base de datos: actualiza la documentación técnica correspondiente.
- Variables o despliegues: actualiza [docs/DESPLIEGUE_ITHERA.md](docs/DESPLIEGUE_ITHERA.md) y archivos `.env.example`, **sin valores secretos**.
- Cambios del frontend: documenta el alcance, pruebas y limitaciones.

Los cambios de las Etapas Editorial Travel Atlas se integran por PR a `develop`. La revisión integral de UX puede consolidar ajustes visuales, pero no debe ocultar defectos funcionales conocidos.
