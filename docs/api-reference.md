# API Reference

OpenAPI spec is available at `backend/docs/openapi.yaml`. Import into Swagger UI or Postman.

## Key Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Service health check |
| POST | `/api/v1/auth/login` | Authenticate user and issue tokens |
| POST | `/api/v1/auth/refresh` | Renew access token using refresh cookie |
| POST | `/api/v1/bookings` | Create booking with segments and services |
| PATCH | `/api/v1/bookings/{id}/status` | Update booking status |
| POST | `/api/v1/bookings/quick-check-in` | Rapid check-in workflow |
| GET | `/api/v1/pets` | List pets with owners & vaccinations |
| POST | `/api/v1/pets/{id}/vaccinations` | Record vaccination |
| GET | `/api/v1/payments` | List captured payments |
| GET | `/api/v1/reports/dashboard` | Aggregate metrics for dashboard |
| GET | `/api/v1/tenants/current/plan` | Return plan, flags, and derived features |
| GET | `/api/v1/tenants/current/onboarding` | Calculated onboarding checklist + plan summary |
| PATCH | `/api/v1/tenants/current/onboarding` | Toggle onboarding dismissal (owner/admin) |
| PUT | `/api/v1/tenants/current/theme` | Update tenant theming |

Tenant-aware endpoints require the `X-Tenant` header (or a mapped subdomain/custom domain) plus valid authentication.
