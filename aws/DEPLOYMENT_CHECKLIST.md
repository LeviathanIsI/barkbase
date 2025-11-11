# BarkBase Production Deployment Checklist

**Version**: 1.0
**Target Environment**: Production
**Deployment Date**: _________________
**Deployment Lead**: _________________

---

## Pre-Deployment Requirements

### Phase 1: Security Standardization (BLOCKING) 🔴

**Status**: ⬜ NOT STARTED

- [ ] **Complete Lambda Standardization** (2-3 weeks)
  - [ ] Replace wildcard CORS in 54 Lambda functions
  - [ ] Implement `getSecureHeaders()` from security-utils
  - [ ] Standardize error responses (remove stack traces from client)
  - [ ] Add audit logging to all CRUD operations
  - [ ] Add security headers (CSP, HSTS, X-Frame-Options)
  - [ ] Test all endpoints after changes
  - [ ] Update LAMBDA_STANDARDIZATION_REPORT.md with completion status

**Completion Criteria**: All 55 Lambda functions use shared security-utils

**Estimated Effort**: 80-120 hours (2-3 engineers)

---

### Phase 2: Critical Features (BLOCKING) 🔴

**Status**: ⬜ NOT STARTED

- [ ] **Implement File Upload** (8 hours)
  - [ ] Update `frontend/src/lib/apiClient.js` uploadClient function
  - [ ] Integrate with `get-upload-url` Lambda
  - [ ] Test S3 pre-signed URL generation
  - [ ] Test direct browser-to-S3 upload
  - [ ] Test file download flow
  - [ ] Add upload progress tracking
  - [ ] Add error handling for failed uploads

- [ ] **Apply Database Migrations** (2 hours)
  - [ ] Backup production database
  - [ ] Run `aws/scripts/schema-fix-tenant-isolation.sql`
  - [ ] Verify `PetOwner` table has `tenantId`
  - [ ] Verify `CheckIn` table has `tenantId`
  - [ ] Verify `CheckOut` table has `tenantId`
  - [ ] Test multi-tenant isolation
  - [ ] Update DATABASE_SCHEMA_AUDIT.md

- [ ] **Add Performance Indexes** (1 hour)
  - [ ] Add index on `CheckIn(bookingId, checkInDate)`
  - [ ] Add index on `CheckOut(bookingId, checkOutDate)`
  - [ ] Add index on `PetOwner(petId, ownerId)`
  - [ ] Run `ANALYZE` to update query planner statistics
  - [ ] Verify query performance improvements

- [ ] **Update Cognito User Attributes** (4 hours)
  - [ ] Implement AWS Amplify `fetchUserAttributes()`
  - [ ] Update `frontend/src/stores/auth.js` setSession method
  - [ ] Remove manual JWT decoding
  - [ ] Test authentication flow
  - [ ] Verify user attributes are populated correctly

**Completion Criteria**: All critical features implemented and tested

---

## Infrastructure Preparation

### AWS Account Setup ✅

- [ ] **Production AWS Account**
  - [ ] Separate AWS account for production (recommended)
  - [ ] IAM roles configured for deployments
  - [ ] Multi-factor authentication (MFA) enabled
  - [ ] CloudTrail enabled for audit logging
  - [ ] AWS Config enabled for compliance
  - [ ] Budget alerts configured

- [ ] **AWS CDK Configuration**
  - [ ] CDK bootstrapped in production account
  - [ ] CDK version verified (latest stable)
  - [ ] Deployment IAM role has necessary permissions
  - [ ] Cross-account roles configured (if applicable)

---

### Environment Variables ✅

- [ ] **Backend Environment** (`aws/cdk/.env`)
  ```bash
  STAGE=prod
  JWT_SECRET=<64-character-secure-secret>
  JWT_SECRET_OLD=<previous-secret-for-rotation>
  DB_NAME=barkbase_prod
  DB_USER=postgres
  MONITORING_EMAIL=ops@barkbase.com
  ENABLE_VPC_ENDPOINTS=true
  ENABLE_RDS_PROXY=true
  DEPLOY_LAMBDAS_IN_VPC=true
  LOG_RETENTION_DAYS=90
  BACKUP_RETENTION_DAYS=30
  RDS_INSTANCE_CLASS=db.t4g.small  # or larger
  RDS_MULTI_AZ=true
  ```

- [ ] **Frontend Environment** (`frontend/.env.production`)
  ```bash
  VITE_API_URL=https://api.barkbase.com
  VITE_AWS_REGION=us-east-1
  VITE_USER_POOL_ID=<production-cognito-pool>
  VITE_CLIENT_ID=<production-cognito-client>
  VITE_COGNITO_DOMAIN=<production-cognito-domain>
  VITE_REDIRECT_URI=https://app.barkbase.com
  VITE_LOGOUT_URI=https://app.barkbase.com
  ```

- [ ] **Secrets Verification**
  - [ ] JWT_SECRET is 64+ characters (base64)
  - [ ] Generated using: `openssl rand -base64 64`
  - [ ] Stored in AWS Secrets Manager
  - [ ] Never committed to Git
  - [ ] Rotation schedule documented

---

### Domain & SSL ✅

- [ ] **Domain Configuration**
  - [ ] Domain registered: `barkbase.com`
  - [ ] DNS hosted on Route 53
  - [ ] SSL certificate requested from ACM
  - [ ] SSL certificate validated
  - [ ] Subdomains configured:
    - [ ] `app.barkbase.com` → Frontend (CloudFront)
    - [ ] `api.barkbase.com` → API Gateway
    - [ ] `ws.barkbase.com` → WebSocket API

- [ ] **CloudFront Distribution**
  - [ ] Distribution created for frontend
  - [ ] SSL certificate attached
  - [ ] Custom domain configured
  - [ ] Origin: S3 bucket with static website hosting
  - [ ] Cache policies configured
  - [ ] Error pages configured (SPA fallback)

---

### Database Setup ✅

- [ ] **RDS Configuration**
  - [ ] Instance class: `db.t4g.small` or larger
  - [ ] Multi-AZ deployment enabled
  - [ ] Automated backups enabled (30-day retention)
  - [ ] Point-in-time recovery enabled
  - [ ] Enhanced monitoring enabled
  - [ ] Performance Insights enabled
  - [ ] Encryption at rest enabled
  - [ ] Backup window configured (low-traffic hours)
  - [ ] Maintenance window configured

- [ ] **Database Security**
  - [ ] Security group restricts access to Lambda VPC only
  - [ ] Master password stored in Secrets Manager
  - [ ] Password rotation configured
  - [ ] SSL/TLS enforcement enabled
  - [ ] No public accessibility

- [ ] **Initial Database Setup**
  - [ ] Schema created from migrations
  - [ ] Initial admin user created
  - [ ] Initial tenant created
  - [ ] Database credentials verified
  - [ ] Connection pooling tested

---

### Monitoring & Alerting ✅

- [ ] **CloudWatch Dashboard**
  - [ ] Production dashboard created
  - [ ] API Gateway metrics added
  - [ ] RDS metrics added
  - [ ] Lambda metrics added
  - [ ] Security metrics added
  - [ ] Custom business metrics added

- [ ] **CloudWatch Alarms**
  - [ ] RDS CPU > 80% → SNS alert
  - [ ] RDS connections > 80 → SNS alert
  - [ ] RDS storage < 5 GB → SNS alert
  - [ ] API latency > 2000ms → SNS alert
  - [ ] API 5xx errors > 10 in 5 min → SNS alert
  - [ ] Lambda errors > 10 in 5 min → SNS alert
  - [ ] Failed logins > 10 in 1 min → SNS alert
  - [ ] Failed auth > 50 in 5 min → SNS alert

- [ ] **SNS Topics**
  - [ ] Critical alerts topic created
  - [ ] Warning alerts topic created
  - [ ] Email subscriptions confirmed
  - [ ] SMS subscriptions configured (optional)
  - [ ] PagerDuty integration configured (optional)

- [ ] **Log Retention**
  - [ ] CloudWatch Logs retention: 90 days
  - [ ] Lambda function logs configured
  - [ ] API Gateway access logs configured
  - [ ] RDS error logs configured
  - [ ] Audit logs separate retention (365 days)

---

## Security Hardening

### Network Security ✅

- [ ] **VPC Configuration**
  - [ ] VPC endpoints enabled for production
  - [ ] Private subnets for RDS
  - [ ] NAT Gateway for Lambda internet access
  - [ ] Security groups properly configured
  - [ ] Network ACLs configured
  - [ ] VPC Flow Logs enabled

- [ ] **WAF (Web Application Firewall)**
  - [ ] WAF enabled on CloudFront
  - [ ] Rate limiting rules configured
  - [ ] SQL injection protection enabled
  - [ ] XSS protection enabled
  - [ ] Geo-blocking configured (if needed)
  - [ ] IP allowlist/blocklist configured

---

### Application Security ✅

- [ ] **API Security**
  - [ ] API Gateway rate limiting: 100 req/sec per key
  - [ ] Auth endpoints rate limiting: 10 req/sec
  - [ ] JWT authorizer configured
  - [ ] CORS allowlist (no wildcards)
  - [ ] Request validation enabled
  - [ ] API keys for third-party access

- [ ] **Cognito Configuration**
  - [ ] User pool created
  - [ ] Password policy enforced (min 8 chars, complexity)
  - [ ] MFA enabled (optional for admins)
  - [ ] Account takeover protection enabled
  - [ ] Advanced security features enabled
  - [ ] Lambda triggers configured:
    - [ ] Pre-signup trigger
    - [ ] Post-confirmation trigger
  - [ ] Email/SMS verification configured

- [ ] **Secrets Management**
  - [ ] All secrets in AWS Secrets Manager
  - [ ] Rotation schedule configured
  - [ ] Lambda has access to secrets
  - [ ] CDK retrieves secrets (not hardcoded)

---

### Compliance & Audit ✅

- [ ] **Audit Logging**
  - [ ] All Lambda functions log audit events
  - [ ] Structured JSON logging format
  - [ ] CloudWatch Insights queries created
  - [ ] Audit log retention: 365 days
  - [ ] Audit log review process documented

- [ ] **Data Protection**
  - [ ] Encryption at rest (RDS, S3)
  - [ ] Encryption in transit (TLS 1.2+)
  - [ ] Data backup procedures documented
  - [ ] Data retention policies documented
  - [ ] Data deletion procedures documented (GDPR)

- [ ] **Access Controls**
  - [ ] IAM roles follow least privilege
  - [ ] Service accounts for automation only
  - [ ] No long-term credentials in code
  - [ ] Regular access review scheduled
  - [ ] Separation of duties enforced

---

## Testing & Validation

### Pre-Deployment Testing ✅

- [ ] **Staging Environment**
  - [ ] Deployed to staging environment
  - [ ] Staging uses production-like configuration
  - [ ] Full smoke testing completed
  - [ ] Load testing completed
  - [ ] Security testing completed
  - [ ] Multi-tenant testing completed

- [ ] **Unit Tests**
  - [ ] Critical path tests written
  - [ ] Auth flow tests passing
  - [ ] Booking flow tests passing
  - [ ] Payment flow tests passing
  - [ ] Test coverage > 60% for critical paths

- [ ] **Integration Tests**
  - [ ] API endpoint tests passing
  - [ ] Database integration tests passing
  - [ ] External service integration tests passing
  - [ ] Multi-tenant isolation tests passing

- [ ] **End-to-End Tests**
  - [ ] User registration flow
  - [ ] Login flow
  - [ ] Booking creation flow
  - [ ] Pet registration flow
  - [ ] Payment processing flow
  - [ ] Invoice generation flow

---

### Security Testing ✅

- [ ] **Penetration Testing**
  - [ ] SQL injection testing
  - [ ] XSS testing
  - [ ] CSRF testing
  - [ ] Authentication bypass testing
  - [ ] Authorization bypass testing
  - [ ] Tenant isolation testing
  - [ ] Rate limiting testing

- [ ] **Vulnerability Scanning**
  - [ ] Dependencies scanned (npm audit)
  - [ ] Container images scanned (if applicable)
  - [ ] Infrastructure scanned (AWS Inspector)
  - [ ] All HIGH/CRITICAL vulnerabilities resolved

- [ ] **Security Review**
  - [ ] Code review completed
  - [ ] Security checklist verified
  - [ ] OWASP Top 10 verified
  - [ ] Security team sign-off

---

### Performance Testing ✅

- [ ] **Load Testing**
  - [ ] Baseline performance established
  - [ ] Load test with 100 concurrent users
  - [ ] Load test with 500 concurrent users
  - [ ] Load test with 1000 concurrent users
  - [ ] Database connection pool tested under load
  - [ ] Lambda concurrency limits verified
  - [ ] Auto-scaling verified

- [ ] **Performance Benchmarks**
  - [ ] API response time < 200ms (average)
  - [ ] API response time < 500ms (p95)
  - [ ] API response time < 1000ms (p99)
  - [ ] Database query time < 100ms (average)
  - [ ] Page load time < 2 seconds

---

## Deployment Execution

### Pre-Deployment Steps ✅

- [ ] **Final Verification**
  - [ ] All blockers resolved
  - [ ] Code freeze implemented
  - [ ] Deployment plan reviewed
  - [ ] Rollback plan documented
  - [ ] Team briefed on deployment
  - [ ] Customer communication drafted

- [ ] **Backup Current State**
  - [ ] Database backup completed
  - [ ] Current infrastructure documented
  - [ ] Current environment variables documented
  - [ ] Rollback instructions verified

---

### Deployment Steps ✅

1. **Backend Deployment**

   ```bash
   cd aws/cdk

   # Verify environment
   cat .env

   # Review changes
   cdk diff

   # Deploy infrastructure
   cdk deploy --require-approval never

   # Verify deployment
   aws cloudformation describe-stacks --stack-name BarkBaseCdkStack
   ```

   - [ ] CDK deployment completed successfully
   - [ ] All Lambda functions deployed
   - [ ] RDS instance healthy
   - [ ] API Gateway deployed
   - [ ] CloudWatch alarms created
   - [ ] No deployment errors

2. **Database Migration**

   ```bash
   # Connect to production database
   DB_ENDPOINT=$(aws cloudformation describe-stacks \
     --stack-name BarkBaseCdkStack \
     --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
     --output text)

   # Run migrations
   psql -h $DB_ENDPOINT -U postgres -d barkbase_prod < scripts/schema-fix-tenant-isolation.sql
   psql -h $DB_ENDPOINT -U postgres -d barkbase_prod < scripts/add-performance-indexes.sql

   # Verify migrations
   psql -h $DB_ENDPOINT -U postgres -d barkbase_prod -c "\dt"
   psql -h $DB_ENDPOINT -U postgres -d barkbase_prod -c "\di"
   ```

   - [ ] Migrations executed successfully
   - [ ] Tables verified
   - [ ] Indexes created
   - [ ] Foreign keys intact
   - [ ] Data integrity verified

3. **Frontend Deployment**

   ```bash
   cd frontend

   # Build for production
   npm run build

   # Upload to S3
   aws s3 sync dist/ s3://barkbase-frontend-prod --delete

   # Invalidate CloudFront cache
   aws cloudfront create-invalidation \
     --distribution-id EXXXXXXXXXXXXX \
     --paths "/*"
   ```

   - [ ] Frontend build successful
   - [ ] Assets uploaded to S3
   - [ ] CloudFront cache invalidated
   - [ ] Service worker updated

4. **DNS Configuration**

   ```bash
   # Verify DNS propagation
   dig app.barkbase.com
   dig api.barkbase.com
   ```

   - [ ] DNS records updated
   - [ ] SSL certificates active
   - [ ] HTTPS enforced
   - [ ] HTTP redirects to HTTPS

---

### Post-Deployment Verification ✅

- [ ] **Smoke Testing**
  - [ ] Website loads: https://app.barkbase.com
  - [ ] Login works
  - [ ] Registration works
  - [ ] Booking creation works
  - [ ] API endpoints responding
  - [ ] WebSocket connections working
  - [ ] File uploads working
  - [ ] Email notifications working

- [ ] **Monitoring Verification**
  - [ ] CloudWatch Dashboard showing metrics
  - [ ] All alarms in OK state
  - [ ] Logs appearing in CloudWatch
  - [ ] SNS notifications working
  - [ ] Test alarm to verify alerting

- [ ] **Performance Verification**
  - [ ] API response times normal
  - [ ] Database query performance normal
  - [ ] No Lambda cold start issues
  - [ ] Frontend load times acceptable

- [ ] **Security Verification**
  - [ ] HTTPS enforced
  - [ ] Security headers present
  - [ ] CORS configuration correct
  - [ ] JWT authentication working
  - [ ] Tenant isolation working
  - [ ] Audit logs recording events

---

## Post-Deployment Activities

### Monitoring (First 24 Hours) ✅

- [ ] **Hour 1**
  - [ ] Monitor dashboard for anomalies
  - [ ] Check error logs
  - [ ] Verify no alarms triggered
  - [ ] Monitor customer support channels

- [ ] **Hour 6**
  - [ ] Review CloudWatch metrics
  - [ ] Check database performance
  - [ ] Review audit logs
  - [ ] Customer feedback review

- [ ] **Hour 24**
  - [ ] Full system health check
  - [ ] Performance report generated
  - [ ] Issue log reviewed
  - [ ] Deployment retrospective scheduled

---

### Documentation Updates ✅

- [ ] **Post-Deployment Documentation**
  - [ ] Update deployment history
  - [ ] Document any issues encountered
  - [ ] Update runbooks if needed
  - [ ] Update architecture diagrams
  - [ ] Update API documentation
  - [ ] Update customer-facing documentation

---

### Customer Communication ✅

- [ ] **Launch Announcement**
  - [ ] Email to existing customers
  - [ ] Blog post published
  - [ ] Social media announcement
  - [ ] Press release (if applicable)

- [ ] **Support Readiness**
  - [ ] Support team briefed
  - [ ] FAQ updated
  - [ ] Known issues documented
  - [ ] Escalation procedures reviewed

---

## Rollback Plan

### Rollback Triggers 🚨

Execute rollback if:
- Critical security vulnerability discovered
- Data loss or corruption detected
- Service unavailable for > 5 minutes
- Database connectivity issues
- More than 50% of users affected by bugs
- Compliance violation detected

---

### Rollback Procedure

1. **Immediate Actions**
   ```bash
   # Revert frontend deployment
   aws s3 sync s3://barkbase-frontend-backup s3://barkbase-frontend-prod --delete
   aws cloudfront create-invalidation --distribution-id EXXXXXXXXXXXXX --paths "/*"

   # Revert backend (if needed)
   cd aws/cdk
   git checkout <previous-commit>
   cdk deploy
   ```

2. **Database Rollback** (if migrations were run)
   ```bash
   # Restore from backup
   aws rds restore-db-instance-to-point-in-time \
     --source-db-instance-identifier barkbase-prod \
     --target-db-instance-identifier barkbase-prod-rollback \
     --restore-time <timestamp-before-deployment>
   ```

3. **Communication**
   - [ ] Notify customers of issue
   - [ ] Post status page update
   - [ ] Internal team notification

---

## Success Criteria

Deployment is considered successful when:

- ✅ All infrastructure deployed without errors
- ✅ All database migrations completed successfully
- ✅ All smoke tests passing
- ✅ No critical alarms triggered
- ✅ No customer-reported issues
- ✅ Performance metrics within acceptable range
- ✅ Security scans show no new vulnerabilities
- ✅ Monitoring and alerting functional
- ✅ 24-hour stability period completed

---

## Sign-Off

### Pre-Deployment Approval

- [ ] **Engineering Lead**: _________________ Date: _______
- [ ] **Security Lead**: _________________ Date: _______
- [ ] **DevOps Lead**: _________________ Date: _______
- [ ] **Product Owner**: _________________ Date: _______
- [ ] **CTO**: _________________ Date: _______

### Post-Deployment Verification

- [ ] **Engineering Lead**: _________________ Date: _______
- [ ] **Operations Lead**: _________________ Date: _______
- [ ] **Customer Support**: _________________ Date: _______

### Production Sign-Off

- [ ] **CTO**: _________________ Date: _______
- [ ] **CEO**: _________________ Date: _______

---

## Appendix

### Useful Commands

**Check RDS Status**:
```bash
aws rds describe-db-instances \
  --db-instance-identifier barkbase-prod \
  --query 'DBInstances[0].DBInstanceStatus'
```

**View Lambda Logs**:
```bash
aws logs tail /aws/lambda/barkbase-auth-api-prod --follow
```

**Check API Gateway Metrics**:
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiName,Value=BarkBaseAPI \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

---

**Document Version**: 1.0
**Last Updated**: January 2025
**Classification**: Internal - Operations
