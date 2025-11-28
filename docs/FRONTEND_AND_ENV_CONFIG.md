# Frontend & Environment Configuration

This document describes the FrontendStack implementation and how CDK outputs map to frontend environment variables.

---

## FrontendStack

### Overview

The FrontendStack hosts the BarkBase React SPA using S3 for asset storage and CloudFront for global CDN distribution.

### S3 Bucket

| Property | Value | Notes |
|----------|-------|-------|
| **Public Access** | Blocked | CloudFront accesses via Origin Access Control (OAC) |
| **Versioning** | Enabled | Allows rollback to previous deployments |
| **Encryption** | S3-managed | Server-side encryption at rest |
| **Removal Policy** | DESTROY | Dev-only; change to RETAIN for production |
| **Auto-delete Objects** | true | Dev-only; allows `cdk destroy` to clean up |

### CloudFront Distribution

| Property | Value | Notes |
|----------|-------|-------|
| **Origin** | S3 bucket via OAC | Secure private origin access |
| **Viewer Protocol** | REDIRECT_TO_HTTPS | Forces HTTPS |
| **Compression** | Enabled | gzip + brotli |
| **HTTP Version** | HTTP/2 + HTTP/3 | Modern protocols for performance |
| **Price Class** | PRICE_CLASS_100 | NA/EU edges only (cost savings) |
| **Default Root Object** | `index.html` | SPA entry point |

### SPA Routing (Error Responses)

For client-side routing to work, CloudFront returns `index.html` for 403/404 errors:

| HTTP Status | Response Status | Response Path | TTL |
|-------------|-----------------|---------------|-----|
| 403 (Forbidden) | 200 | `/index.html` | 5 minutes |
| 404 (Not Found) | 200 | `/index.html` | 5 minutes |

This allows React Router to handle all routes client-side.

### Cache Behavior (Dev)

| Property | Value | Notes |
|----------|-------|-------|
| **Default TTL** | 5 minutes | Fast iteration in dev |
| **Min TTL** | 1 minute | Floor for cache time |
| **Max TTL** | 1 hour | Ceiling for cache time |

> **Production Note:** For production, replace the custom cache policy with `cloudfront.CachePolicy.CACHING_OPTIMIZED` and use longer TTLs.

### Stack Outputs

| Output | Export Name | Description |
|--------|-------------|-------------|
| `FrontendDistributionDomain` | `*-DistributionDomain` | CloudFront domain (e.g., `d123abc.cloudfront.net`) |
| `FrontendDistributionId` | `*-DistributionId` | Distribution ID for cache invalidation |
| `FrontendBucketName` | `*-BucketName` | S3 bucket name for asset uploads |
| `FrontendBucketArn` | `*-BucketArn` | S3 bucket ARN for IAM policies |
| `FrontendUrl` | `*-Url` | Full HTTPS URL (e.g., `https://d123abc.cloudfront.net`) |

---

## API & WebSocket Endpoints

### HTTP API (ApiCoreStack)

| Output | Export Name | Example Value |
|--------|-------------|---------------|
| `HttpApiId` | `BarkBase-Dev-ApiCore-HttpApiId` | `abc123xyz` |
| `HttpApiEndpoint` | `BarkBase-Dev-ApiCore-HttpApiEndpoint` | `https://abc123xyz.execute-api.us-east-2.amazonaws.com` |
| `HttpApiUrl` | `BarkBase-Dev-ApiCore-HttpApiUrl` | Same as endpoint (default stage) |

**Usage:** Set `VITE_API_BASE_URL` and `VITE_API_BASE_URL_UNIFIED` to the `HttpApiEndpoint` value.

### WebSocket API (RealtimeStack)

| Output | Export Name | Example Value |
|--------|-------------|---------------|
| `WebSocketApiId` | `BarkBase-Dev-Realtime-WebSocketApiId` | `xyz789abc` |
| `WebSocketApiEndpoint` | `BarkBase-Dev-Realtime-WebSocketApiEndpoint` | `wss://xyz789abc.execute-api.us-east-2.amazonaws.com/dev` |

**Usage:** Set `VITE_WS_URL` to the `WebSocketApiEndpoint` value.

---

## Frontend Environment Variables

The frontend uses Vite environment variables (prefixed with `VITE_`). These must be set at **build time** since Vite embeds them into the JavaScript bundle.

### Required Variables

| Variable | Description | Source |
|----------|-------------|--------|
| `VITE_API_BASE_URL_UNIFIED` | Primary API base URL | `HttpApiEndpoint` from ApiCoreStack |
| `VITE_API_BASE_URL` | Fallback/legacy API URL | Same as `VITE_API_BASE_URL_UNIFIED` in dev |
| `VITE_AWS_REGION` | AWS region | `us-east-2` |
| `VITE_USER_POOL_ID` | Cognito User Pool ID | Existing: `us-east-2_v94gByGOq` |
| `VITE_CLIENT_ID` | Cognito App Client ID | Existing: `2csen8hj7b53ec2q9bc0siubja` |

### Auth Mode Variables

| Variable | Description | Source |
|----------|-------------|--------|
| `VITE_AUTH_MODE` | Authentication mode | `hosted` (default), `password`, or `db` |
| `VITE_COGNITO_DOMAIN` | Cognito hosted UI domain | Cognito configuration |
| `VITE_REDIRECT_URI` | OAuth redirect URI | `FrontendUrl` from FrontendStack |
| `VITE_LOGOUT_URI` | OAuth logout URI | `FrontendUrl` from FrontendStack |

### WebSocket Variables

| Variable | Description | Source |
|----------|-------------|--------|
| `VITE_WS_URL` | WebSocket API URL | `WebSocketApiEndpoint` from RealtimeStack |
| `VITE_WEBSOCKET_ENABLED` | Enable WebSocket features | `true` or `false` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Alternative API URL (legacy) | Falls back to `VITE_API_BASE_URL` |
| `VITE_PORT` | Local dev server port | `5173` |

### Example `.env.production` File

```bash
# API Configuration (from CDK outputs)
VITE_API_BASE_URL_UNIFIED=https://abc123xyz.execute-api.us-east-2.amazonaws.com
VITE_API_BASE_URL=https://abc123xyz.execute-api.us-east-2.amazonaws.com

# AWS Configuration
VITE_AWS_REGION=us-east-2

# Cognito Configuration (existing resources)
VITE_USER_POOL_ID=us-east-2_v94gByGOq
VITE_CLIENT_ID=2csen8hj7b53ec2q9bc0siubja
VITE_COGNITO_DOMAIN=your-cognito-domain.auth.us-east-2.amazoncognito.com
VITE_AUTH_MODE=hosted

# OAuth Redirects (from CDK outputs)
VITE_REDIRECT_URI=https://d123abc.cloudfront.net
VITE_LOGOUT_URI=https://d123abc.cloudfront.net

# WebSocket Configuration (from CDK outputs)
VITE_WS_URL=wss://xyz789abc.execute-api.us-east-2.amazonaws.com/dev
VITE_WEBSOCKET_ENABLED=true
```

---

## Deployment Workflow

### 1. Deploy CDK Stacks

```bash
cd aws/cdk
npx cdk deploy BarkBase-Dev-Frontend BarkBase-Dev-ApiCore BarkBase-Dev-Realtime --outputs-file outputs.json
```

### 2. Extract Outputs

After deployment, extract values from `outputs.json`:

```json
{
  "BarkBase-Dev-Frontend": {
    "FrontendDistributionDomain": "d123abc.cloudfront.net",
    "FrontendBucketName": "barkbase-dev-frontend-bucket-abc123"
  },
  "BarkBase-Dev-ApiCore": {
    "HttpApiEndpoint": "https://abc123xyz.execute-api.us-east-2.amazonaws.com"
  },
  "BarkBase-Dev-Realtime": {
    "WebSocketApiEndpoint": "wss://xyz789abc.execute-api.us-east-2.amazonaws.com/dev"
  }
}
```

### 3. Build Frontend

```bash
cd frontend

# Set environment variables
export VITE_API_BASE_URL_UNIFIED=https://abc123xyz.execute-api.us-east-2.amazonaws.com
export VITE_API_BASE_URL=$VITE_API_BASE_URL_UNIFIED
export VITE_WS_URL=wss://xyz789abc.execute-api.us-east-2.amazonaws.com/dev
# ... (set other variables)

# Build
npm run build
```

### 4. Upload to S3

```bash
aws s3 sync dist/ s3://barkbase-dev-frontend-bucket-abc123/ --delete
```

### 5. Invalidate CloudFront Cache

```bash
aws cloudfront create-invalidation \
  --distribution-id E1234567EXAMPLE \
  --paths "/*"
```

---

## CDK Output Mapping Summary

| CDK Stack | CDK Output | Frontend Variable |
|-----------|------------|-------------------|
| ApiCoreStack | `HttpApiEndpoint` | `VITE_API_BASE_URL_UNIFIED`, `VITE_API_BASE_URL` |
| RealtimeStack | `WebSocketApiEndpoint` | `VITE_WS_URL` |
| FrontendStack | `FrontendUrl` | `VITE_REDIRECT_URI`, `VITE_LOGOUT_URI` |
| (Manual) | Cognito User Pool | `VITE_USER_POOL_ID` |
| (Manual) | Cognito Client | `VITE_CLIENT_ID` |
| (Manual) | Cognito Domain | `VITE_COGNITO_DOMAIN` |

---

## For ChatGPT Summary

Key facts about FrontendStack and environment configuration:

- **FrontendStack** hosts the React SPA via S3 (private bucket) + CloudFront (OAC)
- **S3 bucket** uses versioning, S3-managed encryption, blocked public access
- **CloudFront** redirects HTTP to HTTPS, enables compression, uses HTTP/2+3
- **SPA routing** handled by returning `/index.html` for 403/404 errors
- **Dev cache policy** uses short TTLs (5 min default) for fast iteration
- **Stack outputs** include distribution domain, distribution ID, bucket name, bucket ARN, and full URL
- **HttpApiEndpoint** from ApiCoreStack maps to `VITE_API_BASE_URL_UNIFIED`
- **WebSocketApiEndpoint** from RealtimeStack maps to `VITE_WS_URL`
- **FrontendUrl** from FrontendStack maps to `VITE_REDIRECT_URI` and `VITE_LOGOUT_URI`
- **Cognito values** (`USER_POOL_ID`, `CLIENT_ID`, `COGNITO_DOMAIN`) are from existing resources
- **Build-time injection** - Vite embeds env vars into bundle; must rebuild for changes
- **Deployment** requires S3 sync + CloudFront invalidation after frontend build
- **Resource count** for FrontendStack: ~8-12 resources (bucket, distribution, OAC, cache policy)
- **Dev removal policy** is DESTROY with autoDeleteObjects; change for production
- **No custom domain** configured yet; uses CloudFront default `*.cloudfront.net` domain

---

*End of Frontend & Environment Configuration*

