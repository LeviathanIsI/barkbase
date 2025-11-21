# Claude Agent Instructions for Barkbase Project

## Important: Documentation First Policy

### Before Making Changes
Agents working on this project MUST:

1. **Review relevant documentation BEFORE making structural changes**
   - For Lambda changes: Review `/docs/LAMBDA_FUNCTIONS.md`
   - For API changes: Review `/docs/API_ROUTES.md`
   - For database changes: Review `/docs/DATABASE_SCHEMA.md`
   - For security changes: Review `/docs/SECURITY_PATTERNS.md`
   - For deployment: Review `/docs/DEPLOYMENT.md`
   - For debugging: Review `/docs/TROUBLESHOOTING.md`

2. **Document changes AFTER implementation**
   - Update the relevant documentation files with:
     - What changed
     - Why it was changed
     - How it was implemented
     - Date of change
     - Any breaking changes or migration requirements

3. **Include lessons learned**
   - Add any new error patterns discovered to `/docs/TROUBLESHOOTING.md`
   - Update security patterns if new vulnerabilities were found/fixed
   - Document any deployment issues and resolutions

---

## Project Overview

Barkbase is a multi-tenant pet boarding management system built with:
- **Frontend:** React with TypeScript
- **Backend:** 7 consolidated AWS Lambda functions (previously 44)
- **Database:** PostgreSQL on AWS RDS
- **Infrastructure:** AWS CDK for IaC
- **Authentication:** AWS Cognito with JWT

---

## Critical Architectural Decisions

### 1. Lambda Consolidation
- **Decision:** Consolidated from 44 individual Lambdas to 7 service-oriented functions
- **Rationale:** Reduced cold starts, simplified deployment, better code reuse
- **Impact:** All routes now go through service routers

### 2. Multi-Tenant Architecture
- **Decision:** Row-level tenant isolation using tenantId column
- **Implementation:** Every query must include tenant filtering
- **Security:** Tenant context extracted from JWT claims with database fallback

### 3. Cost Optimization
- **Decision:** Lambda functions NOT in VPC
- **Rationale:** Avoid NAT Gateway costs (~$45/month)
- **Trade-off:** Using public RDS endpoint with SSL

---

## Known Issues and Fixes

### Recent Fixes Applied
1. **JWT Authorizer on Proxy Routes** (Fixed 2024-01-20)
   - Added missing `authorizer: httpAuthorizer` to CDK proxy routes
   - Files: `cdk-stack.ts` lines 1567, 1572, 1577

2. **Duplicate Function Declarations** (Fixed 2024-01-20)
   - Removed duplicate async function declarations in entity-service
   - File: `entity-service/index.js` lines 644-1034 removed

3. **SourceIP Scoping Issue** (Fixed 2024-01-20)
   - Moved sourceIp extraction to function scope for error handling
   - File: `auth-api/index.js` line 250

4. **Database Permissions** (Fixed 2024-01-20)
   - Added `dbSecret.grantRead()` for all service Lambdas
   - File: `cdk-stack.ts` lambdasNeedingDbAccess array

---

## Development Guidelines

### 1. Security First
- Always validate JWT tokens
- Include tenant isolation in every query
- Never expose sensitive data in error messages
- Use parameterized queries to prevent SQL injection

### 2. Error Handling
- Use standard error response format
- Log full errors internally, generic messages to client
- Include request context in error logs

### 3. Performance
- Reuse database connections (connection pooling)
- Initialize resources outside Lambda handler
- Monitor cold starts and optimize as needed

### 4. Testing
- Test all endpoints after deployment
- Verify multi-tenant isolation
- Check error scenarios

---

## Common Commands

### Deployment
```bash
cd aws/cdk
npx cdk deploy --require-approval never
```

### View Logs
```bash
aws logs tail /aws/lambda/EntityServiceFunction --follow
```

### Test Endpoints
```javascript
// Use test-endpoints.js script
node test-endpoints.js
```

---

## File Structure

```
barkbase-react/
├── frontend/               # React frontend
├── aws/
│   ├── cdk/               # CDK infrastructure
│   │   └── lib/
│   │       └── cdk-stack.ts  # Main CDK configuration
│   └── lambdas/           # Lambda functions
│       ├── auth-api/
│       ├── entity-service/
│       ├── analytics-service/
│       ├── operations-service/
│       ├── config-service/
│       ├── financial-service/
│       └── user-profile-service/
├── docs/                  # Documentation
│   ├── LAMBDA_FUNCTIONS.md
│   ├── API_ROUTES.md
│   ├── DATABASE_SCHEMA.md
│   ├── SECURITY_PATTERNS.md
│   ├── DEPLOYMENT.md
│   └── TROUBLESHOOTING.md
└── test-endpoints.js      # Endpoint testing script
```

---

## Contact Information

- **Repository:** https://github.com/your-org/barkbase
- **Issues:** Report at https://github.com/your-org/barkbase/issues
- **AWS Account:** 211125574375
- **Region:** us-east-2

---

## Important Reminders

1. **ALWAYS** check documentation before making changes
2. **NEVER** skip multi-tenant filtering in queries
3. **ALWAYS** update documentation after changes
4. **NEVER** deploy without testing
5. **ALWAYS** consider cost implications of AWS resource changes
6. **NEVER** expose sensitive data in logs or error messages

---

## Recent Lessons Learned

1. **Proxy routes need explicit authorizer configuration** - They don't inherit from parent routes
2. **Function declarations can't be duplicated** - Use const arrow functions consistently
3. **Cognito tokens may not have tenantId** - Always implement database fallback
4. **Lambda in VPC is expensive** - Use public endpoints with SSL instead
5. **Connection pooling is critical** - Prevents "too many connections" errors

---

## Next Improvements to Consider

1. Add audit logging table for compliance
2. Implement caching layer for frequently accessed data
3. Add monitoring dashboards for business metrics
4. Consider implementing API versioning strategy
5. Add automated testing pipeline
6. Implement backup and disaster recovery procedures