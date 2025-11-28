# API & Routing Design

This document describes the HTTP API Gateway and routing architecture for BarkBase Dev v2.

**Phase:** 4 of BarkBase Dev v2 Rebuild  
**Last Updated:** Phase 4 implementation

---

## Overview

BarkBase uses a single **HTTP API** (API Gateway v2) that routes all REST requests to domain-specific Lambda functions. This design provides:

- **Single entry point** for all API traffic
- **Domain-based routing** to Lambda integrations
- **Consistent CORS handling** across all endpoints
- **Scalable architecture** with one Lambda per domain

### Key Design Decisions

1. **HTTP API vs REST API**: Using HTTP API (API Gateway v2) for lower latency and cost
2. **One Lambda per domain**: Each business domain has a single Lambda that handles all routes for that domain
3. **No authorization yet**: `AuthorizationType: NONE` for now (TODO: Add JWT/Cognito authorizer)
4. **Proxy routes**: Using `{proxy+}` for sub-paths where the Lambda handles internal routing

---

## HTTP API Configuration

| Property | Value |
|----------|-------|
| API Name | `barkbase-dev-api` |
| API Type | HTTP API (v2) |
| Protocol | HTTPS |
| Integrations | 11 Lambda integrations |
| Routes | ~60+ route definitions |

### CORS Configuration

```typescript
corsPreflight: {
  allowOrigins: ['*'],  // TODO: Tighten for production
  allowMethods: [GET, POST, PUT, PATCH, DELETE, OPTIONS],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Requested-With', 'X-User-Id', 'X-User-Role'],
  maxAge: Duration.hours(1),
}
```

> **TODO:** For production, replace `allowOrigins: ['*']` with specific frontend domains.

---

## Route Mapping

### Auth Routes → `authIntegration`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/logout` | User logout |
| POST | `/api/v1/auth/refresh` | Token refresh |
| POST | `/api/v1/auth/signup` | User registration |

**Lambda Source:** `aws/lambdas/auth-api/index.ts`

---

### User Profile Routes → `userProfileIntegration`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/users/profile` | Get current user profile |
| POST | `/api/v1/users/password` | Change password |

**Lambda Source:** `aws/lambdas/user-profile-service/index.ts`

---

### Roles & Permissions Routes → `rolesConfigIntegration`

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/api/v1/roles` | Role CRUD |
| GET/POST | `/api/v1/roles/{proxy+}` | Role details/actions |
| GET/POST/PATCH | `/api/v1/user-permissions/{proxy+}` | User permission management |

**Lambda Source:** `aws/lambdas/roles-config-service/index.ts`

---

### Tenants & Memberships Routes → `tenantsIntegration`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/tenants` | List/search tenants |
| GET | `/api/v1/tenants/current` | Get current tenant |
| GET | `/api/v1/tenants/current/plan` | Get tenant plan |
| GET | `/api/v1/tenants/current/onboarding` | Get onboarding status |
| GET | `/api/v1/tenants/current/theme` | Get tenant theme |
| POST | `/api/v1/tenants/{proxy+}` | Tenant actions |
| GET/POST/PUT | `/api/v1/memberships/{proxy+}` | Membership management |

**Lambda Source:** `aws/lambdas/tenants-memberships-service/index.ts`

---

### Entity Routes → `entityIntegration`

#### Pets

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/api/v1/pets` | Pet CRUD |
| GET | `/api/v1/pets/vaccinations/expiring` | Expiring vaccinations |
| GET | `/api/v1/pets/medical-alerts` | Medical alerts |
| POST | `/api/v1/pets/owners` | Link pet to owner |
| GET/PUT/DELETE | `/api/v1/pets/{proxy+}` | Pet details, vaccinations |

#### Owners

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/api/v1/owners` | Owner CRUD |
| GET/PUT/DELETE | `/api/v1/owners/{proxy+}` | Owner details, pets |

#### Staff

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/api/v1/staff` | Staff CRUD |
| GET/PUT/DELETE | `/api/v1/staff/{proxy+}` | Staff details |

**Lambda Source:** `aws/lambdas/entity-service/index.ts`

---

### Operations Routes → `operationsIntegration`

#### Bookings

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/api/v1/bookings` | Booking CRUD |
| GET/POST/PUT/DELETE | `/api/v1/bookings/{proxy+}` | Booking details, check-in/out |

#### Check-ins/Check-outs

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/api/v1/check-ins` | Check-in list |
| GET/PATCH/DELETE | `/api/v1/check-ins/{proxy+}` | Check-in details |
| GET/POST/PUT/DELETE | `/api/v1/check-outs` | Check-out list |
| GET/PATCH/DELETE | `/api/v1/check-outs/{proxy+}` | Check-out details |

#### Kennels & Runs

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/api/v1/kennels` | Kennel management |
| GET | `/api/v1/kennels/occupancy` | Kennel occupancy |
| GET/PUT | `/api/v1/kennels/{proxy+}` | Kennel details |
| GET/POST/PUT/DELETE | `/api/v1/runs` | Run management |
| GET | `/api/v1/runs/assignments` | Run assignments |
| GET/POST/DELETE | `/api/v1/runs/{proxy+}` | Run details |
| POST | `/api/v1/run-templates/{proxy+}` | Run templates |

**Lambda Source:** `aws/lambdas/operations-service/index.ts`

---

### Config Routes → `configIntegration`

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/api/v1/services` | Service definitions |
| DELETE | `/api/v1/services/{proxy+}` | Delete service |
| GET/POST/PATCH | `/api/v1/facility/{proxy+}` | Facility config |
| POST/PUT | `/api/v1/packages/{proxy+}` | Package management |
| PUT/DELETE | `/api/v1/account-defaults/{proxy+}` | Account defaults |

**Lambda Source:** `aws/lambdas/config-service/index.ts`

---

### Features Routes → `featuresIntegration`

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/api/v1/tasks` | Task management |
| GET/PUT/DELETE | `/api/v1/tasks/{proxy+}` | Task details |
| GET/POST/PUT/DELETE | `/api/v1/communications` | Communications |
| GET/PATCH | `/api/v1/communications/{proxy+}` | Communication details |
| GET/POST/PUT/DELETE | `/api/v1/incidents` | Incident reports |
| POST/DELETE | `/api/v1/incidents/{proxy+}` | Incident details |
| GET/POST/PUT/DELETE | `/api/v1/notes` | Notes |
| POST/DELETE | `/api/v1/notes/{proxy+}` | Note details |
| GET/POST/PUT/DELETE | `/api/v1/messages` | Messages |
| GET/PUT | `/api/v1/messages/{proxy+}` | Message details |
| GET/POST/PUT/DELETE | `/api/v1/invites` | Invites |
| GET/POST/PATCH | `/api/v1/invites/{proxy+}` | Invite details |
| PUT/PATCH | `/api/v1/segments/{proxy+}` | Segments |

**Lambda Source:** `aws/lambdas/features-service/index.ts`

---

### Financial Routes → `financialIntegration`

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/v1/payments` | Payment processing |
| GET/POST | `/api/v1/invoices` | Invoice management |
| POST | `/api/v1/invoices/generate/{bookingId}` | Generate invoice |
| GET | `/api/v1/billing/metrics` | Billing metrics |

**Lambda Source:** `aws/lambdas/financial-service/index.ts`

---

### Analytics Routes → `analyticsIntegration`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/dashboard/stats` | Dashboard statistics |
| GET | `/api/v1/dashboard/today-pets` | Today's pets |
| GET | `/api/v1/dashboard/arrivals` | Arrivals |
| GET | `/api/v1/schedule` | Schedule view |
| GET | `/api/v1/schedule/capacity` | Capacity |
| GET | `/api/v1/reports/departures` | Departures report |
| GET | `/api/v1/reports/arrivals` | Arrivals report |
| GET | `/api/v1/reports/revenue` | Revenue report |
| GET | `/api/v1/reports/occupancy` | Occupancy report |

**Lambda Source:** `aws/lambdas/analytics-service/index.ts`

---

### Properties V2 Routes → `propertiesV2Integration`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/properties` | List properties |
| GET | `/api/v2/properties/{id}` | Get property |
| DELETE | `/api/v2/properties/{propertyId}` | Delete property |
| POST | `/api/v2/properties/{propertyId}/archive` | Archive property |

**Lambda Source:** `aws/lambdas/properties-v2-service/index.ts`

---

## Integration Summary Table

| Route Group | Integration | Lambda Stack | Handler Path |
|-------------|-------------|--------------|--------------|
| Auth (`/api/v1/auth/*`) | authIntegration | IdentityServicesStack | `aws/lambdas/auth-api/index.ts` |
| Profile (`/api/v1/users/*`) | userProfileIntegration | IdentityServicesStack | `aws/lambdas/user-profile-service/index.ts` |
| Roles (`/api/v1/roles`, `/api/v1/user-permissions/*`) | rolesConfigIntegration | IdentityServicesStack | `aws/lambdas/roles-config-service/index.ts` |
| Tenants (`/api/v1/tenants/*`, `/api/v1/memberships/*`) | tenantsIntegration | TenantsServicesStack | `aws/lambdas/tenants-memberships-service/index.ts` |
| Entities (`/api/v1/pets/*`, `/api/v1/owners/*`, `/api/v1/staff/*`) | entityIntegration | EntityServicesStack | `aws/lambdas/entity-service/index.ts` |
| Operations (`/api/v1/bookings/*`, `/api/v1/kennels/*`, `/api/v1/runs/*`, `/api/v1/check-*`) | operationsIntegration | OperationsServicesStack | `aws/lambdas/operations-service/index.ts` |
| Config (`/api/v1/services/*`, `/api/v1/facility/*`, `/api/v1/packages/*`, `/api/v1/account-defaults/*`) | configIntegration | ConfigServicesStack | `aws/lambdas/config-service/index.ts` |
| Features (`/api/v1/tasks/*`, `/api/v1/communications/*`, `/api/v1/incidents/*`, `/api/v1/notes/*`, `/api/v1/messages/*`, `/api/v1/invites/*`, `/api/v1/segments/*`) | featuresIntegration | FeaturesServicesStack | `aws/lambdas/features-service/index.ts` |
| Financial (`/api/v1/payments/*`, `/api/v1/invoices/*`, `/api/v1/billing/*`) | financialIntegration | FinancialServicesStack | `aws/lambdas/financial-service/index.ts` |
| Analytics (`/api/v1/dashboard/*`, `/api/v1/schedule/*`, `/api/v1/reports/*`) | analyticsIntegration | AnalyticsServicesStack | `aws/lambdas/analytics-service/index.ts` |
| Properties V2 (`/api/v2/properties/*`) | propertiesV2Integration | PropertiesV2ServicesStack | `aws/lambdas/properties-v2-service/index.ts` |

---

## Security Notes

### Current State (Dev)

- **Authorization:** None (`AuthorizationType: NONE`)
- **CORS:** Open to all origins (`*`)
- **Authentication:** Handled by Lambda functions reading JWT from `Authorization` header

### TODO for Production

1. **Add JWT Authorizer:** Configure Cognito User Pool authorizer
2. **Tighten CORS:** Replace `*` with specific frontend domains
3. **Add WAF:** Web Application Firewall rules
4. **Enable Access Logging:** CloudWatch access logs
5. **Add Rate Limiting:** Usage plans and throttling

---

## For ChatGPT Summary

Key facts about BarkBase Dev v2 API Gateway architecture:

1. **Single HTTP API** (API Gateway v2) named `barkbase-dev-api`
2. **11 Lambda integrations** - one per business domain
3. **~60+ route definitions** mapped to integrations
4. **Domain-based routing** pattern - each Lambda handles all routes for its domain
5. **CORS configured** for all methods with `*` origins (dev only)
6. **No authorizer yet** - `AuthorizationType: NONE`, JWT validation in Lambdas
7. **Proxy routes** (`{proxy+}`) used for sub-paths
8. **Headers allowed:** `Content-Type`, `Authorization`, `X-Tenant-Id`, `X-Requested-With`
9. **ApiCoreStack depends on** all 9 service stacks
10. **All v1 routes** under `/api/v1/*`, v2 routes under `/api/v2/*`
11. **Exported outputs:** HttpApiId, HttpApiEndpoint, HttpApiUrl
12. **Resource count:** ~100-150 (well under 500 limit)
13. **Production TODOs:** JWT authorizer, CORS tightening, WAF, rate limiting

