# BarkBase Kennel Management System

Full-stack platform for multi-tenant kennel management with offline-ready React frontend and Express/Prisma backend.

## Project Layout

- `frontend/` – Vite + React app with Tailwind theming, React Query, Zustand, PWA support.
- `backend/` – Express API with Prisma ORM, SQLite/PostgreSQL support, Socket.IO, and scheduled jobs.
- `docs/` – Deployment, customization, troubleshooting, and user-facing guides.
- `docker-compose.yml` – Local orchestration for frontend, backend, and PostgreSQL.

## Quick Start

```bash
# install dependencies
npm install --prefix frontend
npm install --prefix backend

# generate prisma client (required before backend start)
npm run prisma:generate --prefix backend

# apply tenant-aware migrations and backfill existing data
npm run migrate:dev --prefix backend
npm run backfill:tenants --prefix backend

# run dev servers
npm run dev --prefix backend
npm run dev --prefix frontend
```

Visit `http://localhost:5173` (frontend) and `http://localhost:4000/health` (backend).

## Docker

```bash
docker compose up --build
```

This spins up:
- Frontend at `http://localhost:5173`
- Backend API at `http://localhost:4000`
- PostgreSQL at `localhost:5432`

## Documentation Map

- [Frontend guide](frontend/README.md)
- [Backend guide](backend/README.md)
- [Deployment scenarios](docs/deployment.md)
- [User workflow handbook](docs/user-guide.md)
- [White-label customization](docs/white-labeling.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Testing strategy](docs/testing.md)
- [Data migration & import](docs/migrations.md)

## Testing

```bash
npm test --prefix frontend
npm test --prefix backend
```

## Additional Notes

- Default storage uses SQLite; switch to Postgres by exporting `DATABASE_PROVIDER=postgresql` and updating `DATABASE_URL`.
- Offline queueing, service worker caching, and optimistic UI updates are wired in the frontend.
- Uploaded media is stored under `backend/uploads/` (mounted volume in Docker).
- Multi-tenant context is resolved via subdomain (e.g., `acme.myapp.local`) or `X-Tenant` header. Configure tenancy defaults with:
  - `TENANT_DEFAULT_SLUG` – fallback slug when no host/header hint is present.
  - `BASE_DOMAIN` – base domain used for subdomain parsing (e.g., `myapp.local`).
  - `TENANT_ALLOWED_HOSTS` – comma-separated hosts that should not be treated as tenant slugs (defaults to `localhost,127.0.0.1`).
