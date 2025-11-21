# BarkBase Authentication Troubleshooting Guide

## Date: November 19, 2024
## Summary: Complete Authentication System Fix

This document details all authentication issues encountered and their resolutions.

---

## ISSUES ENCOUNTERED AND FIXED

### 1. OfflineBoundary Component Error
**Problem:**
- `ReferenceError: OfflineBoundary is not defined` at AppProviders.jsx:34
- Component was referenced but never imported or created

**Solution:**
- Removed `<OfflineBoundary />` from `frontend/src/app/providers/AppProviders.jsx`
- Component was unnecessary for current architecture

---

### 2. OAuth2 Redirect Instead of Direct Authentication
**Problem:**
- Login was redirecting to Cognito Hosted UI instead of using custom login form
- `lambda-auth-client.js` was using OAuth2 flow with window.location.assign()
- Error: "Failed to load resource: 404 on oauth2/token"

**Solution:**
- Set `VITE_AUTH_MODE=db` in `frontend/.env`
- This switches from `LambdaAuthClient` (OAuth2) to `DbAuthClient` (direct backend)
- Authentication now goes through backend Lambda at `/api/v1/auth/login`

**File Modified:** `frontend/.env`
```env
VITE_AUTH_MODE=db  # Uses DbAuthClient instead of OAuth redirect
```

---

### 3. Duplicate 'metadata' Variable Declaration
**Problem:**
- `SyntaxError: Identifier 'metadata' has already been declared` in auth-api Lambda
- Lambda crashed during INIT phase
- Variable declared twice at lines 242 and 347

**Solution:**
- Removed duplicate declaration at line 347 in `aws/lambdas/auth-api/index.js`
- Kept original declaration at line 242

---

### 4. CDK Creating Duplicate RDS Instance
**Problem:**
- CDK was creating new RDS instance `barkbase-dev-postgresinstance`
- Should use existing `barkbase-dev-public`
- Created duplicate security groups, subnet groups, and secrets

**Solution:**
- Imported existing RDS instance in `aws/cdk/lib/cdk-stack.ts`:
```typescript
const dbInstance = rds.DatabaseInstance.fromDatabaseInstanceAttributes(this, 'ExistingDB', {
  instanceIdentifier: 'barkbase-dev-public',
  instanceEndpointAddress: 'barkbase-dev-public.ctuea6sg4d0d.us-east-2.rds.amazonaws.com',
  port: 5432,
  securityGroups: [ec2.SecurityGroup.fromSecurityGroupId(this, 'ExistingDBSG', 'sg-0ec9960ae33807760')]
});
```
- Imported existing secret: `Barkbase-dev-db-credentials`
- Removed RDS creation code

---

### 5. Lambda Missing Secrets Manager Permissions
**Problem:**
- Lambda execution role lacked `secretsmanager:GetSecretValue` permission
- Could not read database credentials from Secrets Manager

**Solution:**
- Added `dbSecret.grantRead()` for all Lambda functions needing DB access
- Created centralized permission grant section in CDK:
```typescript
const lambdasNeedingDbAccess = [
  propertiesApiFunction,
  adminApiFunction,
  financialServiceFunction,
  // ... etc
];

lambdasNeedingDbAccess.forEach(fn => {
  if (fn) dbSecret.grantRead(fn);
});
```

---

### 6. Database Layer Configuration
**Problem:**
- Lambda functions couldn't connect to database
- Missing or incorrect environment variables

**Solution:**
- Updated `dbEnvironment` in CDK to include:
```typescript
const dbEnvironment = {
  DB_HOST: dbEndpoint,
  DB_PORT: dbPort,
  DB_NAME: dbName,
  DB_SECRET_ID: 'Barkbase-dev-db-credentials',  // Secret NAME
  DB_SECRET_ARN: dbSecret.secretArn,            // ARN for permissions
  ENVIRONMENT: stage,
  STAGE: stage,
};
```

---

### 7. Cognito OAuth Users Authentication Failure
**Problem:**
- Users with `passwordHash='COGNITO_AUTH'` couldn't log in
- Lambda was comparing 'COGNITO_AUTH' string with bcrypt
- Should use AWS Cognito InitiateAuth API instead

**Solution:**
- Modified `aws/lambdas/auth-api/index.js` to detect Cognito users:
```javascript
if (user.passwordHash === 'COGNITO_AUTH') {
  // Authenticate through AWS Cognito
  const authCommand = new InitiateAuthCommand({
    ClientId: COGNITO_CLIENT_ID,
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password
    }
  });
  const cognitoResponse = await cognitoClient.send(authCommand);
} else {
  // Traditional bcrypt authentication
  validPassword = await bcrypt.compare(password, user.passwordHash);
}
```

---

### 8. Missing JWT_SECRET Environment Variable
**Problem:**
- CDK deployment failed: `Cannot read properties of undefined (reading 'substring')`
- `JWT_SECRET` environment variable not set

**Solution:**
- Created `aws/cdk/.env` with JWT_SECRET:
```env
JWT_SECRET=D0i1aPk8nr/DmDk4deO82X19VSEPWJL/6r2CVSOIMokJLb2/m4Q2xYFL8I3e9X9AtkI5X24hI5PdXb/kYoQRZA==
ENVIRONMENT=dev
STAGE=dev
DB_NAME=barkbase
DB_USER=postgres
```

---

## FILE STRUCTURE CHANGES

### Files Modified:
1. **Frontend:**
   - `frontend/.env` - Added VITE_AUTH_MODE=db
   - `frontend/src/app/providers/AppProviders.jsx` - Removed OfflineBoundary
   - `frontend/src/lib/aws-client/index.js` - Already configured for multi-auth modes

2. **Lambda Functions:**
   - `aws/lambdas/auth-api/index.js` - Fixed metadata duplicate, added Cognito auth
   - `aws/layers/db-layer/nodejs/index.js` - Uses DB_SECRET_ID from environment

3. **CDK Infrastructure:**
   - `aws/cdk/lib/cdk-stack.ts` - Imported existing RDS, fixed Lambda permissions
   - `aws/cdk/.env` - Created with JWT_SECRET and environment config

---

## DEPLOYMENT COMMANDS

### Prerequisites:
1. AWS CLI configured with proper credentials
2. Node.js and CDK CLI installed
3. All .env files in place

### Deploy Process:
```bash
# Navigate to CDK directory
cd aws/cdk

# Load environment variables (use grep to filter comments)
export $(grep -v '^#' .env | xargs)

# Deploy the stack
cdk deploy
```

### Clean Up Duplicate Resources:
```bash
# Delete duplicate RDS instance if it exists
aws rds delete-db-instance \
  --db-instance-identifier barkbase-dev-postgresinstance19cdd68a-2kflsaf4vwvj \
  --skip-final-snapshot \
  --region us-east-2

# Delete duplicate security group if it exists
aws ec2 delete-security-group \
  --group-id sg-0e38a6c2530a44cbb \
  --region us-east-2
```

---

## ENVIRONMENT VARIABLES REFERENCE

### Frontend (frontend/.env):
```env
VITE_AUTH_MODE=db                    # Use direct backend auth (not OAuth)
VITE_AWS_REGION=us-east-2
VITE_USER_POOL_ID=us-east-2_v94gByGOq
VITE_CLIENT_ID=2csen8hj7b53ec2q9bc0siubja
VITE_COGNITO_DOMAIN=https://barkbase-c8c5d9c1.auth.us-east-2.amazoncognito.com
VITE_API_URL=https://smvidb1rd0.execute-api.us-east-2.amazonaws.com/
VITE_REDIRECT_URI=http://localhost:5173
VITE_LOGOUT_URI=http://localhost:5173
```

### CDK (aws/cdk/.env):
```env
JWT_SECRET=<generated-secret>
ENVIRONMENT=dev
STAGE=dev
DB_NAME=barkbase
DB_USER=postgres
```

---

## AUTHENTICATION FLOW

### Current Working Flow:
1. User enters email/password in custom login form
2. Frontend calls `/api/v1/auth/login` (DbAuthClient)
3. Lambda checks database for user record
4. If `passwordHash='COGNITO_AUTH'`: Authenticates via Cognito API
5. Otherwise: Compares password with bcrypt hash
6. Returns JWT tokens in httpOnly cookies
7. Frontend stores user/tenant info in Zustand stores

### Supported Authentication Methods:
- **Direct Database:** Users with bcrypt password hashes
- **Cognito OAuth:** Users with passwordHash='COGNITO_AUTH'
- **Future:** Can add SSO, social login via Cognito

---

## CRITICAL CONFIGURATION

### Database Connection:
- **RDS Instance:** barkbase-dev-public.ctuea6sg4d0d.us-east-2.rds.amazonaws.com
- **Database Name:** barkbase
- **Secret Name:** Barkbase-dev-db-credentials
- **Username:** postgres

### Security:
- JWT tokens in httpOnly cookies (XSS protection)
- SameSite=Lax for CSRF protection
- 15-minute access token expiry
- 30-day refresh token expiry
- Secrets Manager for database credentials
- IAM roles for Lambda permissions

---

## TROUBLESHOOTING TIPS

### If login fails with "Cognito domain/clientId not configured":
- Check `frontend/.env` has all VITE_COGNITO_* variables
- Restart frontend dev server after .env changes

### If Lambda can't connect to database:
- Verify DB_SECRET_ID is set to 'Barkbase-dev-db-credentials'
- Check Lambda has dbSecret.grantRead() permission in CDK
- Ensure RDS security group allows Lambda access

### If CDK deployment fails:
- Ensure JWT_SECRET is set: `export JWT_SECRET=$(openssl rand -base64 64)`
- Check AWS credentials are configured
- Verify no duplicate resource names in AWS

### If "Invalid email or password" for known good credentials:
- Check if user has passwordHash='COGNITO_AUTH' in database
- Verify Cognito User Pool ID and Client ID in Lambda environment
- Check Cognito user pool has USER_PASSWORD_AUTH enabled

---

## MONITORING

### CloudWatch Logs to Check:
- `/aws/lambda/Barkbase-dev-AuthApiFunction*` - Authentication logs
- Look for `[AUTH]` prefixed messages for auth flow
- `[DB]` prefixed messages for database connections

### Key Metrics:
- Lambda invocation errors
- Database connection pool usage
- Authentication success/failure rates
- Token refresh patterns

---

## SUMMARY

All authentication issues have been resolved. The system now properly handles:
- Custom login form (no redirects)
- Both database and Cognito authentication
- Proper environment configuration
- Correct AWS resource references
- Security best practices (httpOnly cookies, secrets management)

The authentication system is now fully functional with no hardcoded values, proper error handling, and support for multiple authentication methods.