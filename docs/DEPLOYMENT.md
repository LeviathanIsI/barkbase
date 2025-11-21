# Deployment Documentation

## Overview
Barkbase uses AWS CDK (Cloud Development Kit) for infrastructure as code and deployment automation.

## Prerequisites

### Required Tools
- Node.js 18.x or higher
- AWS CLI configured with credentials
- AWS CDK CLI: `npm install -g aws-cdk`
- Git for version control

### AWS Account Setup
```bash
# Configure AWS CLI
aws configure
# Enter: AWS Access Key ID
# Enter: AWS Secret Access Key
# Region: us-east-2
# Output format: json
```

---

## CDK Deployment Process

### 1. Initial Setup
```bash
# Navigate to CDK directory
cd aws/cdk

# Install dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap aws://ACCOUNT-ID/us-east-2
```

### 2. Deploy Stack
```bash
# Deploy with automatic approval
npx cdk deploy --require-approval never

# Deploy with manual approval
npx cdk deploy

# Deploy specific stack
npx cdk deploy Barkbase-dev
```

### 3. Deployment Output
```
╔═══════════════════════════════════════════════════════════════════╗
║ BARKBASE INFRASTRUCTURE DEPLOYMENT                                ║
╠═══════════════════════════════════════════════════════════════════╣
║ Stage:                dev                                          ║
║ VPC Endpoints:        DISABLED                                     ║
║ RDS Proxy:            DISABLED                                     ║
║ Lambdas in VPC:       NO                                           ║
║ Log Retention:        30 days                                        ║
║ Backup Retention:     7 days                                        ║
║ RDS Instance:         t4g.micro                                  ║
║ Multi-AZ:             NO                                           ║
╚═══════════════════════════════════════════════════════════════════╝

✅  Barkbase-dev

Outputs:
Barkbase-dev.ApiUrl = https://smvidb1rd0.execute-api.us-east-2.amazonaws.com/
Barkbase-dev.CloudFrontDomainName = d35n2u5q4fhsrd.cloudfront.net
```

---

## Environment Variables Setup

### Required Secrets in AWS Secrets Manager
```javascript
// Database credentials (automatic)
"Barkbase-dev-db-credentials-VybGGM": {
  "username": "postgres",
  "password": "generated-password",
  "engine": "postgres",
  "host": "barkbase-dev-public.xxx.rds.amazonaws.com",
  "port": 5432,
  "dbname": "barkbase"
}
```

### Lambda Environment Variables
```typescript
// Set in cdk-stack.ts
environment: {
  DB_SECRET_ARN: dbSecret.secretArn,
  JWT_SECRET: jwtSecret,
  JWT_ROTATION_SECRET: jwtRotationSecret,
  COGNITO_USER_POOL_ID: userPool.userPoolId,
  COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
  STAGE: stage,
  NODE_ENV: 'production'
}
```

### Configuration by Environment
```typescript
const config = {
  dev: {
    instanceType: 't4g.micro',
    multiAz: false,
    backupRetention: 7,
    logRetention: 30,
    lambdaMemory: 1024,
    lambdaTimeout: 30
  },
  staging: {
    instanceType: 't4g.small',
    multiAz: false,
    backupRetention: 14,
    logRetention: 60,
    lambdaMemory: 1024,
    lambdaTimeout: 30
  },
  production: {
    instanceType: 't4g.medium',
    multiAz: true,
    backupRetention: 30,
    logRetention: 90,
    lambdaMemory: 2048,
    lambdaTimeout: 60
  }
};
```

---

## Stack Components

### 1. Database (RDS PostgreSQL)
```typescript
// Existing RDS instance configuration
const database = {
  instance: 'barkbase-dev-public',
  endpoint: 'barkbase-dev-public.xxx.rds.amazonaws.com',
  port: 5432,
  database: 'barkbase'
};
```

### 2. Lambda Functions (7 Services)
- AuthApiFunction
- EntityServiceFunction
- AnalyticsServiceFunction
- OperationsServiceFunction
- ConfigServiceFunction
- FinancialServiceFunction
- UserProfileServiceFunction

### 3. API Gateway
- HTTP API with JWT authorizer
- WebSocket API for real-time features
- CloudFront distribution for static assets

### 4. Authentication (Cognito)
- User Pool for authentication
- User Pool Client for application
- JWT authorizer for API Gateway

---

## Common Deployment Issues and Fixes

### Issue 1: Lambda Code Too Large
**Error:** `Code storage limit exceeded`
**Solution:**
```bash
# Use Lambda layers for dependencies
cd aws/lambdas/layers/nodejs
npm install
cd ../..
cdk deploy
```

### Issue 2: Missing Permissions
**Error:** `AccessDeniedException`
**Solution:**
```typescript
// Grant permissions in CDK
dbSecret.grantRead(lambdaFunction);
```

### Issue 3: Timeout During Deployment
**Error:** `Stack creation timeout`
**Solution:**
```bash
# Increase timeout and deploy in stages
cdk deploy --timeout 30
```

### Issue 4: Database Connection Issues
**Error:** `Connection refused`
**Solution:**
```typescript
// Ensure Lambda not in VPC (to avoid NAT costs)
// Or add VPC endpoints if Lambda must be in VPC
```

### Issue 5: Duplicate Function Declarations
**Error:** `SyntaxError: Identifier already declared`
**Solution:**
```bash
# Remove duplicate declarations
# Keep only const arrow functions
```

---

## Rollback Procedures

### Automatic Rollback
CDK automatically rolls back on deployment failure:
```
UPDATE_ROLLBACK_IN_PROGRESS
UPDATE_ROLLBACK_COMPLETE
```

### Manual Rollback
```bash
# View stack history
aws cloudformation describe-stacks --stack-name Barkbase-dev

# Rollback to previous version
aws cloudformation cancel-update-stack --stack-name Barkbase-dev

# Or delete and redeploy
cdk destroy Barkbase-dev
cdk deploy Barkbase-dev
```

### Database Rollback
```sql
-- Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier barkbase-dev-restored \
  --db-snapshot-identifier manual-snapshot-2024-01-20
```

---

## Monitoring Deployment

### CloudFormation Events
```bash
# Watch deployment progress
aws cloudformation describe-stack-events \
  --stack-name Barkbase-dev \
  --max-items 20
```

### CDK Diff
```bash
# Preview changes before deployment
cdk diff Barkbase-dev
```

### Lambda Logs
```bash
# View Lambda logs
aws logs tail /aws/lambda/EntityServiceFunction --follow
```

---

## Cost Optimization Settings

### Development Environment
```typescript
// Minimal costs for development
{
  vpcEndpoints: false,      // Save ~$14.40/month
  rdsProxy: false,          // Save ~$15/month
  lambdasInVpc: false,      // No NAT Gateway costs
  instanceType: 't4g.micro', // Smallest instance
  multiAz: false            // Single AZ
}
```

### Production Environment
```typescript
// High availability for production
{
  vpcEndpoints: true,
  rdsProxy: true,
  lambdasInVpc: true,
  instanceType: 't4g.medium',
  multiAz: true
}
```

---

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd aws/cdk
          npm ci

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-2

      - name: Deploy CDK stack
        run: |
          cd aws/cdk
          npx cdk deploy --require-approval never
```

---

## Post-Deployment Validation

### 1. API Health Check
```bash
# Test API endpoint
curl https://smvidb1rd0.execute-api.us-east-2.amazonaws.com/health
```

### 2. Lambda Function Test
```bash
# Invoke Lambda directly
aws lambda invoke \
  --function-name EntityServiceFunction \
  --payload '{"test": true}' \
  response.json
```

### 3. Database Connectivity
```bash
# Test database connection
psql -h barkbase-dev-public.xxx.rds.amazonaws.com \
     -U postgres \
     -d barkbase \
     -c "SELECT version();"
```

### 4. CloudWatch Metrics
```bash
# Check Lambda errors
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=EntityServiceFunction \
  --start-time 2024-01-20T00:00:00Z \
  --end-time 2024-01-20T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

---

## Emergency Procedures

### High Error Rate
```bash
# 1. Check Lambda logs
aws logs tail /aws/lambda/EntityServiceFunction --follow

# 2. Check database status
aws rds describe-db-instances --db-instance-identifier barkbase-dev-public

# 3. Rollback if needed
cdk deploy --rollback
```

### Database Issues
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Kill stuck queries
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active' AND query_start < now() - interval '5 minutes';
```

### Lambda Cold Start Issues
```typescript
// Add provisioned concurrency
const lambda = new Function(this, 'Function', {
  // ... other config
  provisionedConcurrentExecutions: 5
});
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Run tests locally
- [ ] Check CDK diff for unexpected changes
- [ ] Backup database if needed
- [ ] Notify team of deployment window

### During Deployment
- [ ] Monitor CloudFormation events
- [ ] Watch for rollback triggers
- [ ] Check Lambda logs for errors
- [ ] Verify API Gateway updates

### Post-Deployment
- [ ] Run smoke tests
- [ ] Check CloudWatch metrics
- [ ] Verify all endpoints working
- [ ] Test authentication flow
- [ ] Confirm database connectivity
- [ ] Update documentation if needed

---

## Recent Deployment Fixes

### JWT Authorizer on Proxy Routes
- **Date:** 2024-01-20
- **Issue:** Missing authorizer on proxy routes
- **Fix:** Added `authorizer: httpAuthorizer` to CDK
- **Deployment Time:** 83.51 seconds

### Entity Service Function Update
- **Date:** 2024-01-20
- **Issue:** Duplicate function declarations
- **Fix:** Removed duplicate async functions
- **Deployment Time:** 79.42 seconds