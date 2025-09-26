# Backend (Express + Prisma)

## Features
- Express 4 with layered routing (`controllers`, `services`, `validators`)
- Prisma ORM with multi-tenant schema, SQLite default and PostgreSQL via env
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
npm run prisma:generate
npm run dev
```

Default server runs on `http://localhost:4000` with `/api/v1` namespace.

### Environment Files

Copy `.env.example` to `.env`. Key variables:

- `DATABASE_URL` – `file:./dev.db` (SQLite) or Postgres connection string
- `DATABASE_PROVIDER` – `sqlite` or `postgresql` (auto-selects Prisma schema)
- `JWT_SECRET`, `JWT_REFRESH_SECRET` – token secrets
- `CORS_ALLOWED_ORIGINS` – comma-separated whitelist
- `UPLOADS_ROOT` – file system storage root (mounted volume in Docker)

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Nodemon server with env reload |
| `npm run start` | Production start |
| `npm run prisma:generate` | Generate Prisma client (auto-switches schema) |
| `npm run prisma:migrate` | `prisma migrate dev` with schema auto-selection |
| `npm run prisma:deploy` | `prisma migrate deploy` |
| `npm run db:push` | `prisma db push` |
| `npm run db:seed` | Placeholder for seeding script |
| `npm test` | Jest + Supertest suite |

### Database Switching

`scripts/run-prisma.js` inspects `DATABASE_PROVIDER`/`DATABASE_URL` to pick the correct schema (`schema.prisma` for SQLite, `schema.postgres.prisma` for Postgres). Use `npm run prisma:generate` to refresh the client after changing providers.

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
