# Deployment Guide

## Local Development
- Install dependencies in `frontend/` and `backend/`
- Run both dev servers or use `docker compose up --build`
- Default stack: React dev server, Express API with SQLite

## Docker Compose
```
docker compose up --build
```
- Frontend served by Nginx on port 5173
- Backend Node process on port 4000
- PostgreSQL with persisted volume `postgres-data`

## Production Recommendations
- Build frontend image and serve via CDN or edge cache
- Deploy backend container behind TLS-terminating proxy (e.g., Traefik, Nginx)
- Use managed PostgreSQL (e.g., RDS, Cloud SQL) with automated backups
- Run migrations on release job: `npm run prisma:deploy --prefix backend`
- Configure environment secrets via platform-specific secret manager
- Attach persistent storage (e.g., S3, Azure Blob) for uploads instead of local disk

## Infrastructure Checklist
- HTTPS termination with automatic certificate renewal
- Health probes hitting `/health`
- Horizontal scaling for backend with Socket.IO adapter (Redis) if multiple instances
- Centralized logging (e.g., ELK, Datadog) consuming Pino JSON logs
- Metrics & tracing (OpenTelemetry) attached to Express server
