# BarkBase AWS Infrastructure - Phase 2

> **Status**: Ready for deployment  
> **Last Updated**: November 2024  
> **Phase**: Shared Resources (DB Layer)

## Overview

Phase 2 establishes the database connectivity layer for all Lambda functions:

- **Database Lambda Layer** (`db-layer`) with PostgreSQL client
- **Secrets Manager integration** for secure credential management
- **Backend adapter** for local development compatibility

## Prerequisites

- Phase 1 complete (NetworkStack + DatabaseStack deployed)
- `aws/layers/db-layer/nodejs/` dependencies installed

## Deployment

### Install Layer Dependencies

```bash
cd aws/layers/db-layer/nodejs
npm install
```

### Deploy SharedResourcesStack

```bash
cd aws/cdk
cdk deploy Barkbase-SharedResourcesStack-dev
```

---

## Stack: Barkbase-SharedResourcesStack-{env}

### Purpose
Creates shared Lambda layers used by all service stacks.

### Resources Created

| Resource | Description |
|----------|-------------|
| DbLayer | Lambda layer with `pg` and `@aws-sdk/client-secrets-manager` |

### CloudFormation Outputs

| Output Key | Description | Export Name |
|------------|-------------|-------------|
| `DbLayerArn` | ARN of the database Lambda layer | `Barkbase-SharedResourcesStack-{env}-DbLayerArn` |

---

## Database Layer (db-layer)

### Location

```
aws/layers/db-layer/nodejs/
├── package.json    # Dependencies: pg, @aws-sdk/client-secrets-manager
└── db.js           # Main module
```

### Exports

```javascript
const { getPool, warmUp, closePool } = require('/opt/nodejs/db');
```

| Function | Description |
|----------|-------------|
| `getPool()` | Returns singleton `pg.Pool` instance (lazy init) |
| `warmUp()` | Explicitly initialize pool (cold start optimization) |
| `closePool()` | Gracefully close the pool |

### Configuration Modes

**1. Secret-Based (Lambda/Production)**

```bash
DB_SECRET_NAME=barkbase/dev/postgres/credentials
AWS_REGION=us-east-2
```

- Fetches credentials from AWS Secrets Manager
- Caches secret in memory for Lambda lifecycle
- Configures SSL for RDS

**2. Direct Environment (Local Development)**

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=barkbase
DB_USER=postgres
DB_PASSWORD=your_password
```

- Used when `DB_SECRET_NAME` is not set
- No SSL (local postgres)

---

## Lambda Environment Variables

When attaching db-layer to Lambda functions, set these env vars:

| Variable | Value | Required |
|----------|-------|----------|
| `DB_SECRET_NAME` | `barkbase/{env}/postgres/credentials` | Yes |
| `DB_NAME` | `barkbase` | Optional |
| `BARKBASE_ENV` | `dev` | Optional |
| `AWS_NODEJS_CONNECTION_REUSE_ENABLED` | `1` | Recommended |

### CDK Helper

Use the helper in `ServiceStackProps.ts`:

```typescript
import { buildDbEnvironment } from './shared/ServiceStackProps';

const lambdaEnv = buildDbEnvironment(environment, databaseName);
// Returns: { DB_SECRET_NAME, DB_NAME, BARKBASE_ENV, AWS_NODEJS_CONNECTION_REUSE_ENABLED }
```

---

## Backend Adapter

### Location
`backend/src/lib/db/index.js`

### Resolution Strategy

1. **Lambda runtime**: `require('/opt/nodejs/db')`
2. **Local fallback**: `require('../../../../aws/layers/db-layer/nodejs/db')`

### Usage

```javascript
const { getPool } = require('../../lib/db');
const pool = getPool();
const result = await pool.query('SELECT * FROM "Pet" WHERE "tenantId" = $1', [tenantId]);
```

---

## Local Development Setup

Add to your `.env` or shell:

```bash
# Database connection (no Secrets Manager locally)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=barkbase
DB_USER=postgres
DB_PASSWORD=your_password

# Optional pool settings
DB_POOL_MAX=10
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=5000
```

---

## Files Created/Modified

| File | Purpose |
|------|---------|
| `aws/layers/db-layer/nodejs/package.json` | Layer dependencies |
| `aws/layers/db-layer/nodejs/db.js` | PostgreSQL pool + Secrets Manager |
| `aws/cdk/lib/shared/DbLayer.ts` | CDK construct for layer |
| `aws/cdk/lib/SharedResourcesStack.ts` | Stack that creates DbLayer |
| `aws/cdk/lib/shared/ServiceStackProps.ts` | Added `buildDbEnvironment()` helper |
| `aws/cdk/bin/barkbase.ts` | Added SharedResourcesStack |
| `backend/src/lib/db/index.js` | Lambda/local resolution adapter |
| `backend/README.md` | Added DB configuration docs |

---

## Future Phases

### Phase 3: Identity & API Gateway
- Cognito User Pool
- API Gateway HTTP API
- Lambda authorizer

### Phase 4: Lambda Services
- Wire service Lambdas with:
  - `dbLayer` attached
  - VPC + private subnets
  - App security group
  - DB environment variables
  - Secrets Manager IAM permissions

### Phase 5: Frontend & Jobs
- S3 + CloudFront
- EventBridge scheduled jobs

---

## Troubleshooting

### db-layer Not Working in Lambda

1. Verify layer is attached: `layers: [dbLayer]`
2. Check `DB_SECRET_NAME` env var is set
3. Verify Lambda IAM role has `secretsmanager:GetSecretValue` permission
4. Check CloudWatch Logs for `[DB-LAYER]` messages

### Local Dev Connection Failed

1. Verify PostgreSQL is running locally
2. Check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` env vars
3. Ensure `DB_SECRET_NAME` is NOT set (triggers local mode)

### Pool Not Initializing

The pool initializes lazily on first query. For cold start optimization:

```javascript
const { warmUp } = require('/opt/nodejs/db');

// In Lambda init (outside handler)
warmUp().catch(console.error);

exports.handler = async (event) => {
  const pool = getPool();
  // Pool already warm
};
```

