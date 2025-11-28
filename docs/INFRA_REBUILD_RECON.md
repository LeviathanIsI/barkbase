# BarkBase Infrastructure Rebuild Reconnaissance Report

**Date Generated**: November 28, 2025  
**Prepared For**: AWS/CDK Architecture Rebuild  
**Status**: Analysis Complete

---

## Overview

This document provides a comprehensive analysis of the BarkBase codebase to support a from-scratch infrastructure rebuild. The current architecture is a multi-tenant pet boarding management SaaS platform built on AWS serverless architecture with React 19 frontend.

### Critical Finding

**⚠️ CDK infrastructure code is NOT present in this repository.** The `aws/` directory referenced in `claude.md` and `README.md` does not exist. The CDK code appears to be in a separate repository or was previously removed. However, we have AWS resource exports (`lambdas.json`, `routes.txt`, `tmp-api-core.json`) that document the existing deployed infrastructure.

### Key Architecture Facts

| Component | Technology | Location |
|-----------|------------|----------|
| Frontend | React 19 + Vite + Tailwind | `frontend/` |
| Backend (Unified) | Express.js + serverless-http | `backend/` |
| Database | PostgreSQL 15 | AWS RDS |
| Authentication | AWS Cognito + JWT | Multiple auth modes |
| API | HTTP API (API Gateway) | AWS |
| Realtime | WebSocket API | AWS API Gateway |
| File Storage | S3 with presigned URLs | AWS |
| Region | us-east-2 | - |

---

## CDK Stacks Summary

Based on Lambda function naming conventions in `lambdas.json`, the following CDK stacks were identified:

### 1. Main Stack (`Barkbase-dev-*`)

**Identified Functions:**
- `AuthApiFunction31FCF8B8`
- `EntityServiceFunction31C1524D`
- `AnalyticsServiceFunctionA7CDC68A`
- `OperationsServiceFunction0603CF61`
- `ConfigServiceFunction60247474`
- `FinancialServiceFunction09E7DA47`
- `UserProfileServiceFunction5A1818D5`
- `FeaturesServiceFunctionA6C57C51`
- `PropertiesApiV2FunctionF2C6947F`
- `AdminApiFunction0560532A`
- `UsersApiFunction12D20B8D`
- `GetUploadUrlFunction24AFC12E`
- `GetDownloadUrlFunction7617431B`
- `MigrationApiFunctionDFDC208B`
- `OptionsHandlerFunction3AAAD72E`
- `CognitoPreSignUpFunction43A53FC5`
- `CognitoPostConfirmationFunction665DA6`
- `PropertyArchivalJobFunction115C8E2F`
- `PropertyPermanentDeletionJobFunction7`
- `WebSocketConnectFunction72183AC0`
- `WebSocketDisconnectFunction189772FC`
- `WebSocketMessageFunction78F1CCFA`
- `WebSocketBroadcastFunction4146603C`

### 2. Services Stack (`Barkbase-ServicesStack-de-*`)

**Purpose:** Consolidated service layer for multi-domain API operations

**Identified Functions:**
- `RolesConfigServiceFuncti-iD1WRF2lBgkB`
- `AdminApiFunction0560532A-iwupFguGmS8g`
- `UserProfileServiceFuncti-cuvgNTcrpMmt`
- `FeaturesServiceFunctionA-A5AnraCsfv3v`
- `AnalyticsServiceFunction-6VgEz4tEeGQp`
- `TenantsMembershipsConfig-CjLxgHimhbVy`
- `OperationsServiceFunctio-fluC7HtPjUyd`
- `PropertiesApiV2FunctionF-MHdR4o0Tm3FF`
- `EntityServiceFunction31C-6fKmwqxkiN3H`
- `FacilityServicesConfigSe-1qi3ApOZKv3L`
- `GetUploadUrlFunction24AF-U0fju0XdLd7B`
- `GetDownloadUrlFunction76-txcggboFYfnl`
- `FinancialServiceFunction-RTYPAZ24prvr`

### 3. Realtime Stack (`Barkbase-RealtimeStack-de-*`)

**Purpose:** WebSocket API for real-time updates

**Identified Functions:**
- `WebSocketMessageFunction-skmb5DGa2sWB`
- `WebSocketBroadcastFuncti-Q42Ihh3gPTkv`
- `WebSocketConnectFunction-LDZ4lklLQWoD`
- `WebSocketDisconnectFunct-XWmNC8Ij4qTF`

### 4. Network Stack (`Barkbase-NetworkStack-dev-*`)

**Purpose:** VPC and networking infrastructure

**Identified Functions:**
- `CustomVpcRestrictDefault-Ugn1EBpXIFpa` (VPC custom resource)

### 5. Jobs Stack (`Barkbase-JobsStack-dev-*`)

**Purpose:** Scheduled/background jobs

**Identified Functions:**
- `PropertyArchivalJobFunction-dOpgVrLycHob`
- `PropertyPermanentDeletionJo-OmSkiQAkD38a`
- `MigrationApiFunctionDFDC208-xUOpIL9poivS`

---

## Lambdas & API Routes

### Lambda Configuration (Common Environment)

All service Lambdas share these environment variables:

| Variable | Value (dev) |
|----------|-------------|
| `DB_HOST` | `barkbase-dev-public.ctuea6sg4d0d.us-east-2.rds.amazonaws.com` |
| `DB_PORT` | `5432` |
| `DB_NAME` | `barkbase` |
| `DB_SECRET_ID` | `Barkbase-dev-db-credentials` |
| `DB_SECRET_ARN` | `arn:aws:secretsmanager:us-east-2:211125574375:secret:Barkbase-dev-db-credentials` |
| `STAGE` | `dev` |
| `ENVIRONMENT` | `dev` |
| `USER_POOL_ID` | `us-east-2_v94gByGOq` |
| `CLIENT_ID` | `2csen8hj7b53ec2q9bc0siubja` |

### VPC Configuration

Some Lambdas run inside VPC for RDS access:

| Resource | ID |
|----------|-----|
| VPC | `vpc-0febf70176612a549` |
| Subnet 1 | `subnet-078c284310fe11311` |
| Subnet 2 | `subnet-012923003eb5bfd23` |
| Security Group | `sg-0e01cbd8dd71d1bfb` |

### Lambda Layers

| Layer | Purpose |
|-------|---------|
| `ServicesAuthLayerE49C4FB3:1` | Authentication utilities (Cognito JWT verification) |
| `ServicesDbLayerF81A76E3:1` | Database connection pooling (pg module) |
| `AuthLayer9FC54F51:7` | Auth layer (older version) |
| `DbLayer195115F8:21` | DB layer (older version) |
| `RealtimeDbLayerD87170C9:1` | Realtime DB layer |

### API Route Mapping (HTTP API)

Based on `routes.txt`, here are the API routes grouped by integration:

#### Entity Service (`integrations/ktt03w1`)
| Method | Path |
|--------|------|
| ANY | `/api/v1/pets` |
| GET/PUT/DELETE | `/api/v1/pets/{proxy+}` |
| ANY | `/api/v1/owners` |
| GET/PUT/DELETE | `/api/v1/owners/{proxy+}` |
| ANY | `/api/v1/staff` |
| GET/PUT/DELETE | `/api/v1/staff/{proxy+}` |

#### Operations Service (`integrations/hm8ou2k`)
| Method | Path |
|--------|------|
| ANY | `/api/v1/bookings` |
| POST/PUT/DELETE | `/api/v1/bookings/{proxy+}` |
| ANY | `/api/v1/check-ins` |
| GET/PATCH/DELETE | `/api/v1/check-ins/{proxy+}` |
| ANY | `/api/v1/check-outs` |
| GET/PATCH/DELETE | `/api/v1/check-outs/{proxy+}` |
| ANY | `/api/v1/kennels` |
| GET/PUT | `/api/v1/kennels/{proxy+}` |
| ANY | `/api/v1/runs` |
| POST/GET/DELETE | `/api/v1/runs/{proxy+}` |
| GET | `/api/v1/runs/assignments` |
| POST | `/api/v1/run-templates/{proxy+}` |

#### Config/Facility Service (`integrations/n4ld0ip`)
| Method | Path |
|--------|------|
| ANY | `/api/v1/services` |
| DELETE | `/api/v1/services/{proxy+}` |
| POST/GET/PATCH | `/api/v1/facility/{proxy+}` |
| POST/PUT | `/api/v1/packages/{proxy+}` |
| PUT/DELETE | `/api/v1/account-defaults/{proxy+}` |

#### Features Service (`integrations/mvn0pqd`)
| Method | Path |
|--------|------|
| ANY | `/api/v1/tasks` |
| GET/PUT/DELETE | `/api/v1/tasks/{proxy+}` |
| ANY | `/api/v1/communications` |
| GET/PATCH | `/api/v1/communications/{proxy+}` |
| ANY | `/api/v1/incidents` |
| POST/DELETE | `/api/v1/incidents/{proxy+}` |
| ANY | `/api/v1/notes` |
| POST/DELETE | `/api/v1/notes/{proxy+}` |
| ANY | `/api/v1/messages` |
| GET/PUT | `/api/v1/messages/{proxy+}` |
| ANY | `/api/v1/invites` |
| POST/PATCH/GET | `/api/v1/invites/{proxy+}` |
| PUT/PATCH | `/api/v1/segments/{proxy+}` |

#### Roles/Permissions Service (`integrations/qjvezoh`)
| Method | Path |
|--------|------|
| ANY | `/api/v1/roles` |
| GET/POST | `/api/v1/roles/{proxy+}` |
| GET/POST/PATCH | `/api/v1/user-permissions/{proxy+}` |

#### Tenants/Memberships Service (`integrations/t2hijf2`)
| Method | Path |
|--------|------|
| POST | `/api/v1/tenants/{proxy+}` |
| GET/POST/PUT | `/api/v1/memberships/{proxy+}` |

#### Analytics/Dashboard Service (`integrations/cd6yrlo`)
| Method | Path |
|--------|------|
| GET | `/api/v1/dashboard/stats` |
| GET | `/api/v1/dashboard/today-pets` |
| GET | `/api/v1/dashboard/arrivals` |
| GET | `/api/v1/schedule` |
| GET | `/api/v1/reports/departures` |

#### Financial Service (`integrations/uc23rl8`)
| Method | Path |
|--------|------|
| POST | `/api/v1/payments` |
| POST | `/api/v1/invoices` |
| POST | `/api/v1/invoices/generate/{bookingId}` |

#### User Profile Service (`integrations/uc3qomr`)
| Method | Path |
|--------|------|
| GET | `/api/v1/users/profile` |
| POST | `/api/v1/users/password` |

#### Properties API v2 (`integrations/xc53h0n`)
| Method | Path |
|--------|------|
| GET | `/api/v2/properties` |
| DELETE | `/api/v2/properties/{propertyId}` |
| POST | `/api/v2/properties/{propertyId}/archive` |

---

## Frontend API & Auth Expectations

### API Client Architecture

**Location:** `frontend/src/lib/apiClient.js`

The frontend uses a unified API client that:

1. **Base URL Resolution:**
   ```javascript
   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL_UNIFIED
     || import.meta.env.VITE_API_BASE_URL
     || 'https://ejxp74eyhe.execute-api.us-east-2.amazonaws.com';
   ```

2. **Headers Construction:**
   - `Content-Type: application/json`
   - `Authorization: Bearer {accessToken}` (from auth store)
   - `X-Tenant-Id: {tenantId}` (from tenant store)

3. **Auto-logout on 401:**
   - Clears `barkbase-auth` from localStorage
   - Clears `barkbase-tenant` from localStorage
   - Redirects to `/login`

### AWS Client Factory

**Location:** `frontend/src/lib/aws-client/index.js`

Three auth modes supported:

| Mode | Class | Trigger |
|------|-------|---------|
| `hosted` (default) | `LambdaAuthClient` | Cognito Hosted UI with PKCE |
| `password` | `CognitoPasswordClient` | Direct username/password via Cognito SDK |
| `db` | `DbAuthClient` | Custom JWT via backend `/api/v1/auth/*` |

Selected via `VITE_AUTH_MODE` environment variable.

### Canonical Endpoints

**Location:** `frontend/src/lib/canonicalEndpoints.ts`

```typescript
export const canonicalEndpoints = {
  pets: {
    list: '/api/v1/pets',
    detail: build('/api/v1/pets/{id}'),
    vaccinations: build('/api/v1/pets/{id}/vaccinations'),
    expiringVaccinations: '/api/v1/pets/vaccinations/expiring',
    medicalAlerts: '/api/v1/pets/medical-alerts',
    ownerLink: '/api/v1/pets/owners',
  },
  owners: {
    list: '/api/v1/owners',
    detail: build('/api/v1/owners/{id}'),
    pets: build('/api/v1/owners/{id}/pets'),
  },
  properties: {
    list: '/api/v2/properties',
    detail: build('/api/v2/properties/{id}'),
    archive: buildWithSuffix('/api/v2/properties/{id}', 'archive'),
    // ... more
  },
  bookings: {
    list: '/api/v1/bookings',
    detail: build('/api/v1/bookings/{id}'),
    checkIn: buildWithSuffix('/api/v1/bookings/{id}', 'check-in'),
    checkOut: buildWithSuffix('/api/v1/bookings/{id}', 'check-out'),
    status: buildWithSuffix('/api/v1/bookings/{id}', 'status'),
  },
  schedule: {
    range: '/api/v1/schedule',
    capacity: '/api/v1/schedule/capacity',
  },
  runs: {
    list: '/api/v1/runs',
    detail: build('/api/v1/runs/{id}'),
    runTemplates: '/api/v1/run-templates',
    assignments: '/api/v1/runs/assignments',
  },
  tasks: { list: '/api/v1/tasks', detail: build('/api/v1/tasks/{id}') },
  reports: {
    dashboardStats: '/api/v1/dashboard/stats',
    dashboardToday: '/api/v1/dashboard/today-pets',
    arrivals: '/api/v1/reports/arrivals',
    departures: '/api/v1/reports/departures',
    revenue: '/api/v1/reports/revenue',
    occupancy: '/api/v1/reports/occupancy',
  },
  payments: {
    list: '/api/v1/payments',
    invoices: '/api/v1/invoices',
    billingMetrics: '/api/v1/billing/metrics',
  },
  settings: {
    tenantBySlug: '/api/v1/tenants',
    currentTenant: '/api/v1/tenants/current',
    plan: '/api/v1/tenants/current/plan',
    onboarding: '/api/v1/tenants/current/onboarding',
    theme: '/api/v1/tenants/current/theme',
    accountDefaults: '/api/v1/account-defaults',
    services: '/api/v1/services',
    packages: '/api/v1/packages',
    memberships: '/api/v1/memberships',
    roles: '/api/v1/roles',
    userPermissions: '/api/v1/user-permissions',
  },
  associations: { list: '/api/v1/associations' },
  userProfile: {
    self: '/api/v1/users/profile',
    profiles: '/api/v1/profiles',
    effectivePermissions: build('/api/v1/users/{id}/effective-permissions'),
    calculatePermissions: '/api/v1/permissions/calculate',
  },
  operations: {
    checkIns: '/api/v1/check-ins',
    checkOuts: '/api/v1/check-outs',
    kennels: '/api/v1/kennels',
    kennelOccupancy: '/api/v1/kennels/occupancy',
  },
  files: {
    uploadUrl: '/api/v1/upload-url',
    downloadUrl: '/api/v1/download-url',
  },
};
```

### React Query Hooks Factory

**Location:** `frontend/src/lib/createApiHooks.js`

Standardized hook factory pattern:
- `createListQuery({ key, url, itemsKey })`
- `createDetailQuery({ key, url })`
- `createSearchQuery({ key, url, searchParam })`
- `createMutation({ url, method, invalidate })`
- `createCrudHooks({ key, listUrl, detailUrl })` (generates all CRUD hooks)

### Major Frontend Features

| Feature | Location | Key API Endpoints |
|---------|----------|-------------------|
| Pets | `features/pets/` | `/api/v1/pets`, vaccinations |
| Owners | `features/owners/` | `/api/v1/owners` |
| Bookings | `features/bookings/` | `/api/v1/bookings`, check-in/out |
| Calendar | `features/calendar/` | `/api/v1/schedule` |
| Today View | `features/today/` | `/api/v1/dashboard/today-pets`, arrivals |
| Staff | `features/staff/` | `/api/v1/staff` |
| Settings | `features/settings/` | `/api/v1/tenants`, services, packages |
| Reports | `features/reports/` | `/api/v1/dashboard/stats`, reports/* |
| Kennels | `features/kennels/` | `/api/v1/kennels`, runs |
| Tasks | `features/tasks/` | `/api/v1/tasks` |
| Payments | `features/payments/` | `/api/v1/payments`, invoices |

### WebSocket/Realtime

**Location:** `frontend/src/lib/socket.js`, `frontend/src/lib/realtime.ts`

- Feature-flagged via `VITE_WEBSOCKET_ENABLED`
- URL via `VITE_WS_URL` or `wss://{host}/ws`
- Events: `booking_updated`, `booking_created`, `booking_deleted`, `pet_updated`, `owner_updated`, `check_in`, `check_out`, `conflict`
- Uses BroadcastChannel for cross-tab sync

---

## Auth / Identity Details

### Authentication Flow

1. **Cognito Hosted UI (default - `VITE_AUTH_MODE=hosted`):**
   - PKCE flow via `LambdaAuthClient`
   - Redirects to Cognito domain
   - Stores `pkce_verifier` in sessionStorage
   - Exchanges code for tokens at `/oauth2/token`

2. **Cognito Direct Password (`VITE_AUTH_MODE=password`):**
   - Uses AWS SDK `@aws-sdk/client-cognito-identity-provider`
   - `InitiateAuthCommand` with `USER_PASSWORD_AUTH` flow
   - Supports `SignUpCommand`, `ConfirmSignUpCommand`

3. **Database Auth (`VITE_AUTH_MODE=db`):**
   - Custom JWT from `/api/v1/auth/login`
   - Endpoints: `/api/v1/auth/login`, `/api/v1/auth/logout`, `/api/v1/auth/refresh`, `/api/v1/auth/signup`
   - Uses httpOnly cookies for refresh tokens

### Token Storage

**Location:** `frontend/src/stores/auth.js`

- Zustand store with persistence
- Stores in localStorage key: `barkbase-auth`
- Fields: `user`, `role`, `tenantId`, `memberships`, `rememberMe`, `accessToken`

### Tenant Context

**Location:** `frontend/src/stores/tenant.js`

- Zustand store with persistence
- Stores in localStorage key: `barkbase-tenant`
- Loaded via `/api/v1/tenants?slug={slug}` or `/api/v1/tenants/current`

### Backend Auth Middleware

**Location:** `backend/src/lib/auth/user-context.js`

Current dev implementation extracts from headers:
- `X-Tenant-Id` → `req.tenantId`
- `X-User-Id` → `req.user.userId`
- `X-User-Role` → `req.user.role`

**Note:** Production Lambda auth uses JWT verification via Cognito layer.

### Cognito Resources (from Lambda env vars)

| Resource | Value |
|----------|-------|
| User Pool ID | `us-east-2_v94gByGOq` |
| Client ID | `2csen8hj7b53ec2q9bc0siubja` |

---

## Environment Variables & Config

### Frontend Environment Variables

**File:** `frontend/env.example`

| Variable | Purpose | Required |
|----------|---------|----------|
| `VITE_API_BASE_URL_UNIFIED` | Primary API base URL | Yes |
| `VITE_API_BASE_URL` | Fallback API base URL | Yes |
| `VITE_API_URL` | Alternative API URL | Optional |
| `VITE_AWS_REGION` | AWS region | Default: us-east-1 |
| `VITE_USER_POOL_ID` | Cognito User Pool ID | Yes (hosted/password modes) |
| `VITE_CLIENT_ID` | Cognito App Client ID | Yes (hosted/password modes) |
| `VITE_COGNITO_DOMAIN` | Cognito hosted UI domain | Yes (hosted mode) |
| `VITE_REDIRECT_URI` | OAuth redirect URI | Default: window.origin |
| `VITE_LOGOUT_URI` | OAuth logout URI | Default: window.origin |
| `VITE_AUTH_MODE` | Auth mode: hosted/password/db | Default: hosted |
| `VITE_WS_URL` | WebSocket URL | Optional |
| `VITE_WEBSOCKET_ENABLED` | Enable WebSocket | Default: false |
| `VITE_PORT` | Dev server port | Default: 5173 |

### Backend Environment Variables

| Variable | Purpose |
|----------|---------|
| `PORT` | Server port (default: 4000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_PROVIDER` | Database type (postgresql) |

### Lambda Environment Variables

| Variable | Purpose |
|----------|---------|
| `DB_HOST` | RDS hostname |
| `DB_PORT` | RDS port (5432) |
| `DB_NAME` | Database name (barkbase) |
| `DB_SECRET_ID` | Secrets Manager secret ID |
| `DB_SECRET_ARN` | Secrets Manager secret ARN |
| `STAGE` | Deployment stage (dev/staging/prod) |
| `ENVIRONMENT` | Environment name |
| `USER_POOL_ID` | Cognito User Pool ID |
| `CLIENT_ID` | Cognito Client ID |
| `S3_BUCKET` | Upload bucket name |
| `S3_KMS_KEY_ID` | KMS key for S3 encryption |
| `CLOUDFRONT_DOMAIN` | CloudFront distribution domain |

### Config Files

| File | Purpose |
|------|---------|
| `frontend/vite.config.js` | Vite build config with PWA |
| `frontend/tailwind.config.js` | Tailwind CSS config |
| `docker-compose.yml` | Local dev environment |
| `claude.md` | Agent instructions (references missing `aws/` directory) |

### Documentation Files

| File | Content |
|------|---------|
| `README.md` | Project overview, mentions aws/ structure |
| `claude.md` | Agent instructions, references `aws/cdk/` |
| `frontend/docs/ui-audit-barkbase.md` | UI audit report |
| `frontend/README.md` | Frontend dev guide |
| `backend/README.md` | Backend dev guide |

---

## Open Questions / Ambiguities

### Critical

1. **Where is the CDK code?** The `aws/` directory referenced in documentation does not exist in this repository. Is it in a separate repo?

2. **What is the current API Gateway ID?** Routes reference integration IDs but the API Gateway itself isn't documented.

3. **How are JWT tokens verified in production?** The backend references `aws/layers/db-layer/nodejs` which doesn't exist locally.

4. **What triggers Cognito Lambda functions?** `CognitoPreSignUpFunction` and `CognitoPostConfirmationFunction` exist but triggers aren't documented.

### Infrastructure

5. **Is RDS Multi-AZ enabled?** The README mentions it for production but current dev uses single instance.

6. **What is the CloudFront distribution for?** `CLOUDFRONT_DOMAIN` env var is empty in dev.

7. **Are there any EventBridge rules?** Jobs stack suggests scheduled functions but triggers aren't documented.

8. **What is the WebSocket API Gateway ID?** Realtime stack exists but API Gateway config isn't documented.

### Data

9. **What tables exist in RDS?** Only partial schema visible via backend queries (Pet, Owner, PetOwner, Booking, Service, AuthSession).

10. **How is tenant isolation enforced at DB level?** All queries include `tenantId` WHERE clause but no RLS documented.

### Security

11. **What are the CORS allowed origins?** Not visible in current code.

12. **Are there WAF rules?** Not mentioned in available documentation.

13. **How are API keys managed?** Routes show `ApiKeyRequired: False` but API keys exist in plans.

---

## For ChatGPT Summary

### Essential Facts for CDK Architecture Design

**Infrastructure:**
- AWS Region: `us-east-2`
- VPC ID: `vpc-0febf70176612a549` (2 subnets, 1 security group)
- RDS: PostgreSQL 15 at `barkbase-dev-public.ctuea6sg4d0d.us-east-2.rds.amazonaws.com:5432/barkbase`
- Secrets: `Barkbase-dev-db-credentials` in Secrets Manager
- S3: `barkbase-dev-uploadsbucket5e5e9b64-hetcgznfpmt6` with KMS encryption

**Lambda Stack Architecture:**
- 5 CDK stacks: Main (dev), Services, Realtime, Network, Jobs
- ~30 Lambda functions total, nodejs20.x runtime
- 3 Lambda layers: Auth, DB, Realtime-DB
- Some Lambdas in VPC (for RDS), some public (cost optimization)

**API Gateway:**
- HTTP API (not REST API) with ~80+ routes
- Routes grouped by service: Entity, Operations, Config, Features, Roles, Tenants, Analytics, Financial, UserProfile, Properties
- No authorization on routes currently (`AuthorizationType: NONE`)
- WebSocket API for realtime (connect/disconnect/message/broadcast)

**Authentication:**
- Cognito User Pool: `us-east-2_v94gByGOq`
- Client ID: `2csen8hj7b53ec2q9bc0siubja`
- 3 auth modes: Hosted UI (PKCE), Direct Password, DB Auth
- Tokens: Access token in Authorization header, tenant in X-Tenant-Id header

**Frontend:**
- React 19 + Vite + Tailwind + Zustand + TanStack Query
- PWA with offline support
- API client expects: `VITE_API_BASE_URL`, `VITE_USER_POOL_ID`, `VITE_CLIENT_ID`
- WebSocket optional via `VITE_WEBSOCKET_ENABLED`

**Multi-Tenancy:**
- Row-level tenant isolation via `tenantId` column
- Plans: FREE, PRO, ENTERPRISE with feature gating
- Tenant context from JWT claims or X-Tenant-Id header

**Key Routes Frontend Expects:**
- `/api/v1/pets`, `/api/v1/owners`, `/api/v1/staff` (CRUD)
- `/api/v1/bookings` with check-in/check-out subpaths
- `/api/v1/kennels`, `/api/v1/runs` for facility
- `/api/v1/dashboard/stats`, `/api/v1/schedule` for analytics
- `/api/v1/tenants/current` for tenant config
- `/api/v2/properties` (newer v2 API)
- `/api/v1/upload-url`, `/api/v1/download-url` for S3

**Database:**
- PostgreSQL, tables include: Pet, Owner, PetOwner, Booking, Service, AuthSession, Tenant
- All tables have `tenantId`, `recordId` (UUID), `createdAt`, `updatedAt`

**Critical Missing:**
- CDK code not in this repo
- No RLS policies documented
- No WAF/CloudFront config visible
- JWT authorizer config not in routes (shows NONE)

---

*End of Reconnaissance Report*

