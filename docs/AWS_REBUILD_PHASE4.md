# BarkBase AWS Infrastructure - Phase 4

> **Status**: Ready for deployment  
> **Last Updated**: November 2024  
> **Phase**: API Gateway (HTTP API)

## Overview

Phase 4 creates the HTTP API Gateway that routes all requests to the unified backend Lambda:

- **HTTP API** (API Gateway v2) - Lower latency and cost than REST API
- **Proxy routing** - All paths forwarded to backend Lambda
- **CORS configured** - Ready for frontend access
- **No auth yet** - Cognito will be added in Phase 5

## Prerequisites

- Phase 1-3 complete and deployed
- `Barkbase-BackendServicesStack-dev` deployed with backend Lambda

## Deployment

```bash
cd aws/cdk
cdk deploy Barkbase-ApiCoreStack-dev
```

Or deploy all stacks:

```bash
cdk deploy --all
```

---

## Stack: Barkbase-ApiCoreStack-{env}

### Purpose
Creates the HTTP API that routes all requests to the unified backend Lambda.

### Dependencies

| Stack | Resources Used |
|-------|----------------|
| BackendServicesStack | `backendFunction` Lambda |

### Resources Created

| Resource | Description |
|----------|-------------|
| HTTP API | API Gateway v2 HTTP API |
| Lambda Integration | Routes requests to backend Lambda |
| Routes | `/{proxy+}` and `/` catch-all routes |

### CloudFormation Outputs

| Output Key | Description | Export Name |
|------------|-------------|-------------|
| `HttpApiId` | HTTP API identifier | `Barkbase-ApiCoreStack-{env}-HttpApiId` |
| `HttpApiUrl` | HTTP API base URL | `Barkbase-ApiCoreStack-{env}-HttpApiUrl` |
| `HttpApiStage` | Default stage name | `Barkbase-ApiCoreStack-{env}-HttpApiStage` |

---

## HTTP API Configuration

### API Name
`barkbase-{env}-http-api`

### Routing Pattern

| Route | Method | Description |
|-------|--------|-------------|
| `/{proxy+}` | ANY | Catches all paths, forwards to backend |
| `/` | ANY | Root path requests |

The Express backend handles actual routing:
- `/api/v1/*` - API endpoints
- `/health` - Health check

### CORS Configuration

| Setting | Value |
|---------|-------|
| Allowed Methods | GET, POST, PUT, PATCH, DELETE, OPTIONS |
| Allowed Headers | Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token, X-Tenant-Id |
| Allow Credentials | true |
| Max Age | 1 hour |

**Allowed Origins (dev):**
- `http://localhost:3000`
- `http://localhost:5173` (Vite)
- `http://localhost:4173` (Vite preview)
- `http://127.0.0.1:3000`
- `http://127.0.0.1:5173`
- `http://127.0.0.1:4173`

**Allowed Origins (prod):**
- `https://app.barkbase.com`
- `https://www.barkbase.com`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet                                 │
│                            │                                     │
│                            ▼                                     │
│              ┌─────────────────────────────┐                    │
│              │      HTTP API Gateway       │                    │
│              │   barkbase-dev-http-api     │                    │
│              │                             │                    │
│              │   Routes:                   │                    │
│              │   ANY /{proxy+} ──┐         │                    │
│              │   ANY /        ──┤         │                    │
│              └──────────────────┼─────────┘                    │
│                                 │                               │
│                                 ▼                               │
│              ┌─────────────────────────────┐                    │
│              │   Lambda Integration        │                    │
│              │   (HttpLambdaIntegration)   │                    │
│              └──────────────────┬──────────┘                    │
│                                 │                               │
└─────────────────────────────────┼───────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │   Backend Lambda        │
                    │   barkbase-dev-backend  │
                    │                         │
                    │   Express Router:       │
                    │   /api/v1/* - API       │
                    │   /health   - Health    │
                    └─────────────────────────┘
```

---

## Testing

### Get the API URL

After deployment:

```bash
aws cloudformation describe-stacks \
  --stack-name Barkbase-ApiCoreStack-dev \
  --query "Stacks[0].Outputs[?OutputKey=='HttpApiUrl'].OutputValue" \
  --output text
```

### Test the Health Endpoint

```bash
# Replace with your actual API URL
curl https://xxxxxxxxxx.execute-api.us-east-2.amazonaws.com/health
```

Expected response:
```json
{"status":"ok"}
```

### Test an API Endpoint

```bash
# Example: List pets (requires auth headers in production)
curl https://xxxxxxxxxx.execute-api.us-east-2.amazonaws.com/api/v1/pets
```

---

## Frontend Configuration

Update your frontend environment to use the API URL:

```bash
# .env or environment variables
VITE_API_URL=https://xxxxxxxxxx.execute-api.us-east-2.amazonaws.com
```

---

## Files Created/Modified

| File | Purpose |
|------|---------|
| `aws/cdk/lib/ApiCoreStack.ts` | New stack - HTTP API + routes |
| `aws/cdk/bin/barkbase.ts` | Updated - ApiCoreStack instantiation |
| `docs/AWS_REBUILD_PHASE4.md` | This documentation |

---

## Future Phases

### Phase 5: Identity (Cognito)
- Cognito User Pool
- JWT authorizer on HTTP API
- Protected routes

### Phase 6: Frontend & Jobs
- S3 + CloudFront for frontend hosting
- Custom domain with Route 53
- EventBridge scheduled jobs

---

## Troubleshooting

### CORS Errors in Browser

1. Check browser console for specific CORS error
2. Verify frontend origin is in allowed origins list
3. Check that preflight OPTIONS requests are handled
4. Ensure `allowCredentials` matches frontend fetch configuration

### 502 Bad Gateway / Internal Server Error

1. Check Lambda logs: `aws logs tail /aws/lambda/barkbase-dev-backend --since 5m --region us-east-2`
2. Verify backend has `node_modules` installed (`cd backend && npm install`)
3. Verify backend Lambda timeout (default 30s)
4. Check Lambda memory allocation
5. Verify Lambda is in correct VPC/subnets

### 403 Forbidden

1. Check API Gateway stage is deployed
2. Verify Lambda permission for API Gateway invoke
3. Check if authorizer is blocking (future phases)

### Slow Responses

1. First request may be slow (Lambda cold start)
2. VPC Lambda cold starts can add 1-5 seconds
3. Consider provisioned concurrency for production

