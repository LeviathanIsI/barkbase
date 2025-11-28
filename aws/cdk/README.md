# BarkBase AWS CDK Infrastructure

This directory contains the AWS CDK v2 infrastructure code for BarkBase.

## Architecture

The infrastructure is organized into the following stacks (deployed in order):

1. **NetworkStack** - VPC, subnets, NAT Gateway, security groups
2. **DatabaseStack** - PostgreSQL RDS with Secrets Manager
3. **AuthStack** - Cognito User Pool, App Client, custom domain
4. **ServicesStack** - Lambda functions and layers
5. **ApiCoreStack** - HTTP API Gateway with routes

## Prerequisites

- Node.js 20.x or later
- AWS CLI configured with appropriate credentials
- CDK CLI (`npm install -g aws-cdk`)

## Setup

```bash
# Install dependencies
npm install

# Install Lambda layer dependencies
cd ../layers/db-layer/nodejs && npm install && cd -
cd ../layers/shared-layer/nodejs && npm install && cd -

# Bootstrap CDK (first time only)
npm run bootstrap
```

## Deployment

### Development Environment

```bash
# View what will be deployed
npm run diff:dev

# Deploy all stacks
npm run deploy:dev

# Generate .env files from stack outputs
npm run generate-env:dev
```

### Production Environment

```bash
# View what will be deployed
npm run diff:prod

# Deploy all stacks
npm run deploy:prod

# Generate .env files from stack outputs
npm run generate-env:prod
```

## Stack Outputs

After deployment, the following outputs are available:

### NetworkStack
- `VpcId` - VPC identifier
- `PrivateSubnetIds` - Comma-separated private subnet IDs
- `LambdaSecurityGroupId` - Security group for Lambda functions
- `BastionSecurityGroupId` - Security group for bastion host

### DatabaseStack
- `DbEndpoint` - RDS PostgreSQL endpoint
- `DbSecretArn` - Secrets Manager ARN for DB credentials

### AuthStack
- `UserPoolId` - Cognito User Pool ID
- `UserPoolClientId` - Cognito App Client ID
- `CognitoDomain` - Cognito domain URL
- `JwksUrl` - JWKS URL for JWT validation

### ServicesStack
- `DbLayerArn` - Database layer ARN
- `SharedLayerArn` - Shared utilities layer ARN
- `AuthApiFunctionArn` - Auth API Lambda ARN
- `UserProfileFunctionArn` - User Profile Lambda ARN

### ApiCoreStack
- `ApiUrl` - HTTP API Gateway URL

## Environment Files

After deployment, run `npm run generate-env:dev` or `npm run generate-env:prod` to generate:

- `frontend/.env.development` or `frontend/.env.production`
- `backend/.env.development` or `backend/.env.production`

## Lambda Layers

### db-layer
PostgreSQL client with Secrets Manager integration:
- `pg` - PostgreSQL client
- Connection pooling
- Credential caching

### shared-layer
Authentication and security utilities:
- JWT validation with JWKS caching
- Password hashing with bcrypt
- Request authentication middleware

## Cleanup

```bash
# Destroy development environment
npm run destroy:dev

# Destroy production environment (use with caution!)
npm run destroy:prod
```

## Troubleshooting

### CDK Bootstrap Error
If you get a bootstrap error, run:
```bash
cdk bootstrap aws://ACCOUNT_ID/us-east-2
```

### Permission Errors
Ensure your AWS credentials have the following permissions:
- CloudFormation full access
- EC2 VPC management
- RDS management
- Cognito management
- Lambda management
- API Gateway management
- Secrets Manager management
- IAM role creation

### Lambda Layer Issues
If Lambda functions fail with module not found errors:
1. Ensure layer dependencies are installed:
   ```bash
   cd ../layers/db-layer/nodejs && npm install
   cd ../layers/shared-layer/nodejs && npm install
   ```
2. Redeploy the services stack

