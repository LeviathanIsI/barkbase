# Data Migration & Import

## Switching SQLite → PostgreSQL
1. Set `DATABASE_PROVIDER=postgresql`
2. Update `DATABASE_URL` (e.g., `postgresql://user:password@host:5432/barkbase`)
3. Run `npm run prisma:generate --prefix backend`
4. Apply migrations: `npm run prisma:deploy --prefix backend`

## Seed Data
- Create `backend/prisma/seed.js` (placeholder) and call via `npm run db:seed`
- Use `@faker-js/faker` (already installed) for generating tenants, pets, bookings

## Backup Strategies
- SQLite: zipped copy of `dev.db` plus uploaded assets
- PostgreSQL: schedule `pg_dump` or managed backups; store in secure bucket

## Data Export
- Implement API endpoints or CLI to export pets/bookings into CSV/JSON via Prisma queries
- For large datasets, stream results to avoid memory spikes

## Import from Competitors
- Map CSV columns to Prisma models (owners → pets via `PetOwner` join table)
- Validate `tenantId` assignments to maintain isolation
- Utilize offline queue if performing staged imports while system live
