# Lambda Functions & Services Design

This document describes the Lambda functions and service architecture for BarkBase Dev v2.

**Phase:** 3 of BarkBase Dev v2 Rebuild  
**Last Updated:** Phase 3 implementation

---

## Overview

BarkBase uses a domain-driven microservices architecture where each domain has its own Lambda function(s) bundled into a dedicated CDK stack. All service Lambdas share common infrastructure:

- **VPC Placement:** All Lambdas run inside the VPC private subnets
- **Security:** All Lambdas use the shared `lambdaSecurityGroup`
- **Database Access:** All Lambdas receive DB credentials via Secrets Manager
- **Runtime:** Node.js 20.x
- **Bundling:** esbuild via `aws-cdk-lib/aws-lambda-nodejs`

---

## Service Stacks & Lambda Functions

### 1. IdentityServicesStack

**Purpose:** Authentication, user profile, and role/permission management

| Lambda Function | Logical ID | Source Path |
|-----------------|------------|-------------|
| Auth API | `AuthApiFunction` | `aws/lambdas/auth-api/index.ts` |
| User Profile Service | `UserProfileServiceFunction` | `aws/lambdas/user-profile-service/index.ts` |
| Roles Config Service | `RolesConfigServiceFunction` | `aws/lambdas/roles-config-service/index.ts` |

**API Routes:**
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/signup`
- `GET /api/v1/users/profile`
- `POST /api/v1/users/password`
- `ANY /api/v1/roles`
- `GET/POST/PATCH /api/v1/user-permissions/*`

---

### 2. TenantsServicesStack

**Purpose:** Multi-tenant and membership management

| Lambda Function | Logical ID | Source Path |
|-----------------|------------|-------------|
| Tenants & Memberships Service | `TenantsMembershipsServiceFunction` | `aws/lambdas/tenants-memberships-service/index.ts` |

**API Routes:**
- `POST /api/v1/tenants/{proxy+}`
- `GET /api/v1/tenants?slug={slug}`
- `GET /api/v1/tenants/current`
- `GET /api/v1/tenants/current/plan`
- `GET /api/v1/tenants/current/onboarding`
- `GET /api/v1/tenants/current/theme`
- `GET/POST/PUT /api/v1/memberships/{proxy+}`

---

### 3. EntityServicesStack

**Purpose:** Core entity management - pets, owners, staff

| Lambda Function | Logical ID | Source Path |
|-----------------|------------|-------------|
| Entity Service | `EntityServiceFunction` | `aws/lambdas/entity-service/index.ts` |

**API Routes:**
- `ANY /api/v1/pets`
- `GET/PUT/DELETE /api/v1/pets/{proxy+}`
- `GET /api/v1/pets/{id}/vaccinations`
- `GET /api/v1/pets/vaccinations/expiring`
- `GET /api/v1/pets/medical-alerts`
- `POST /api/v1/pets/owners`
- `ANY /api/v1/owners`
- `GET/PUT/DELETE /api/v1/owners/{proxy+}`
- `GET /api/v1/owners/{id}/pets`
- `ANY /api/v1/staff`
- `GET/PUT/DELETE /api/v1/staff/{proxy+}`

---

### 4. OperationsServicesStack

**Purpose:** Day-to-day operations - bookings, check-ins, kennels

| Lambda Function | Logical ID | Source Path |
|-----------------|------------|-------------|
| Operations Service | `OperationsServiceFunction` | `aws/lambdas/operations-service/index.ts` |

**API Routes:**
- `ANY /api/v1/bookings`
- `POST/PUT/DELETE /api/v1/bookings/{proxy+}`
- `POST /api/v1/bookings/{id}/check-in`
- `POST /api/v1/bookings/{id}/check-out`
- `ANY /api/v1/check-ins`
- `GET/PATCH/DELETE /api/v1/check-ins/{proxy+}`
- `ANY /api/v1/check-outs`
- `GET/PATCH/DELETE /api/v1/check-outs/{proxy+}`
- `ANY /api/v1/kennels`
- `GET/PUT /api/v1/kennels/{proxy+}`
- `GET /api/v1/kennels/occupancy`
- `ANY /api/v1/runs`
- `POST/GET/DELETE /api/v1/runs/{proxy+}`
- `GET /api/v1/runs/assignments`
- `POST /api/v1/run-templates/{proxy+}`

---

### 5. ConfigServicesStack

**Purpose:** Application and facility configuration

| Lambda Function | Logical ID | Source Path |
|-----------------|------------|-------------|
| Config Service | `ConfigServiceFunction` | `aws/lambdas/config-service/index.ts` |

**API Routes:**
- `ANY /api/v1/services`
- `DELETE /api/v1/services/{proxy+}`
- `POST/GET/PATCH /api/v1/facility/{proxy+}`
- `POST/PUT /api/v1/packages/{proxy+}`
- `PUT/DELETE /api/v1/account-defaults/{proxy+}`

---

### 6. FeaturesServicesStack

**Purpose:** Feature-rich capabilities - tasks, communications, etc.

| Lambda Function | Logical ID | Source Path |
|-----------------|------------|-------------|
| Features Service | `FeaturesServiceFunction` | `aws/lambdas/features-service/index.ts` |

**API Routes:**
- `ANY /api/v1/tasks`
- `GET/PUT/DELETE /api/v1/tasks/{proxy+}`
- `ANY /api/v1/communications`
- `GET/PATCH /api/v1/communications/{proxy+}`
- `ANY /api/v1/incidents`
- `POST/DELETE /api/v1/incidents/{proxy+}`
- `ANY /api/v1/notes`
- `POST/DELETE /api/v1/notes/{proxy+}`
- `ANY /api/v1/messages`
- `GET/PUT /api/v1/messages/{proxy+}`
- `ANY /api/v1/invites`
- `POST/PATCH/GET /api/v1/invites/{proxy+}`
- `PUT/PATCH /api/v1/segments/{proxy+}`

---

### 7. FinancialServicesStack

**Purpose:** Financial operations - payments, invoices

| Lambda Function | Logical ID | Source Path |
|-----------------|------------|-------------|
| Financial Service | `FinancialServiceFunction` | `aws/lambdas/financial-service/index.ts` |

**API Routes:**
- `POST /api/v1/payments`
- `GET /api/v1/payments`
- `POST /api/v1/invoices`
- `GET /api/v1/invoices`
- `POST /api/v1/invoices/generate/{bookingId}`
- `GET /api/v1/billing/metrics`

---

### 8. AnalyticsServicesStack

**Purpose:** Business intelligence - dashboard, reports

| Lambda Function | Logical ID | Source Path |
|-----------------|------------|-------------|
| Analytics Service | `AnalyticsServiceFunction` | `aws/lambdas/analytics-service/index.ts` |

**API Routes:**
- `GET /api/v1/dashboard/stats`
- `GET /api/v1/dashboard/today-pets`
- `GET /api/v1/dashboard/arrivals`
- `GET /api/v1/schedule`
- `GET /api/v1/schedule/capacity`
- `GET /api/v1/reports/departures`
- `GET /api/v1/reports/arrivals`
- `GET /api/v1/reports/revenue`
- `GET /api/v1/reports/occupancy`

---

### 9. PropertiesV2ServicesStack

**Purpose:** Property management (v2 API)

| Lambda Function | Logical ID | Source Path |
|-----------------|------------|-------------|
| Properties API v2 | `PropertiesApiV2Function` | `aws/lambdas/properties-v2-service/index.ts` |

**API Routes:**
- `GET /api/v2/properties`
- `GET /api/v2/properties/{id}`
- `DELETE /api/v2/properties/{propertyId}`
- `POST /api/v2/properties/{propertyId}/archive`

---

## Shared Environment Variables

All service Lambdas receive these environment variables:

| Variable | Description | Source |
|----------|-------------|--------|
| `DB_HOST` | RDS endpoint hostname | DatabaseStack |
| `DB_PORT` | RDS port (5432) | DatabaseStack |
| `DB_NAME` | Database name (barkbase) | DatabaseStack |
| `DB_SECRET_ID` | Secrets Manager secret name | DatabaseStack |
| `DB_SECRET_ARN` | Secrets Manager secret ARN | DatabaseStack |
| `STAGE` | Deployment stage (dev) | Context/Env |
| `ENVIRONMENT` | Environment name (dev) | Context/Env |
| `USER_POOL_ID` | Cognito User Pool ID | Context/Env |
| `CLIENT_ID` | Cognito Client ID | Context/Env |
| `S3_BUCKET` | (Optional) Upload bucket name | Context/Env |
| `S3_KMS_KEY_ID` | (Optional) KMS key for S3 | Context/Env |
| `CLOUDFRONT_DOMAIN` | (Optional) CDN domain | Context/Env |

---

## VPC Configuration

All service Lambdas are configured with:

```typescript
vpc: props.vpc,                              // From NetworkStack
vpcSubnets: { subnets: props.appSubnets },   // Private subnets
securityGroups: [props.lambdaSecurityGroup], // Lambda SG
```

This allows them to:
- Access RDS PostgreSQL on port 5432
- Use VPC endpoints for Secrets Manager and CloudWatch Logs
- Egress to internet via NAT Gateway when needed

---

## Lambda Configuration

| Setting | Value |
|---------|-------|
| Runtime | Node.js 20.x |
| Memory | 512 MB |
| Timeout | 15 seconds |
| Tracing | X-Ray Active |
| Log Retention | 1 week |
| Bundling | esbuild (minified, source maps) |

---

## Handler Placeholder Pattern

All Lambda handlers currently return a 501 response:

```typescript
export const handler = async (event, context) => {
  console.log('Service Lambda invoked', {
    requestId: context.awsRequestId,
    path: event.path,
    method: event.httpMethod,
    stage: process.env.STAGE,
  });

  return {
    statusCode: 501,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      message: 'Not implemented yet – BarkBase v2 rebuild.',
      service: '<service-name>',
      path: event.path,
      method: event.httpMethod,
    }),
  };
};
```

Real business logic will be implemented in later phases.

---

## File Structure

```
aws/
├── cdk/
│   ├── bin/
│   │   └── barkbase.ts                    # CDK app entry point
│   └── lib/
│       ├── shared/
│       │   └── ServiceStackProps.ts       # Shared props interface
│       ├── NetworkStack.ts
│       ├── DatabaseStack.ts
│       ├── IdentityServicesStack.ts       # 3 Lambdas
│       ├── TenantsServicesStack.ts        # 1 Lambda
│       ├── EntityServicesStack.ts         # 1 Lambda
│       ├── OperationsServicesStack.ts     # 1 Lambda
│       ├── ConfigServicesStack.ts         # 1 Lambda
│       ├── FeaturesServicesStack.ts       # 1 Lambda
│       ├── FinancialServicesStack.ts      # 1 Lambda
│       ├── AnalyticsServicesStack.ts      # 1 Lambda
│       ├── PropertiesV2ServicesStack.ts   # 1 Lambda
│       ├── ApiCoreStack.ts                # TODO: Phase 4
│       ├── RealtimeStack.ts               # TODO: Phase 4
│       ├── JobsStack.ts                   # TODO: Phase 4
│       └── FrontendStack.ts               # TODO: Phase 5
└── lambdas/
    ├── package.json
    ├── tsconfig.json
    ├── auth-api/
    │   └── index.ts
    ├── user-profile-service/
    │   └── index.ts
    ├── roles-config-service/
    │   └── index.ts
    ├── tenants-memberships-service/
    │   └── index.ts
    ├── entity-service/
    │   └── index.ts
    ├── operations-service/
    │   └── index.ts
    ├── config-service/
    │   └── index.ts
    ├── features-service/
    │   └── index.ts
    ├── financial-service/
    │   └── index.ts
    ├── analytics-service/
    │   └── index.ts
    └── properties-v2-service/
        └── index.ts
```

---

## Resource Counts (Estimated)

| Stack | Lambdas | Est. Resources |
|-------|---------|----------------|
| NetworkStack | 0 | ~27 |
| DatabaseStack | 0 | ~5 |
| IdentityServicesStack | 3 | ~15-20 |
| TenantsServicesStack | 1 | ~5-8 |
| EntityServicesStack | 1 | ~5-8 |
| OperationsServicesStack | 1 | ~5-8 |
| ConfigServicesStack | 1 | ~5-8 |
| FeaturesServicesStack | 1 | ~5-8 |
| FinancialServicesStack | 1 | ~5-8 |
| AnalyticsServicesStack | 1 | ~5-8 |
| PropertiesV2ServicesStack | 1 | ~5-8 |
| **Total** | **12** | **~90-110** |

All stacks are well under the 500-resource limit.

---

## For ChatGPT Summary

Key facts about BarkBase Dev v2 Lambda architecture:

1. **12 Lambda functions** across 9 service stacks
2. **One Lambda per domain** pattern (not function-per-route)
3. **All Lambdas are VPC-enabled** with private subnet placement
4. **Node.js 20.x runtime** with esbuild bundling
5. **Shared environment variables** for DB, Cognito, and optional S3
6. **Secrets Manager** for database credentials (never hardcoded)
7. **X-Ray tracing enabled** for all Lambdas
8. **512 MB memory, 15s timeout** as defaults
9. **Placeholder handlers** return 501 until real logic is added
10. **~90-110 total resources** across service stacks (well under 500 limit)
11. **API Gateway not yet wired** - Phase 4
12. **Source code** in `aws/lambdas/<service-name>/index.ts`

