# BarkBase Infrastructure - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

This guide will get your BarkBase development environment up and running quickly.

### Prerequisites

- AWS CLI configured
- Node.js 18+ installed
- AWS CDK CLI: `npm install -g aws-cdk`

### Step 1: Configure Environment (2 minutes)

```bash
cd aws/cdk

# Copy environment template
cp .env.example .env

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 64)

# Update .env file
cat > .env << EOF
STAGE=dev
JWT_SECRET=$JWT_SECRET
DB_NAME=barkbase
DB_USER=postgres
ENABLE_VPC_ENDPOINTS=false
ENABLE_RDS_PROXY=false
DEPLOY_LAMBDAS_IN_VPC=false
MONITORING_EMAIL=your-email@domain.com
EOF

# Load environment
export $(cat .env | xargs)
```

### Step 2: Deploy Infrastructure (15-20 minutes)

```bash
# Install dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy
cdk deploy

# Type 'y' to confirm
```

**Expected Output**:
```
╔═══════════════════════════════════════════════════════════════════╗
║ BARKBASE INFRASTRUCTURE DEPLOYMENT                                ║
╠═══════════════════════════════════════════════════════════════════╣
║ Stage:                dev                                         ║
║ VPC Endpoints:        DISABLED                                    ║
║ RDS Proxy:            DISABLED                                    ║
║ Lambdas in VPC:       NO                                          ║
║ Log Retention:        30 days                                     ║
║ Backup Retention:     7 days                                      ║
║ RDS Instance:         t4g.micro                                   ║
║ Multi-AZ:             NO                                          ║
╚═══════════════════════════════════════════════════════════════════╝

✓ Creating RDS instance...
✓ Creating Lambda functions...
✓ Configuring monitoring...

✅ Deployment complete!
```

### Step 3: Verify Deployment (1 minute)

```bash
# Check CloudWatch Dashboard
aws cloudwatch list-dashboards

# Get database endpoint
aws cloudformation describe-stacks \
  --stack-name BarkBaseCdkStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
  --output text

# Confirm monitoring email (check inbox)
```

### Step 4: Access CloudWatch Dashboard

```bash
# Get dashboard URL
aws cloudformation describe-stacks \
  --stack-name BarkBaseCdkStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DashboardUrl`].OutputValue' \
  --output text

# Open in browser
# Bookmark for quick access!
```

## ✅ You're Ready to Develop!

Your infrastructure is now deployed with:
- ✅ RDS PostgreSQL database with automated backups
- ✅ Lambda functions with 30-day log retention
- ✅ CloudWatch monitoring dashboard
- ✅ Security & operational alerts
- ✅ ~$39.91/month cost (optimized for development)

## 📊 What You Get

### Development Environment
- **Cost**: ~$39.91/month (44% cheaper than default)
- **RDS**: t4g.micro with 7-day backups
- **Logs**: 30-day retention
- **Monitoring**: Full dashboard with alarms
- **Performance**: Fast (no VPC cold starts)

### CloudWatch Dashboard Includes
- API Gateway request count & latency
- RDS CPU, connections, storage
- Lambda invocations, errors, duration
- Security events (failed logins, auth failures)

### Monitoring Alerts (Email)
- RDS CPU > 80%
- Database connections > 80
- Storage < 2 GB
- API latency > 2000ms
- Lambda errors > 10 in 5 min
- Failed login attempts > 10 in 1 min

## 🔧 Daily Development Workflow

### View Logs
```bash
# Tail Lambda logs
aws logs tail /aws/lambda/barkbase-UsersApiFunction-xxx --follow

# Query logs
aws logs insights query \
  --log-group-name /aws/lambda/barkbase-UsersApiFunction-xxx \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, @message | sort @timestamp desc | limit 20'
```

### Database Access
```bash
# Get endpoint
DB_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name BarkBaseCdkStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
  --output text)

# Get credentials
aws secretsmanager get-secret-value \
  --secret-id BarkBaseCdkStack-DbSecret-xxx \
  --query 'SecretString' \
  --output text | jq .

# Connect
psql -h $DB_ENDPOINT -U postgres -d barkbase
```

### Redeploy After Changes
```bash
cd aws/cdk

# Quick redeploy
cdk deploy --require-approval never

# Or with confirmation
cdk deploy
```

## 💰 Cost Management

### Current Costs (Development)
- RDS t4g.micro: $12.41/month
- Lambda invocations: ~$10/month
- CloudWatch logs: ~$5/month
- S3 storage: ~$5/month
- API Gateway: ~$3.50/month
- Backups: ~$2/month
- Alarms: ~$2/month
- **TOTAL**: ~$39.91/month

### What We Saved
- ❌ VPC Endpoints: -$14.40/month
- ❌ RDS Proxy: -$10.00/month
- ✅ Log Retention (30d): -$10.00/month
- **TOTAL SAVINGS**: -$34.40/month (46% reduction)

## 🆘 Quick Troubleshooting

### Issue: JWT_SECRET Error
```bash
export JWT_SECRET=$(openssl rand -base64 64)
cdk deploy
```

### Issue: RDS Not Ready
```bash
# Wait 10-15 minutes after deployment
aws rds describe-db-instances \
  --query 'DBInstances[0].DBInstanceStatus'

# Expected: "available"
```

### Issue: No Monitoring Emails
```bash
# Check spam folder
# Resend confirmation:
aws sns subscribe \
  --topic-arn <TOPIC_ARN> \
  --protocol email \
  --notification-endpoint your-email@domain.com
```

### Issue: Dashboard Shows No Data
```bash
# Invoke Lambda to generate metrics
aws lambda invoke \
  --function-name barkbase-UsersApiFunction-xxx \
  --payload '{}' \
  response.json

# Wait 5-10 minutes, then refresh dashboard
```

## 📚 Full Documentation

- **Infrastructure Details**: `aws/INFRASTRUCTURE_FIXES.md`
- **Security Guide**: `aws/SECURITY_DEPLOYMENT_GUIDE.md`
- **Environment Config**: `aws/cdk/.env.example`

## 🎯 Next Steps

1. ✅ Confirm monitoring email subscriptions
2. ✅ Bookmark CloudWatch Dashboard
3. ✅ Run database migrations
4. ✅ Test API endpoints
5. ✅ Set up AWS Budget alerts

## 🚀 Staging/Production Deployment

When ready to deploy to staging or production:

```bash
# Update .env
export STAGE=prod
export ENABLE_VPC_ENDPOINTS=true
export ENABLE_RDS_PROXY=true
export DEPLOY_LAMBDAS_IN_VPC=true

# Generate new JWT secret
export JWT_SECRET=$(openssl rand -base64 64)

# Deploy
cdk deploy
```

**Production Cost**: ~$87.72/month
- Multi-AZ RDS for high availability
- VPC endpoints for private networking
- RDS Proxy for connection pooling
- 90-day log retention
- 30-day database backups
- Performance Insights enabled

---

**Need Help?**
- Read: `aws/INFRASTRUCTURE_FIXES.md`
- Issues: https://github.com/anthropics/barkbase/issues
- Email: dev@barkbase.com

---

**Version**: 1.0 | **Updated**: January 2025 | **Status**: ✅ Production-Ready
