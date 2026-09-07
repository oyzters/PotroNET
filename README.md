# PotroNET

Red social exclusiva para la comunidad estudiantil del **ITSON**. Los estudiantes se registran con su cuenta institucional y obtienen un espacio propio para publicar, organizarse por carrera y encontrarse entre semestres.

🔗 **[potronet.com](https://potronet.com)**

Este repositorio contiene el **cliente web**. La API vive en [PotroNET-API](https://github.com/oyzters/PotroNET-API) y el panel de administración en [PotroNET-Admin](https://github.com/oyzters/PotroNET-Admin).

## Qué incluye

- **Feed** con carga incremental, virtualización e indicador de publicaciones nuevas en vivo.
- **Historias** efímeras y publicaciones con imágenes (recorte y compresión en el navegador antes de subir).
- **Mensajería** directa entre estudiantes.
- **Perfiles y amistades**: onboarding, seguimiento, búsqueda de personas.
- **Profesores**: fichas y valoraciones.
- **Tutorías y recursos** compartidos por la comunidad.
- **Ranking** de participación.
- **Moderación**: reportes, lineamientos de comunidad y herramientas para el equipo.
- **Notificaciones** con preferencias por tipo.
- **Tema claro/oscuro** y ajustes persistentes por usuario.

## Stack

| Capa | Tecnología |
|------|-----------|
| UI | React 19, TypeScript estricto, Vite |
| Estilos | Tailwind CSS, shadcn/ui, Base UI, Radix |
| Estado de servidor | TanStack Query + TanStack Virtual |
| Animación | Framer Motion, GSAP |
| Backend | Supabase (Auth, Postgres con RLS, Storage) |
| Deploy | Vercel |

## Correr en local

Requiere Node 20+.

```bash
git clone https://github.com/oyzters/PotroNET.git
cd PotroNET
npm install
cp .env.example .env   # completa los valores de abajo
npm run dev
```

### Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase |
| `VITE_SUPABASE_ANON_KEY` | Llave pública (anon) de Supabase |
| `VITE_API_URL` | URL base de PotroNET-API |

### Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Chequeo de tipos (`tsc -b`) y build de producción |
| `npm run preview` | Sirve el build |
| `npm run lint` | ESLint |
| `npm run audit` | `npm audit` a partir de severidad moderada |

## Estructura

```
src/
├── pages/       # Una vista por ruta
├── components/  # UI compartida y componentes de dominio
├── contexts/    # Auth, tema, ajustes, toasts
├── hooks/       # Feed, historias, subida de media, roles
├── lib/         # Cliente de Supabase y utilidades
└── types/       # Tipos compartidos
```
