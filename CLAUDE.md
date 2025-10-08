# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BarkBase is a full-stack multi-tenant kennel management system with an offline-ready React frontend and Express/Prisma backend. Key architectural patterns include tenant isolation, optimistic UI updates, and PWA capabilities.

## Development Commands

### Initial Setup
```bash
# Install dependencies for both frontend and backend
npm install --prefix frontend
npm install --prefix backend

# Generate Prisma client (required before backend start)
npm run prisma:generate --prefix backend

# Apply migrations and backfill tenant data
npm run migrate:dev --prefix backend
npm run backfill:tenants --prefix backend
```

### Development Servers
```bash
# Run backend (http://localhost:4000)
npm run dev --prefix backend

# Run frontend (http://localhost:5173)
npm run dev --prefix frontend

# Or use Docker Compose
docker compose up --build
```

### Testing
```bash
# Run all backend tests
npm test --prefix backend

# Run specific backend test file
npm test --prefix backend -- src/tests/booking.service.test.js

# Run all frontend tests
npm test --prefix frontend

# Run frontend tests in watch mode
npm test --prefix frontend -- --watch
```

### Prisma Commands
```bash
# Generate Prisma client (auto-switches schema based on DATABASE_PROVIDER)
npm run prisma:generate --prefix backend

# Apply migrations (development)
npm run prisma:migrate --prefix backend

# Deploy migrations (production)
npm run prisma:deploy --prefix backend

# Push schema changes without migrations (SQLite)
npm run db:push --prefix backend

# Open Prisma Studio
npm run prisma:studio --prefix backend
```

### Build Commands
```bash
# Build frontend for production
npm run build --prefix frontend

# Preview frontend build
npm run preview --prefix frontend

# Backend does not require build (node server)
```

### Linting
```bash
npm run lint --prefix backend
npm run lint --prefix frontend
```

## Architecture

### Multi-Tenancy System

The application uses a **tenant-aware** architecture where all data is isolated by `tenantId`:

1. **Tenant Resolution** (`backend/src/middleware/tenantResolver.js`):
   - Extracts tenant from subdomain (e.g., `acme.myapp.local`)
   - Or from `X-Tenant` header
   - Or from custom domain mapping
   - Falls back to `TENANT_DEFAULT_SLUG` env var

2. **Tenant Context** (`backend/src/middleware/tenantContext.js`):
   - Loads full tenant record from database
   - Caches tenants for 5 minutes
   - Sets `req.tenant`, `req.tenantId`, `req.tenantSlug`

3. **Tenant-Scoped Prisma** (`backend/src/lib/tenantPrisma.js`):
   - Use `forTenant(tenantId)` to create scoped Prisma client
   - Automatically filters all queries by tenantId
   - Prevents cross-tenant data access
   - **Critical**: Always use `forTenant()` in services, never raw `prisma`

Example:
```javascript
const { forTenant } = require('../lib/tenantPrisma');

async function getBookings(tenantId) {
  const db = forTenant(tenantId);
  // This query is automatically scoped to tenantId
  return db.booking.findMany({ where: { status: 'CONFIRMED' } });
}
```

### Authentication & Authorization

- JWT-based auth with access + refresh tokens
- Access tokens in `Authorization: Bearer` header OR `accessToken` cookie
- Refresh tokens in `refreshToken` httpOnly cookie
- CSRF protection for non-GET requests via `X-CSRF-Token` header
- Role-based access control: `OWNER`, `ADMIN`, `STAFF`, `READONLY`

**Middleware Stack** (`backend/src/middleware/requireAuth.js`):
1. Extract token from header or cookie
2. Verify JWT and extract `tenantId`, `membershipId`, `sub` (userId)
3. Validate token's `tenantId` matches `req.tenantId`
4. Load membership from database
5. Set `req.user` with role and membership info
6. Check role against allowed roles if specified

### Backend Structure

```
backend/src/
  controllers/     # Request handlers, input validation
  services/        # Business logic (use forTenant() here)
  routes/          # Express route definitions
  middleware/      # Auth, tenant, CSRF, error handling
  validators/      # Joi/express-validator schemas
  lib/             # Utilities (uploads, socket, mailer, tenantPrisma)
  jobs/            # Scheduled tasks (vaccination reminders)
  config/          # Environment and Prisma setup
  tests/           # Jest test suites
```

**Key patterns**:
- Controllers handle HTTP concerns, call services
- Services contain business logic and use `forTenant(tenantId)` for DB access
- All tenant-scoped routes require `tenantContext` middleware before `requireAuth`

### Frontend Structure

```
frontend/src/
  app/             # Router, providers, protected routes
  features/        # Feature-based modules (bookings, pets, auth, etc.)
  components/      # Shared UI components (layout, primitives)
  stores/          # Zustand stores (auth, tenant, bookings, ui)
  lib/             # API client, offline queue, theme utilities
  hooks/           # Cross-feature hooks (offline detection)
```

**Key patterns**:
- Feature folders contain routes, components, API calls specific to that domain
- Zustand stores for client state (auth, tenant, UI)
- React Query (`@tanstack/react-query`) for server state
- `apiClient` automatically adds tenant headers, handles token refresh, queues requests when offline

### Offline Architecture

1. **Service Worker** (via `vite-plugin-pwa`):
   - Caches app shell and API responses
   - Workbox runtime caching

2. **Offline Queue** (`frontend/src/lib/offlineQueue.js`):
   - Stores failed mutating requests in IndexedDB
   - `flushQueue()` retries when connection restored
   - `apiClient` automatically enqueues on network errors

3. **Optimistic Updates**:
   - React Query mutations update cache before server response
   - Rollback on failure

### State Management

- **Zustand stores** (auth, tenant, bookings, ui):
  - `authStore`: accessToken, user, role, login/logout
  - `tenantStore`: current tenant info, theme
  - `bookingStore`: calendar view state
  - `uiStore`: sidebar, modals, offline status

- **React Query**:
  - Server state caching and synchronization
  - Query keys in `frontend/src/lib/queryKeys.js`
  - Optimistic mutations for bookings, payments, pets

### Database Schema Switching

The backend supports **SQLite** (default) and **PostgreSQL**:

- Set `DATABASE_PROVIDER=sqlite` or `postgresql` in `.env`
- `scripts/run-prisma.js` auto-selects `schema.prisma` (SQLite) or `schema.postgres.prisma`
- Run `npm run prisma:generate --prefix backend` after changing provider

### Socket.IO Real-time Events

- Backend broadcasts booking lifecycle events via Socket.IO
- Frontend connects and listens for updates in relevant components
- Used for live calendar updates across multiple users

## Important Environment Variables

### Backend (.env in backend/)
- `DATABASE_URL`: SQLite path or Postgres connection string
- `DATABASE_PROVIDER`: `sqlite` or `postgresql`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`: Token signing secrets
- `TENANT_DEFAULT_SLUG`: Fallback tenant (default: `default`)
- `TENANT_ALLOWED_HOSTS`: Comma-separated hosts not treated as tenants (default: `localhost,127.0.0.1`)
- `BASE_DOMAIN`: Base domain for subdomain parsing (e.g., `myapp.local`)
- `CORS_ALLOWED_ORIGINS`: Comma-separated frontend origins
- `UPLOADS_ROOT`: File storage root (default: `./uploads`)

### Frontend (.env in frontend/)
- `VITE_API_URL`: Backend URL (default: `http://localhost:4000`)
- `VITE_PORT`: Dev server port (default: `5173`)

## Testing Strategy

### Backend Tests
- **Jest + Supertest** for integration tests
- `backend/src/tests/setup.js`: Test environment configuration
- `backend/src/tests/utils/testSeed.js`: Test data factories
- Tests verify tenant isolation, auth flows, business logic
- Run tests with `npm test --prefix backend`

### Frontend Tests
- **Vitest + React Testing Library**
- `frontend/src/test/setupTests.js`: Test setup
- Component tests, route tests, integration tests
- Mock API calls with MSW when needed
- Run tests with `npm test --prefix frontend`

## Common Patterns

### Adding a New Tenant-Scoped API Endpoint

1. **Create validator** in `backend/src/validators/`:
```javascript
const Joi = require('joi');
exports.createFooSchema = Joi.object({
  name: Joi.string().required(),
});
```

2. **Create service** in `backend/src/services/`:
```javascript
const { forTenant } = require('../lib/tenantPrisma');

exports.createFoo = async (tenantId, data) => {
  const db = forTenant(tenantId);
  return db.foo.create({ data });
};
```

3. **Create controller** in `backend/src/controllers/`:
```javascript
const fooService = require('../services/foo.service');

exports.createFoo = async (req, res) => {
  const foo = await fooService.createFoo(req.tenantId, req.body);
  res.status(201).json(foo);
};
```

4. **Create route** in `backend/src/routes/`:
```javascript
const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const tenantContext = require('../middleware/tenantContext');
const { validate } = require('../middleware/validate');
const { createFooSchema } = require('../validators/foo.validator');
const fooController = require('../controllers/foo.controller');

const router = express.Router();
router.use(tenantContext);
router.post('/', requireAuth(['ADMIN']), validate(createFooSchema), fooController.createFoo);

module.exports = router;
```

5. **Register route** in `backend/src/app.js`:
```javascript
const fooRoutes = require('./routes/foo.routes');
app.use('/api/v1/foos', fooRoutes);
```

### Adding a Frontend Feature

1. Create feature folder: `frontend/src/features/foos/`
2. Add API calls: `frontend/src/features/foos/api.js`
3. Add components: `frontend/src/features/foos/components/`
4. Add routes: `frontend/src/features/foos/routes/`
5. Register routes in `frontend/src/app/router.jsx`
6. Add query keys to `frontend/src/lib/queryKeys.js`

## Database Migrations

Always generate migrations when changing schema:

```bash
# Edit schema.prisma (and schema.postgres.prisma if using Postgres)
# Generate migration
npm run prisma:migrate --prefix backend
# Name your migration descriptively (e.g., "add_foo_table")
```

For multi-database support:
- Keep both `schema.prisma` and `schema.postgres.prisma` in sync
- Test migrations on both databases before deploying

## File Uploads

- Handled by `backend/src/lib/uploads.js` and `backend/src/lib/imageProcessor.js`
- Files stored at `uploads/<tenantId>/<YYYY-MM-DD>/`
- Images auto-generate 320px WebP thumbnails
- Access via `/uploads/:tenantId/:date/:filename`
- **Critical**: Always scope uploads by tenantId to prevent cross-tenant access

## Scheduled Jobs

- Defined in `backend/src/jobs/`
- Use `node-cron` for scheduling
- Vaccination reminders run daily at 06:15
- Jobs are initialized in `backend/src/index.js`

## Deployment Notes

- Frontend builds to static assets, serve with Nginx/Caddy
- Backend runs as Node.js process (PM2, Docker, etc.)
- Ensure `DATABASE_URL` points to production database
- Set secure `JWT_SECRET` and `JWT_REFRESH_SECRET`
- Configure `CORS_ALLOWED_ORIGINS` for production frontend URLs
- Mount persistent volume for `UPLOADS_ROOT`
- See `docs/deployment.md` for detailed deployment scenarios
