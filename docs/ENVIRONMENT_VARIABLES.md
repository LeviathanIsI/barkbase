# BarkBase Environment Variables

This document lists all environment variables required for BarkBase deployment.

## Required for Core Functionality

### Database

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgresql://user:pass@host:5432/dbname?sslmode=require` |
| `DB_SECRET_ARN` | AWS Secrets Manager ARN for DB credentials | Yes (AWS) | `arn:aws:secretsmanager:us-east-2:123456789:secret:barkbase/db-xxx` |

### Authentication

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `COGNITO_USER_POOL_ID` | AWS Cognito User Pool ID | Yes | `us-east-2_aBcDeFgHi` |
| `COGNITO_CLIENT_ID` | AWS Cognito App Client ID | Yes | `1234567890abcdefghij` |
| `COGNITO_DOMAIN` | Cognito hosted UI domain | Yes | `barkbase-auth.auth.us-east-2.amazoncognito.com` |
| `JWT_ISSUER` | JWT token issuer URL | Yes | `https://cognito-idp.us-east-2.amazonaws.com/us-east-2_xxx` |

### AWS Configuration

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `AWS_REGION` | Primary AWS region | Yes | `us-east-2` |
| `AWS_ACCOUNT_ID` | AWS Account ID | Yes | `211125574375` |

---

## Required for Payments

### Stripe Integration

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe API secret key | Yes (for payments) | `sk_live_xxx` or `sk_test_xxx` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature secret | Yes (for webhooks) | `whsec_xxx` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (frontend) | Yes (frontend) | `pk_live_xxx` or `pk_test_xxx` |

**How to obtain:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy the Secret key for `STRIPE_SECRET_KEY`
3. Copy the Publishable key for `STRIPE_PUBLISHABLE_KEY`
4. For webhooks, go to Developers > Webhooks > Add endpoint
5. After creating endpoint, reveal signing secret for `STRIPE_WEBHOOK_SECRET`

---

## Required for Email (SES)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `SES_FROM_EMAIL` | Verified SES sender email | Yes (for email) | `noreply@yourdomain.com` |
| `SES_REGION` | AWS region for SES | No (defaults to AWS_REGION) | `us-east-1` |

**Setup requirements:**
1. Verify your domain or email in AWS SES
2. Request production access if sending to unverified addresses
3. Set up DKIM/SPF records for deliverability

---

## Optional Integrations

### Twilio SMS

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID | No | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | No | `your_auth_token` |
| `TWILIO_PHONE_NUMBER` | Twilio phone number for sending | No | `+15551234567` |

**How to obtain:**
1. Go to [Twilio Console](https://console.twilio.com/)
2. Copy Account SID and Auth Token from dashboard
3. Buy or use existing phone number for `TWILIO_PHONE_NUMBER`

### Square Payments

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `SQUARE_ACCESS_TOKEN` | Square API access token | No | `EAAA...` |
| `SQUARE_LOCATION_ID` | Square location ID | No | `LID...` |
| `SQUARE_ENVIRONMENT` | `sandbox` or `production` | No | `production` |

**How to obtain:**
1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Create or select application
3. Copy Access Token from Credentials tab
4. Get Location ID from Locations API or Square Dashboard

### QuickBooks Integration

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `QUICKBOOKS_CLIENT_ID` | QB OAuth client ID | No | `ABxxx...` |
| `QUICKBOOKS_CLIENT_SECRET` | QB OAuth client secret | No | `xxx...` |
| `QUICKBOOKS_REDIRECT_URI` | OAuth callback URL | No | `https://api.yourdomain.com/api/v1/integrations/quickbooks/callback` |
| `QUICKBOOKS_ENVIRONMENT` | `sandbox` or `production` | No | `production` |

**How to obtain:**
1. Go to [Intuit Developer Portal](https://developer.intuit.com/)
2. Create new app or select existing
3. Copy Client ID and Client Secret from Keys & OAuth tab
4. Add redirect URI to authorized redirect URIs

---

## Setting Environment Variables

### In AWS CDK (Recommended for Production)

Environment variables are configured in `aws/cdk/lib/ServicesStack.ts`:

```typescript
const financialService = new lambda.Function(this, 'FinancialService', {
  // ...
  environment: {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
    // ... other vars
  },
});
```

### In AWS Console

1. Go to Lambda > Functions > Select function
2. Configuration tab > Environment variables
3. Click Edit and add key-value pairs

### Using AWS Secrets Manager (Recommended for Secrets)

For sensitive values, use AWS Secrets Manager:

```typescript
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

const stripeSecret = secretsmanager.Secret.fromSecretNameV2(
  this, 'StripeSecret', 'barkbase/stripe'
);

// Grant read access to Lambda
stripeSecret.grantRead(financialService);

// Reference in Lambda
environment: {
  STRIPE_SECRET_ARN: stripeSecret.secretArn,
}
```

### In Local Development

Create a `.env` file in the Lambda directory:

```bash
# aws/lambdas/financial-service/.env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**Important:** Never commit `.env` files to version control!

---

## Environment Variable Validation

Each Lambda service validates required variables at startup. Missing required variables will cause the Lambda to fail immediately with a clear error message.

Example validation (in Lambda handler):

```javascript
const REQUIRED_VARS = ['DATABASE_URL', 'COGNITO_USER_POOL_ID'];

for (const varName of REQUIRED_VARS) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}
```

---

## Security Best Practices

1. **Never hardcode secrets** - Always use environment variables or Secrets Manager
2. **Use different keys for test/production** - Stripe, Twilio, etc. provide test mode keys
3. **Rotate secrets regularly** - Especially after team member departures
4. **Limit access** - Use IAM policies to restrict who can view secrets
5. **Audit usage** - Enable CloudTrail logging for Secrets Manager access

---

## Quick Reference

### Minimum Required for Basic Operation

```bash
DATABASE_URL=postgresql://...
COGNITO_USER_POOL_ID=us-east-2_xxx
COGNITO_CLIENT_ID=xxx
AWS_REGION=us-east-2
```

### Full Production Setup

```bash
# Core
DATABASE_URL=postgresql://...
COGNITO_USER_POOL_ID=us-east-2_xxx
COGNITO_CLIENT_ID=xxx
AWS_REGION=us-east-2

# Payments
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email
SES_FROM_EMAIL=noreply@yourdomain.com

# SMS (optional)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+15551234567

# Square (optional, alternative to Stripe)
SQUARE_ACCESS_TOKEN=xxx
SQUARE_LOCATION_ID=xxx

# QuickBooks (optional)
QUICKBOOKS_CLIENT_ID=xxx
QUICKBOOKS_CLIENT_SECRET=xxx
QUICKBOOKS_REDIRECT_URI=https://...
```

---

## Troubleshooting

### "Missing environment variable" error

Check CloudWatch logs for the specific variable name. Ensure it's set in:
- Lambda environment variables (AWS Console or CDK)
- Secrets Manager (if using secret references)

### "Invalid API key" errors

- Verify you're using the correct environment (test vs production)
- Check the key hasn't been rotated or revoked
- Ensure proper permissions in IAM

### Email not sending

- Verify SES sender is verified
- Check SES is in production mode (not sandbox)
- Verify SES region matches configuration
