# ITHERA

> Ecosistema digital colaborativo para planificar viajes grupales en tiempo real.

[**Abrir ITHERA**](https://ithera-theta.vercel.app) · [**Repositorio**](https://github.com/ITHERA-SWE/ITHERA) · [**Backend**](https://ithera-backend.onrender.com)

## Información académica

| Dato | Información |
| --- | --- |
| Institución | Instituto Politécnico Nacional |
| Escuela | Escuela Superior de Cómputo (ESCOM) |
| Carrera | Ingeniería en Sistemas Computacionales |
| Unidad de aprendizaje | Ingeniería de Software |
| Ciclo escolar | **2027/1** |
| Grupo | **6CM3** |
| Docente | **Ismael Rojas Mexicano** |
| Equipo | **ITHERA** |

## Visión del proyecto

ITHERA es una aplicación web de **planificación colaborativa de viajes**. Reúne en un solo espacio la gestión de viajes e integrantes, la exploración de vuelos y hospedajes, la búsqueda de lugares, los itinerarios por día, las propuestas y votaciones, los documentos y la comunicación en tiempo real. El proyecto permite estudiar y aplicar análisis de requisitos, diseño de software, servicios, integración, pruebas y trabajo colaborativo.

### ¿Qué problema resuelve?

Organizar un viaje grupal normalmente obliga a distribuir información entre chats, notas, enlaces, hojas de cálculo y conversaciones. ITHERA concentra esos elementos para que el grupo pueda consultar **qué está planeado, qué alternativas existen y qué falta decidir**.

### Funcionalidades principales

- **Viajes y personas:** crear viajes, unirse por invitación, administrar integrantes, roles y permisos.
- **Itinerario colaborativo:** organizar actividades por fechas y horarios, consultar mapas y programar subgrupos.
- **Explorar:** buscar vuelos, hoteles y lugares; consultar rutas y clima según la disponibilidad de los proveedores.
- **Decisiones:** comparar alternativas, crear propuestas, comentar y votar.
- **Documentos y comunicación:** compartir archivos, consultar notificaciones y coordinarse mediante chat y Socket.IO.
- **Checkout simulado:** representar la confirmación de vuelos u hospedajes **sin efectuar compras ni reservas reales**.
- **Presupuesto y gastos:** módulos existentes que forman parte del sistema compartido; su evolución funcional se distribuye entre los equipos del curso.

## Diseño del frontend

La interfaz se está modernizando siguiendo la dirección **Editorial Travel Atlas**: fotografía del destino, navegación contextual, tipografía editorial y paleta morado, azul y blanco. El trabajo se integra por etapas y mediante Pull Requests. El avance en `develop` puede diferir de `main` hasta cerrar una entrega estable.

## Arquitectura y tecnologías

| Capa | Tecnologías y servicios |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, TypeScript, Express |
| Datos y autenticación | Supabase (PostgreSQL y Auth) |
| Tiempo real | Socket.IO |
| Mapas, búsqueda de lugares y rutas | Google Maps Platform (Maps JavaScript, Places API New, Routes, Geocoding) |
| Búsqueda de vuelos | Duffel; integración Amadeus existente |
| Hoteles | LiteAPI |
| Clima | WeatherAPI en el flujo activo de rutas y clima |
| Correo | Resend |
| Calidad | GitHub Actions, Jest, TypeScript, lint y build |
| Despliegue | Vercel (frontend) y Render (backend) |

```text
Navegador (React/Vite)
    | HTTPS /api, autenticación y Socket.IO
    v
Backend (Express + TypeScript) ----> Supabase
    |                                 (Auth, PostgreSQL)
    +----> Google Maps Platform
    +----> Duffel / LiteAPI / Amadeus
    +----> WeatherAPI / Resend
```

Los servicios externos requieren credenciales y cuotas propias. La disponibilidad de un proveedor puede variar y no implica que se hayan efectuado reservas reales.

## Repositorio y documentación

```text
ITHERA/
├── .github/           # Workflows, CODEOWNERS y plantillas de PR
├── backend/           # API REST, servicios, integraciones y Socket.IO
├── frontend/          # Interfaz React, rutas, componentes y servicios
├── docs/              # Documentación técnica, funcional y académica
├── CONTRIBUTING.md    # Guía de colaboración
├── LICENSE            # Licencia MIT y atribuciones
└── README.md
```

Documentos útiles:

- [Backend: arquitectura y servicios](backend/README.md)
- [Frontend: páginas y componentes](frontend/README.md)
- [Índice de documentación](docs/README.md)
- [Endpoints](docs/api/endpoints.md)
- [Arquitectura](docs/architecture/README.md)
- [Guía de colaboración](CONTRIBUTING.md)
- [Despliegue actual](docs/DESPLIEGUE_ITHERA.md)
- [GitFlow](docs/gitflow/README.md)
- [Workflows](docs/workflows/README.md)

La documentación histórica y las evidencias de entregas previas permanecen en `docs/`; no deben confundirse con la configuración activa de despliegue.

## Instalación local

**Requisitos:** Node.js y npm compatibles con los `package.json` y `package-lock.json` actuales, más acceso autorizado a los servicios externos que se requieran probar.

Desde la raíz del repositorio:

```bash
# Backend
cp backend/.env.example backend/.env
npm --prefix backend ci
npm --prefix backend run dev

# En otra terminal: frontend
cp frontend/.env.example frontend/.env
npm --prefix frontend ci
npm --prefix frontend run dev
```

Configura los `.env` locales con las credenciales correspondientes; **no los agregues a Git**.

| Servicio local | URL |
| --- | --- |
| Frontend (Vite) | `http://localhost:5173` |
| Backend (Express) | `http://localhost:3001` |
| API REST | `http://localhost:3001/api` |
| Healthcheck | `http://localhost:3001/health` |

### Variables principales

| Frontend (`frontend/.env`) | Backend (`backend/.env`) |
| --- | --- |
| `VITE_API_URL` | `FRONTEND_URL` |
| `VITE_SUPABASE_URL` | `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | `SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY` |
| `VITE_GOOGLE_MAPS_BROWSER_KEY` | `GOOGLE_MAPS_API_KEY` |
| — | Duffel, LiteAPI, Amadeus, WeatherAPI, Resend |

Las variables `VITE_*` quedan incluidas en el código distribuido al navegador: **nunca pongas secretos del backend en ellas**. Restringe la clave pública de Google Maps por referentes y por API. Las claves del servidor deben almacenarse solo en Render o en los `.env` locales.

### Validación

```bash
npm --prefix backend run build
npm --prefix backend test -- --runInBand
npm --prefix frontend run lint
npm --prefix frontend run build
node --test frontend/tests/*.test.mjs
```

El comando de build de Render instala las dependencias de tipado necesarias durante la compilación: `npm ci --include=dev && npm run build`.

## Despliegue actual

| Componente | Entorno | URL | Rama |
| --- | --- | --- | --- |
| Aplicación web | Vercel | [ithera-theta.vercel.app](https://ithera-theta.vercel.app) | `develop` |
| API | Render | [ithera-backend.onrender.com](https://ithera-backend.onrender.com) | `develop` |
| Datos y sesión | Supabase | Proyecto privado, acceso controlado | — |

El despliegue actual es un **entorno de integración y pruebas**: nuevas funciones se verifican antes de considerarlas entrega final. Render Free puede entrar en reposo por inactividad. Para configuración, Google OAuth, redirecciones, CORS, claves, cuotas y chequeos consulta [la guía de despliegue](docs/DESPLIEGUE_ITHERA.md).

## Colaboración y ramas

- `develop`: integración de cambios aprobados y base del despliegue de pruebas.
- `main`: rama estable de referencia para la entrega, protegida contra merges directos no autorizados.
- `feat/*`, `fix/*`, `docs/*` y `chore/*`: ramas de trabajo creadas desde `develop`.
- Todo cambio se presenta mediante **Pull Request**, requiere revisión y debe pasar el CI correspondiente.
- No se incluyen `.env`, tokens, credenciales ni datos personales de usuarios en commits, logs, capturas o PR.

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para el procedimiento completo.

## Equipo de desarrollo actual

| Rol | Integrante |
| --- | --- |
| Scrum Master / Project Manager | **Yael Sangrador** |
| Arquitecto de Software / Lead Backend | **Elizabeth Flores** |
| Desarrollador Backend | **Axel Hernández** |
| Lead Frontend | **Daniel Manrique** |
| Desarrollador Frontend | **Roberto Morales** |
| Desarrollador Fullstack | **Diego Navarro** |

La lista anterior corresponde al equipo actual; el listado **Contributors** que genera GitHub representa el historial de commits y puede incluir participantes de versiones anteriores.

## Licencia y atribución

Distribuido bajo la **licencia MIT** indicada en [LICENSE](LICENSE). Se reconocen las aportaciones y avisos de derechos de autor correspondientes al proyecto original y a las modificaciones del equipo actual. Los avisos originales se conservan según las condiciones de la licencia.

---

**ITHERA · Ingeniería de Software · ESCOM-IPN · 2027/1 · Grupo 6CM3**
