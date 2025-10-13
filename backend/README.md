# Backend (Express + Prisma)

## Features
- Express 4 with layered routing (`controllers`, `services`, `validators`)
- Prisma ORM with multi-tenant schema backed by Supabase Postgres
- JWT auth + refresh tokens (cookies), bcrypt hashing, role-based middleware
- Tenant resolution from host/subdomain with cache
- Multer + Sharp for tenant-scoped uploads and thumbnails
- Nodemailer abstraction for SMTP/JSON providers
- Socket.IO broadcasting for booking lifecycle events
- cron-driven vaccination reminder emails
- First-run onboarding checklist + plan summary endpoints

## Setup

```bash
npm install
npm run migrate:deploy   # optional locally if schema changes
npm run dev
```

The server listens on `http://localhost:4000` with `/api/v1` routes.

### Prisma Client & Database

- Prisma is configured once in `src/lib/prisma.js` and connects to Supabase.
- The connection string is selected automatically:
  - `DEV_DATABASE_URL` (direct 5432) when `NODE_ENV !== 'production'`
  - `PROD_DATABASE_URL` (PgBouncer 6543) when `NODE_ENV === 'production'`
- `DIRECT_URL` / `SHADOW_DATABASE_URL` always point to the direct database for migrations.
- On startup we run a health check and fail fast if the database is unavailable.

### Environment Files

Copy `.env.example` to `.env` and fill in the Supabase credentials:

- `DEV_DATABASE_URL` – direct Postgres (`db.<project>.supabase.co:5432`)
- `PROD_DATABASE_URL` – PgBouncer pooler (`aws-*.pooler.supabase.com:6543`)
- `DIRECT_URL`, `SHADOW_DATABASE_URL` – direct Postgres for Prisma migrations
- `SUPABASE_DB_NAME`, `SUPABASE_SSLMODE` – keep `postgres` / `require`
- The rest of the app settings (`JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, etc.) remain unchanged.

See [DEVELOPING.md](./DEVELOPING.md) for the full matrix and troubleshooting tips.

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Nodemon watcher using the development Supabase connection |
| `npm run start` | Production start (requires `PROD_DATABASE_URL`) |
| `npm run build` | Generate Prisma client and run build checks |
| `npm run migrate:deploy` | `prisma migrate deploy` against the direct Postgres endpoint |
| `npm run db:health` | One-off database health probe (prints PASS/FAIL with host:port) |
| `npm run prisma:generate` | Regenerate the Prisma client |
| `npm run db:seed` | Seed helper (wraps `scripts/run-prisma.js db seed`) |
| `npm test` | Jest + Supertest suite |

### API Surface (initial)

- `GET /health`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/logout`
- `GET /api/v1/bookings`
- `POST /api/v1/bookings`
- `PATCH /api/v1/bookings/:bookingId/status`
- `POST /api/v1/bookings/quick-check-in`
- `GET /api/v1/pets`
- `POST /api/v1/pets`
- `PUT /api/v1/pets/:petId`
- `POST /api/v1/pets/:petId/vaccinations`
- `POST /api/v1/pets/:petId/photo`
- `GET /api/v1/payments`
- `POST /api/v1/payments`
- `GET /api/v1/reports/dashboard`
- `GET /api/v1/tenants/current`
- `GET /api/v1/tenants/current/plan`
- `GET /api/v1/tenants/current/onboarding`
- `PATCH /api/v1/tenants/current/onboarding`
- `PUT /api/v1/tenants/current/theme`
- `PUT /api/v1/tenants/features`

See `docs/api-reference.md` and `backend/docs/openapi.yaml` for details.

All tenant-scoped requests must include the `X-Tenant` header (or originate from a mapped subdomain/custom domain) in addition to valid authentication cookies or Bearer tokens.

### Testing

`npm test` executes Jest with Supertest. The sample `health.test.js` verifies the health endpoint. Extend with domain-specific tests (bookings, auth, etc.) once data seeding is added.

### File Uploads

- Files saved under `uploads/<tenantId>/<YYYY-MM-DD>/`
- `sharp` generates 320px `.webp` thumbnails used in the frontend

### Scheduled Jobs

`src/jobs/vaccinationReminders.js` sends email reminders at 06:15 daily (cron). Adjust cron string and provider credentials as needed.

### Future Enhancements

- Seed scripts populating demo tenants/pets via Prisma factories
- Additional API coverage (waitlist, incidents, services)
- Integration with 2FA providers and audit logging sinks
- Swagger UI generation from `openapi.yaml`
