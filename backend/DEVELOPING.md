# Backend Development Guide

## Database connections

The API uses Supabase Postgres for every environment. Connection behaviour is environment-driven:

| Environment | URL source            | Host / Port | Notes                               |
|-------------|-----------------------|-------------|-------------------------------------|
| development | `DEV_DATABASE_URL`    | `db.<project>.supabase.co:5432` | Direct Postgres connection for local development. |
| production / staging | `PROD_DATABASE_URL` | `aws-*-*.pooler.supabase.com:6543` | PgBouncer transaction pooler for scalability. |
| migrations / shadow | `DIRECT_URL`, `SHADOW_DATABASE_URL` | `db.<project>.supabase.co:5432` | Always run migrations against the direct Postgres endpoint. |

All URLs must include `sslmode=require`. PgBouncer URLs should also set `pgbouncer=true&connection_limit=1`.

## Environment variables

Update `backend/.env` (and CI secrets) with:

```ini
SUPABASE_DB_NAME=postgres
SUPABASE_SSLMODE=require

# Local development
DEV_DATABASE_URL="postgresql://postgres:<pwd>@db.<project>.supabase.co:5432/${SUPABASE_DB_NAME}?sslmode=${SUPABASE_SSLMODE}"

# Production / staging
PROD_DATABASE_URL="postgresql://postgres.<poolerUser>:<pwd>@aws-<region>.pooler.supabase.com:6543/${SUPABASE_DB_NAME}?sslmode=${SUPABASE_SSLMODE}&pgbouncer=true&connection_limit=1"

# Prisma migrations
DIRECT_URL="postgresql://postgres:<pwd>@db.<project>.supabase.co:5432/${SUPABASE_DB_NAME}?sslmode=${SUPABASE_SSLMODE}"
SHADOW_DATABASE_URL="postgresql://postgres:<pwd>@db.<project>.supabase.co:5432/${SUPABASE_DB_NAME}?sslmode=${SUPABASE_SSLMODE}"
```

On boot the app selects `DEV_DATABASE_URL` when `NODE_ENV !== 'production'`, otherwise `PROD_DATABASE_URL`.

## Local development workflow

1. Ensure `DEV_DATABASE_URL`, `DIRECT_URL`, and `SHADOW_DATABASE_URL` are set to the direct Postgres endpoint (`db.<project>.supabase.co:5432`).
2. Start the API:
   ```bash
   npm run dev
   ```
   Startup logs include the masked database host/port and a PASS/FAIL health check.
3. Verify the database:
   ```bash
   npm run db:health
   # PASS db.<project>.supabase.co:5432 (pooler=false)
   ```
4. Application readiness:
   - `GET /health/db` returns `{ ok: true }` when the DB round-trip succeeds.
   - `GET /health/ready` returns `{ ok: true }` after the server finishes bootstrapping and the DB is healthy.

## Production / staging deployment

1. Run migrations prior to starting the app:
   ```bash
   npm run migrate:deploy
   ```
   Ensure `DIRECT_URL` / `SHADOW_DATABASE_URL` are available in the environment (CI/CD should inject them).
2. Start the API with `NODE_ENV=production`. The service will automatically use `PROD_DATABASE_URL` (PgBouncer `:6543`).
3. Startup fails fast if the pooler cannot be reached. Example message:
   ```
   Prod DB unreachable (pooler 6543). Open port 6543 or deploy where it is reachable.
   ```

## Connectivity troubleshooting

- Use `npm run db:health` to validate connectivity and credentials. It prints `PASS/FAIL` with host and port.
- On Windows you can inspect connectivity with:
  ```powershell
  Test-NetConnection -ComputerName aws-1-us-east-1.pooler.supabase.com -Port 6543
  ```
- For local development, ensure firewalls allow outbound TCP `5432`. Production must allow `6543`.
- Check that `sslmode=require` is present on every URL (Supabase rejects non-SSL connections).

## Graceful shutdown

The server traps `SIGINT`/`SIGTERM`, stops accepting requests, disconnects Prisma, and exits once cleanup completes (10s timeout).
