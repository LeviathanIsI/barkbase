# BarkBase Infrastructure - AWS Account Setup

This document contains placeholder fields for AWS account configuration. **DO NOT commit real credentials to this file.**

## Account Configuration

| Field | Placeholder | Description |
|-------|-------------|-------------|
| AWS Account ID | `<AWS_ACCOUNT_ID>` | Your 12-digit AWS account ID (e.g., `123456789012`) |
| IAM Admin Username | `<BARKBASE_ADMIN_USERNAME>` | IAM user with admin permissions for BarkBase infrastructure |
| Local AWS Profile | `<BARKBASE_ADMIN_PROFILE>` | Name of the AWS CLI profile configured on your machine |
| Default Region | `us-east-2` | Primary region for BarkBase infrastructure |

## Local Environment Setup

### 1. Configure AWS CLI Profile

Create or update your AWS credentials file with a dedicated BarkBase profile:

```bash
# Location: ~/.aws/credentials (Linux/Mac) or %USERPROFILE%\.aws\credentials (Windows)

[<BARKBASE_ADMIN_PROFILE>]
aws_access_key_id = <YOUR_ACCESS_KEY>
aws_secret_access_key = <YOUR_SECRET_KEY>
```

```bash
# Location: ~/.aws/config (Linux/Mac) or %USERPROFILE%\.aws\config (Windows)

[profile <BARKBASE_ADMIN_PROFILE>]
region = us-east-2
output = json
```

### 2. Secrets Storage (Machine-Only)

**CRITICAL: Never commit secrets to source control.**

Create a local secrets file that is excluded from git:

```bash
# Create a local secrets directory (gitignored)
mkdir -p ~/.barkbase/secrets

# Store secrets in a machine-only file
cat > ~/.barkbase/secrets/dev.env << 'EOF'
# BarkBase Dev Environment Secrets
# This file should ONLY exist on your local machine
# DO NOT commit this file to source control

AWS_ACCOUNT_ID=<YOUR_ACCOUNT_ID>
AWS_PROFILE=<BARKBASE_ADMIN_PROFILE>
AWS_REGION=us-east-2

# Database (generated during provisioning)
# DB_HOST=<will be output from DatabaseStack>
# DB_SECRET_ARN=<will be output from DatabaseStack>

# Cognito (generated during provisioning)
# COGNITO_USER_POOL_ID=<will be output from IdentityServicesStack>
# COGNITO_CLIENT_ID=<will be output from IdentityServicesStack>

# API (generated during provisioning)
# API_ENDPOINT=<will be output from ApiCoreStack>

# Third-party integrations (add as needed)
# STRIPE_SECRET_KEY=<your stripe key>
# STRIPE_WEBHOOK_SECRET=<your webhook secret>
EOF

# Set restrictive permissions (Unix/Mac)
chmod 600 ~/.barkbase/secrets/dev.env
```

### 3. Environment Variables for CDK

Set these environment variables before running CDK commands:

```bash
# Option 1: Export directly
export AWS_PROFILE=<BARKBASE_ADMIN_PROFILE>
export CDK_DEFAULT_ACCOUNT=<AWS_ACCOUNT_ID>
export CDK_DEFAULT_REGION=us-east-2

# Option 2: Source from secrets file
source ~/.barkbase/secrets/dev.env
```

### 4. Verify Configuration

```bash
# Verify AWS CLI is configured correctly
aws sts get-caller-identity --profile <BARKBASE_ADMIN_PROFILE>

# Expected output:
# {
#     "UserId": "AIDAXXXXXXXXXXXXXXXXX",
#     "Account": "<AWS_ACCOUNT_ID>",
#     "Arn": "arn:aws:iam::<AWS_ACCOUNT_ID>:user/<BARKBASE_ADMIN_USERNAME>"
# }
```

## Required IAM Permissions

The `<BARKBASE_ADMIN_USERNAME>` IAM user should have the following permissions:

- **For development/testing**: `AdministratorAccess` (managed policy)
- **For production** (recommended): Create a custom policy with least-privilege access

### Minimum Required Services

- CloudFormation (full access for CDK)
- S3 (for CDK bootstrap and frontend)
- Lambda (for service functions)
- API Gateway (for REST API)
- RDS (for Aurora PostgreSQL)
- Cognito (for authentication)
- Secrets Manager (for credentials)
- IAM (for creating roles)
- CloudWatch (for logs and monitoring)
- VPC/EC2 (for networking)
- CloudFront (for frontend CDN)
- Route53 (for custom domains)
- ACM (for SSL certificates)
- SQS/SNS (for messaging)
- DynamoDB (for real-time connection state)
- EventBridge (for scheduled jobs)
- Step Functions (for workflows)

## CDK Bootstrap

Before first deployment, bootstrap CDK in your account:

```bash
cd aws/cdk
npm install

# Bootstrap CDK (one-time per account/region)
npx cdk bootstrap aws://<AWS_ACCOUNT_ID>/us-east-2 --profile <BARKBASE_ADMIN_PROFILE>
```

## Security Reminders

1. **Never commit credentials** to source control
2. **Rotate access keys** regularly (every 90 days recommended)
3. **Use MFA** for the admin IAM user
4. **Review CloudTrail logs** for unauthorized access
5. **Enable AWS Config** for compliance monitoring
6. **Use Secrets Manager** for all application secrets
7. **Enable GuardDuty** for threat detection

## Support

For infrastructure questions, contact the BarkBase platform team.

