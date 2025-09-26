# Repository Guidelines

## Project Structure & Module Organization
- `frontend/` holds the Vite React app; feature folders (`src/features/*`) co-locate components, hooks, and utilities. Reusable UI lives under `src/components/ui` and shared helpers under `src/lib`.
- `backend/` contains the Express API with layered folders (`src/controllers`, `src/services`, `src/routes`, `src/middleware`). Prisma schema files live in `prisma/` with generated client output under `generated/`.
- `docs/` aggregates deployment, testing, and customization guides. Root-level `docker-compose.yml` orchestrates the local stack.

## Build, Test, and Development Commands
- `npm run dev --prefix frontend` — start the Vite dev server with HMR.
- `npm run build --prefix frontend` — create a production build and regenerate the service worker.
- `npm run dev --prefix backend` — run the Express server via nodemon (auto restarts on changes).
- `npm run prisma:generate --prefix backend` — regenerate Prisma client after schema updates or provider changes.
- `npm test --prefix frontend` / `npm test --prefix backend` — execute Vitest and Jest suites respectively.

## Coding Style & Naming Conventions
- JavaScript uses ES modules (frontend) and CommonJS (backend) with 2-space indentation.
- Favor descriptive camelCase for variables/functions and PascalCase for React components (`QuickCheckIn.jsx`).
- Tailwind utility-first styling is the default; shared class helpers belong in `src/lib/cn.js`.
- ESLint (frontend) and Prettier defaults from Vite should run before committing (`npm run lint --prefix frontend`).

## Testing Guidelines
- Frontend tests live beside components under `__tests__` using Vitest + RTL; name files `Component.test.jsx`.
- Backend uses Jest + Supertest (`src/tests/*.test.js`). Keep tests deterministic and reset DB state when adding integration coverage.
- Run both suites before opening a PR; aim to cover new business logic with unit tests.

## Commit & Pull Request Guidelines
- Use present-tense, imperative commit messages (e.g., `Add booking waitlist service`). Group related changes logically.
- PRs should summarize scope, reference related issues, and include screenshots or CLI output for UI/build changes. Note testing done (`npm test`, `docker compose up`) in the description.

## Security & Configuration Tips
- Never commit `.env` files; copy from `.env.example` per workspace and inject secrets through your runtime.
- When switching to PostgreSQL, set `DATABASE_PROVIDER=postgresql` and run `npm run prisma:deploy --prefix backend` before deploying.
- Uploaded assets land under `backend/uploads/`; mount persistent storage in production Docker deployments.
