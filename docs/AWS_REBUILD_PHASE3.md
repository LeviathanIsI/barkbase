# BarkBase AWS Infrastructure - Phase 3

> **Status**: Ready for deployment  
> **Last Updated**: November 2024  
> **Phase**: Backend Services (Lambdas + DB connectivity)

## Overview

Phase 3 creates the backend Lambda functions with full database connectivity:

- **Unified Backend Lambda**: Express app via serverless-http
- **DB Healthcheck Lambda**: Simple connectivity test function
- **VPC Integration**: Lambdas run in private subnets with app security group
- **DB Layer Attached**: PostgreSQL + Secrets Manager integration
- **IAM Permissions**: Lambdas can read DB credentials from Secrets Manager

## Prerequisites

- Phase 1 complete (NetworkStack + DatabaseStack deployed)
- Phase 2 complete (SharedResourcesStack deployed with DbLayer)

## Deployment

```bash
cd aws/cdk
cdk deploy Barkbase-BackendServicesStack-dev
```

Or deploy all stacks:

```bash
cdk deploy --all
```

---

## Stack: Barkbase-BackendServicesStack-{env}

### Purpose
Creates the backend Lambda functions that connect to the database.

### Dependencies

| Stack | Resources Used |
|-------|----------------|
| NetworkStack | VPC, private subnets, app security group |
| DatabaseStack | Database credentials secret |
| SharedResourcesStack | DbLayer |

### Resources Created

| Resource | Description |
|----------|-------------|
| BackendFunction | Unified Express backend Lambda |
| DbHealthcheckFunction | DB connectivity test Lambda |
| Log Groups | CloudWatch log groups for each Lambda |

### CloudFormation Outputs

| Output Key | Description | Export Name |
|------------|-------------|-------------|
| `BackendFunctionArn` | Backend Lambda ARN | `Barkbase-BackendServicesStack-{env}-BackendFunctionArn` |
| `BackendFunctionName` | Backend Lambda name | `Barkbase-BackendServicesStack-{env}-BackendFunctionName` |
| `DbHealthcheckFunctionArn` | Healthcheck Lambda ARN | `Barkbase-BackendServicesStack-{env}-DbHealthcheckFunctionArn` |
| `DbHealthcheckFunctionName` | Healthcheck Lambda name | `Barkbase-BackendServicesStack-{env}-DbHealthcheckFunctionName` |

---

## Lambda: barkbase-{env}-backend

### Purpose
Runs the unified Express backend application via `serverless-http`.

### Configuration

| Setting | Value |
|---------|-------|
| Runtime | Node.js 18.x |
| Architecture | ARM64 |
| Handler | `lambda-handler.handler` |
| Memory | 512 MB |
| Timeout | 30 seconds |
| VPC | Private subnets with NAT |
| Security Group | App SG (allows outbound to DB) |

### Layers
- `DbLayer` - PostgreSQL client + Secrets Manager

### Environment Variables

| Variable | Value |
|----------|-------|
| `DB_SECRET_NAME` | `barkbase/{env}/postgres/credentials` |
| `DB_NAME` | `barkbase` |
| `BARKBASE_ENV` | `{env}` |
| `AWS_NODEJS_CONNECTION_REUSE_ENABLED` | `1` |
| `NODE_ENV` | `development` or `production` |

### IAM Permissions
- `secretsmanager:GetSecretValue` on DB credentials secret
- `secretsmanager:DescribeSecret` on DB credentials secret

---

## Lambda: barkbase-{env}-db-healthcheck

### Purpose
Simple function to verify database connectivity. Can be invoked manually for testing.

### Configuration

| Setting | Value |
|---------|-------|
| Runtime | Node.js 18.x |
| Architecture | ARM64 |
| Handler | `index.handler` |
| Memory | 256 MB |
| Timeout | 30 seconds |
| VPC | Private subnets with NAT |
| Security Group | App SG |

### Layers
- `DbLayer` - PostgreSQL client + Secrets Manager

### Environment Variables

| Variable | Value |
|----------|-------|
| `DB_SECRET_NAME` | `barkbase/{env}/postgres/credentials` |
| `DB_NAME` | `barkbase` |
| `BARKBASE_ENV` | `{env}` |
| `AWS_NODEJS_CONNECTION_REUSE_ENABLED` | `1` |

### IAM Permissions
- `secretsmanager:GetSecretValue` on DB credentials secret
- `secretsmanager:DescribeSecret` on DB credentials secret

### Testing

Invoke via AWS CLI:

```bash
aws lambda invoke \
  --function-name barkbase-dev-db-healthcheck \
  --payload '{}' \
  --cli-binary-format raw-in-base64-out \
  response.json

cat response.json
```

Expected successful response:

```json
{
  "statusCode": 200,
  "body": "{\"ok\":true,\"database\":{\"connected\":true,\"serverTime\":\"2024-11-28T...\"},\"timestamp\":\"...\"}"
}
```

Check CloudWatch logs for `[DB-HEALTHCHECK]` and `[DB-LAYER]` messages.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          VPC (10.0.0.0/16)                       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 Private Subnets (with NAT)                │   │
│  │                                                           │   │
│  │  ┌─────────────────────┐  ┌─────────────────────┐        │   │
│  │  │  Backend Lambda     │  │  Healthcheck Lambda │        │   │
│  │  │  + DbLayer          │  │  + DbLayer          │        │   │
│  │  │  + App SG           │  │  + App SG           │        │   │
│  │  └──────────┬──────────┘  └──────────┬──────────┘        │   │
│  │             │                        │                    │   │
│  └─────────────┼────────────────────────┼────────────────────┘   │
│                │                        │                        │
│  ┌─────────────┼────────────────────────┼────────────────────┐   │
│  │             │   Isolated Subnets     │                    │   │
│  │             │                        │                    │   │
│  │             ▼                        ▼                    │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │           RDS PostgreSQL (DB SG)                    │ │   │
│  │  │           Port 5432                                 │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │                                                           │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

                              │
                              ▼
                    ┌─────────────────┐
                    │ Secrets Manager │
                    │ (DB credentials)│
                    └─────────────────┘
```

---

## ServiceStackProps Helpers Used

### `buildDbEnvironment(environment, databaseName)`

Returns standard DB environment variables:

```typescript
{
  DB_SECRET_NAME: 'barkbase/{env}/postgres/credentials',
  DB_NAME: 'barkbase',
  BARKBASE_ENV: '{env}',
  AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
}
```

### `buildVpcLambdaProps(vpc, securityGroup)`

Returns VPC configuration for Lambda:

```typescript
{
  vpc: vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [securityGroup],
}
```

---

## Files Created/Modified

| File | Purpose |
|------|---------|
| `aws/cdk/lib/BackendServicesStack.ts` | New stack with backend + healthcheck Lambdas |
| `aws/cdk/bin/barkbase.ts` | Updated to instantiate BackendServicesStack |
| `docs/AWS_REBUILD_PHASE3.md` | This documentation |

---

## Future Phases

### Phase 4: Identity & API Gateway
- Cognito User Pool
- API Gateway HTTP API
- Route integrations to Backend Lambda
- Lambda authorizer

### Phase 5: Frontend & Jobs
- S3 + CloudFront
- EventBridge scheduled jobs

---

## Troubleshooting

### Lambda Cannot Connect to Database

1. **Check VPC configuration**: Lambda must be in private subnets
2. **Check security groups**: App SG must allow outbound to DB SG on port 5432
3. **Check NAT Gateway**: Lambda needs internet access for Secrets Manager
4. **Check IAM permissions**: Lambda role must have `secretsmanager:GetSecretValue`

### Healthcheck Returns Error

1. Check CloudWatch Logs for `[DB-LAYER]` messages
2. Verify `DB_SECRET_NAME` environment variable is set
3. Verify the secret exists in Secrets Manager
4. Test from Lambda console with a test event `{}`

### Timeout on Cold Start

- First invocation fetches secret from Secrets Manager
- Cold start may take 5-10 seconds
- Subsequent invocations use cached credentials and pool

