# Troubleshooting

## Prisma Client Errors
- Run `npm run prisma:generate --prefix backend` after editing schema
- Ensure `DATABASE_URL` points to existing SQLite file or reachable Postgres
- Delete `backend/generated` and regenerate if mismatched providers

## Auth Failures
- Verify tenant context headers: send `x-tenant-id` in API requests during development
- JWT secrets must match between sessions; delete cookies to reset

## CORS Blocks
- Add frontend origin to `CORS_ALLOWED_ORIGINS`
- When using Docker, set origin to the public hostname (e.g., `http://localhost:5173`)

## Socket.IO Disconnects
- Check proxy configuration for WebSocket upgrades
- In multi-instance deployments, configure Redis adapter for socket rooms

## Offline Queue Not Flushing
- Ensure service worker is registered (check Application tab)
- IndexedDB entries can be inspected under `barkbase-offline → pending-requests`
- If queue stuck, delete store manually and retry

## File Upload Issues
- Supported mime types: JPEG, PNG, WebP, PDF
- Max size 10 MB; adjust in `src/lib/uploads.js`
- Ensure `uploads` directory has write permissions (or mount persistent volume)
