# Environment Variables

## Overview

BarkBase uses environment variables for configuration. Variables are separated into:
- **Frontend (Vite):** Prefixed with `VITE_`, exposed to browser
- **Backend (Lambda):** Server-side only, never exposed to client

---

## Frontend Environment Variables

**Location:** `frontend/.env`, `frontend/.env.development`, `frontend/.env.production`

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `https://api.barkbase.io` |
| `VITE_COGNITO_USER_POOL_ID` | AWS Cognito User Pool ID | `us-east-2_aBcDeFgHi` |
| `VITE_COGNITO_CLIENT_ID` | Cognito App Client ID | `1a2b3c4d5e6f7g8h9i0j` |
| `VITE_COGNITO_DOMAIN` | Cognito hosted UI domain | `auth.barkbase.io` |
| `VITE_COGNITO_REGION` | AWS region | `us-east-2` |
| `VITE_REDIRECT_URI` | OAuth callback URL | `https://app.barkbase.io/auth/callback` |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `VITE_CLOUDFRONT_URL` | CDN URL for assets | - | `https://cdn.barkbase.io` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe public key | - | `pk_live_xxx` |
| `VITE_SENTRY_DSN` | Sentry error tracking | - | `https://xxx@sentry.io/xxx` |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API | - | `AIzaSy...` |
| `VITE_POSTHOG_KEY` | PostHog analytics | - | `phc_xxx` |
| `VITE_POSTHOG_HOST` | PostHog host | - | `https://app.posthog.com` |

### Feature Flags

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_ENABLE_ANALYTICS` | Enable analytics | `false` |
| `VITE_ENABLE_CHAT_SUPPORT` | Enable chat widget | `false` |
| `VITE_ENABLE_DARK_MODE` | Enable dark mode toggle | `true` |
| `VITE_AUTH_MODE` | Auth mode (`cognito` or `mock`) | `cognito` |
| `VITE_MOCK_API` | Use mock API data | `false` |
| `VITE_DEBUG_MODE` | Enable debug console | `false` |

### Application Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_APP_NAME` | Application name | `Barkbase` |
| `VITE_DEFAULT_LOCALE` | Default locale | `en-US` |
| `VITE_DEFAULT_TIMEZONE` | Default timezone | `America/New_York` |
| `VITE_MAX_UPLOAD_SIZE` | Max upload size (bytes) | `10485760` (10MB) |

### Example Frontend .env

```bash
# frontend/.env.production

# API
VITE_API_URL=https://api.barkbase.io
VITE_CLOUDFRONT_URL=https://cdn.barkbase.io

# Authentication
VITE_COGNITO_USER_POOL_ID=us-east-2_aBcDeFgHi
VITE_COGNITO_CLIENT_ID=1a2b3c4d5e6f7g8h9i0j
VITE_COGNITO_DOMAIN=auth.barkbase.io
VITE_COGNITO_REGION=us-east-2
VITE_REDIRECT_URI=https://app.barkbase.io/auth/callback
VITE_AUTH_MODE=cognito

# Payments
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here

# Monitoring
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx

# Features
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DARK_MODE=true

# App
VITE_APP_NAME=Barkbase
VITE_DEFAULT_TIMEZONE=America/New_York
```

---

## Backend Environment Variables

**Location:** Lambda environment configuration (SAM template or AWS Console)

### Database

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgresql://user:pass@host:5432/db` |
| `DB_POOL_MIN` | Min pool connections | No | `2` |
| `DB_POOL_MAX` | Max pool connections | No | `10` |

### AWS Services

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `AWS_REGION` | AWS region | Yes | `us-east-2` |
| `S3_BUCKET` | S3 bucket for uploads | Yes | `barkbase-uploads-prod` |
| `SES_FROM_EMAIL` | SES sender email | Yes | `noreply@barkbase.io` |
| `SES_REPLY_TO_EMAIL` | Reply-to email | No | `support@barkbase.io` |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution | No | `E1234567890ABC` |

### Authentication

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `COGNITO_USER_POOL_ID` | User Pool ID | Yes | `us-east-2_aBcDeFgHi` |
| `COGNITO_CLIENT_ID` | App Client ID | Yes | `1a2b3c4d5e6f7g8h9i0j` |

### Payment Processing

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe secret key | Yes* | `sk_live_xxx` |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | Yes* | `whsec_xxx` |
| `STRIPE_PLATFORM_FEE_PERCENT` | Platform fee % | No | `2.5` |

*Required if payment processing is enabled

### SMS Notifications (Twilio)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID | No | `ACxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | No | - |
| `TWILIO_PHONE_NUMBER` | Sender phone number | No | `+15551234567` |

### Rate Limiting

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `RATE_LIMIT_TABLE` | DynamoDB table name | No | `barkbase-rate-limits` |

### Logging & Monitoring

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `LOG_LEVEL` | Log level | No | `INFO` |
| `SENTRY_DSN` | Sentry DSN (backend) | No | `https://xxx@sentry.io/xxx` |

### Application

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `NODE_ENV` | Environment | `production` | `production` |
| `API_VERSION` | API version prefix | `v1` | `v1` |
| `CORS_ORIGINS` | Allowed CORS origins | - | `https://app.barkbase.io` |
| `JWT_EXPIRY` | Token expiry (seconds) | `3600` | `3600` |
| `MAX_FILE_SIZE` | Max upload size | `10485760` | `10485760` |

### Feature Flags

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_WEBHOOKS` | Enable webhook processing | `true` |
| `ENABLE_SMS_NOTIFICATIONS` | Enable SMS | `true` |
| `ENABLE_EMAIL_NOTIFICATIONS` | Enable email | `true` |
| `ENABLE_AUDIT_LOGGING` | Enable audit logs | `true` |

### Encryption

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `KMS_KEY_ID` | KMS key for encryption | No | `arn:aws:kms:...` |

### Caching

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `REDIS_URL` | ElastiCache endpoint | No | `redis://xxx:6379` |
| `CACHE_TTL` | Default cache TTL | No | `300` |

### Example Backend .env

```bash
# backend/.env.production

# Database
DATABASE_URL=postgresql://barkbase_admin:secure_password@db.xxx.us-east-2.rds.amazonaws.com:5432/barkbase_prod
DB_POOL_MIN=2
DB_POOL_MAX=10

# AWS
AWS_REGION=us-east-2
S3_BUCKET=barkbase-uploads-production
SES_FROM_EMAIL=noreply@barkbase.io
SES_REPLY_TO_EMAIL=support@barkbase.io
CLOUDFRONT_DISTRIBUTION_ID=E1234567890ABC

# Cognito
COGNITO_USER_POOL_ID=us-east-2_aBcDeFgHi
COGNITO_CLIENT_ID=1a2b3c4d5e6f7g8h9i0j

# Stripe
STRIPE_SECRET_KEY=sk_live_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PLATFORM_FEE_PERCENT=2.5

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15551234567

# Rate Limiting
RATE_LIMIT_TABLE=barkbase-rate-limits

# Logging
LOG_LEVEL=INFO
SENTRY_DSN=https://xxx@sentry.io/xxx

# Application
NODE_ENV=production
API_VERSION=v1
CORS_ORIGINS=https://app.barkbase.io
JWT_EXPIRY=3600
MAX_FILE_SIZE=10485760

# Features
ENABLE_WEBHOOKS=true
ENABLE_SMS_NOTIFICATIONS=true
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_AUDIT_LOGGING=true
```

---

## Secrets Management

### What Goes in Secrets Manager

These should be in AWS Secrets Manager, not environment variables:

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | Full connection string with password |
| `STRIPE_SECRET_KEY` | Stripe secret API key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |
| `TWILIO_AUTH_TOKEN` | Twilio authentication token |

### Accessing Secrets in Lambda

```javascript
const { SecretsManager } = require('@aws-sdk/client-secrets-manager');

const secretsManager = new SecretsManager({});

async function getSecret(secretName) {
  const response = await secretsManager.getSecretValue({
    SecretId: secretName,
  });
  return JSON.parse(response.SecretString);
}

// Usage
const dbCredentials = await getSecret('barkbase/production/database');
const connectionString = dbCredentials.DATABASE_URL;
```

### SAM Template Secret Reference

```yaml
Resources:
  FinancialServiceFunction:
    Type: AWS::Serverless::Function
    Properties:
      Environment:
        Variables:
          STRIPE_SECRET_KEY: !Sub '{{resolve:secretsmanager:barkbase/${Environment}/stripe:SecretString:secretKey}}'
```

---

## Environment-Specific Configuration

### Development

```bash
# frontend/.env.development
VITE_API_URL=http://localhost:3001
VITE_AUTH_MODE=mock
VITE_MOCK_API=true
VITE_DEBUG_MODE=true
```

### Staging

```bash
# frontend/.env.staging
VITE_API_URL=https://api-staging.barkbase.io
VITE_SENTRY_DSN=https://xxx@sentry.io/staging
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

### Production

```bash
# frontend/.env.production
VITE_API_URL=https://api.barkbase.io
VITE_SENTRY_DSN=https://xxx@sentry.io/production
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

---

## CI/CD Environment Variables

### GitHub Actions Secrets

| Secret | Used For |
|--------|----------|
| `AWS_ACCESS_KEY_ID` | AWS deployment |
| `AWS_SECRET_ACCESS_KEY` | AWS deployment |
| `VITE_API_URL` | Frontend build |
| `VITE_COGNITO_USER_POOL_ID` | Frontend build |
| `VITE_COGNITO_CLIENT_ID` | Frontend build |
| `VITE_SENTRY_DSN` | Frontend build |
| `S3_BUCKET` | Frontend deployment |
| `CLOUDFRONT_DISTRIBUTION_ID` | Cache invalidation |
| `CODECOV_TOKEN` | Coverage upload |

### Setting GitHub Secrets

```bash
gh secret set AWS_ACCESS_KEY_ID --body "AKIAIOSFODNN7EXAMPLE"
gh secret set AWS_SECRET_ACCESS_KEY --body "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

---

## Security Best Practices

### DO

✅ Use Secrets Manager for sensitive values
✅ Use different values per environment
✅ Rotate secrets regularly
✅ Use IAM roles instead of access keys where possible
✅ Audit secret access via CloudTrail

### DON'T

❌ Commit `.env` files with real secrets
❌ Log environment variables
❌ Use production secrets in development
❌ Share secrets via Slack/email
❌ Use the same secret across environments

### Example .gitignore

```gitignore
# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Keep example files
!.env.example
```
