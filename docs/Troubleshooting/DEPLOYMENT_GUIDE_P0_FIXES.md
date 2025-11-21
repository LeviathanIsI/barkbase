# Deployment Guide: P0 Security Fixes

## Status: ✅ ALL CODE CHANGES COMPLETE - READY FOR DEPLOYMENT

All 5 P0 critical security fixes have been implemented and committed. This guide provides deployment instructions and testing procedures.

---

## 🚨 PRE-DEPLOYMENT CHECKLIST

### Dependencies Installed:
- ✅ CDK dependencies installed (`aws/cdk/node_modules`)
- ✅ DB layer dependencies installed (`aws/layers/db-layer/nodejs/node_modules`)
- ✅ RDS CA bundle downloaded (`aws/layers/db-layer/nodejs/rds-ca-bundle.pem` - 162KB)

### Commits Ready:
1. ✅ Fix #1: sourceIp crash (Commit: 3edf8dc)
2. ✅ Fix #3: userId NULL violations (Commit: 4c4ef10)
3. ✅ Fix #4: SSL certificate validation (Commit: 9017ccf)
4. ✅ Fix #5: Auto-confirm email bypass (Commit: cef8591)
5. ✅ Fix #2: JWT httpOnly cookies (Commit: 26d05d2)

---

## ⚠️ DEPLOYMENT BLOCKER IDENTIFIED

### CDK Stack Compilation Errors

The CDK stack has pre-existing TypeScript errors that prevent deployment:

```
lib/cdk-stack.ts(435,9): error TS2322: Type 'undefined' is not assignable to type 'IDomainName'.
lib/cdk-stack.ts(748,6): error TS2448: Block-scoped variable 'authApiFunction' used before its declaration.
lib/cdk-stack.ts(905,11): error TS2454: Variable 'authApiFunction' is used before being assigned.
```

**Issue**: `authApiFunction` is referenced before it's declared in the CDK stack.

---

## 📋 DEPLOYMENT OPTIONS

### Option 1: Fix CDK Stack (Recommended)

1. **Fix the variable declaration order in `aws/cdk/lib/cdk-stack.ts`:**
   - Move `authApiFunction` declaration earlier in the file (before line 748)
   - Ensure all Lambda functions are declared before being referenced

2. **Deploy via CDK:**
   ```bash
   cd aws/cdk
   npx cdk diff    # Review changes
   npx cdk deploy  # Deploy to AWS
   ```

### Option 2: Direct Lambda Update (Faster, Manual)

Since the Lambda code is separate from CDK infrastructure, you can update functions directly:

```bash
# Set AWS region
export AWS_REGION=us-east-2

# Update auth-api Lambda (Fix #1, #2)
cd aws/lambdas/auth-api
npm install --production
zip -r function.zip index.js node_modules package.json
aws lambda update-function-code \
  --function-name Barkbase-dev-auth-api \
  --zip-file fileb://function.zip

# Update check-in-api Lambda (Fix #3)
cd ../check-in-api
npm install --production
zip -r function.zip index.js node_modules package.json
aws lambda update-function-code \
  --function-name Barkbase-dev-check-in-api \
  --zip-file fileb://function.zip

# Update check-out-api Lambda (Fix #3)
cd ../check-out-api
npm install --production
zip -r function.zip index.js node_modules package.json
aws lambda update-function-code \
  --function-name Barkbase-dev-check-out-api \
  --zip-file fileb://function.zip

# Update cognito-pre-signup Lambda (Fix #5)
cd ../cognito-pre-signup
npm install --production
zip -r function.zip index.js node_modules package.json
aws lambda update-function-code \
  --function-name Barkbase-dev-cognito-pre-signup \
  --zip-file fileb://function.zip

# Update db-layer Lambda Layer (Fix #4)
cd ../../layers/db-layer
zip -r layer.zip nodejs/
aws lambda publish-layer-version \
  --layer-name barkbase-db-layer \
  --zip-file fileb://layer.zip \
  --compatible-runtimes nodejs18.x nodejs20.x \
  --region us-east-2

# Note the new layer version number from the output above, then update all Lambda functions to use it
aws lambda update-function-configuration \
  --function-name Barkbase-dev-auth-api \
  --layers arn:aws:lambda:us-east-2:ACCOUNT_ID:layer:barkbase-db-layer:NEW_VERSION
```

### Option 3: Use AWS Console (Easiest for Testing)

1. Navigate to AWS Lambda Console (us-east-2 region)
2. For each modified Lambda function:
   - Select the function
   - Copy the updated code from:
     - `aws/lambdas/auth-api/index.js`
     - `aws/lambdas/check-in-api/index.js`
     - `aws/lambdas/check-out-api/index.js`
     - `aws/lambdas/cognito-pre-signup/index.js`
   - Paste into the Lambda code editor
   - Click "Deploy"

3. For db-layer:
   - Create new layer version with updated code + `rds-ca-bundle.pem`
   - Update all Lambda functions to use new layer version

---

## 🧪 POST-DEPLOYMENT TESTING

### 1. Verify Deployment Success

```bash
# Check Lambda function versions were updated
aws lambda get-function \
  --function-name Barkbase-dev-auth-api \
  --region us-east-2 \
  --query 'Configuration.LastModified'

# Check CloudWatch logs for any deployment errors
aws logs tail /aws/lambda/Barkbase-dev-auth-api --follow
```

### 2. Test Authentication Flow (Priority 1)

**Frontend:**
1. Open https://app.barkbase.com (or your frontend URL)
2. Open DevTools → Application → Cookies
3. Login with test credentials
4. **Verify:**
   - ✅ Two cookies appear: `accessToken` and `refreshToken`
   - ✅ Both have `HttpOnly` flag set
   - ✅ Both have `SameSite=Strict`
   - ✅ Production should have `Secure` flag
5. Open DevTools → Console
6. Type: `document.cookie`
7. **Verify:**
   - ❌ Should NOT see JWT tokens (they're httpOnly)
8. Navigate to Dashboard
9. **Verify:**
   - ✅ API calls work (cookies sent automatically)
   - ✅ Check Network tab → Request Headers → Cookie header present

**Backend Logs (CloudWatch):**
```bash
# Check for cookie-related logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/Barkbase-dev-auth-api \
  --filter-pattern "LOGIN_SUCCESS" \
  --start-time $(date -d '10 minutes ago' +%s)000
```

### 3. Test Check-In/Check-Out (Priority 2)

1. Create a test booking
2. Check-in the booking
3. **Verify:**
   - ✅ No errors about NULL userId
   - ✅ Check CloudWatch logs for successful operation
4. Check-out the booking
5. **Verify:**
   - ✅ Operation completes successfully

```bash
# Check logs for userId mapping
aws logs filter-log-events \
  --log-group-name /aws/lambda/Barkbase-dev-check-in-api \
  --filter-pattern "userId" \
  --start-time $(date -d '10 minutes ago' +%s)000
```

### 4. Test Email Verification (Priority 3)

1. Sign up a new user with a permanent email domain
2. **Verify:**
   - ✅ Email verification required (no auto-confirm)
3. Try signing up with disposable email (e.g., `test@tempmail.com`)
4. **Verify:**
   - ❌ Registration blocked with error message

```bash
# Check pre-signup logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/Barkbase-dev-cognito-pre-signup \
  --filter-pattern "PRE_SIGNUP" \
  --start-time $(date -d '10 minutes ago' +%s)000
```

### 5. Verify SSL Database Connections (Priority 4)

```bash
# Check db-layer logs for SSL status
aws logs filter-log-events \
  --log-group-name /aws/lambda/Barkbase-dev-auth-api \
  --filter-pattern "SSL enabled with certificate validation" \
  --start-time $(date -d '10 minutes ago' +%s)000

# Should see: [DB] SSL enabled with certificate validation
# Should NOT see: [DB] WARNING: RDS CA bundle not found
```

### 6. Test Logout Flow

1. Click Logout
2. **Verify:**
   - ✅ Redirected to login page
   - ✅ Cookies cleared (check DevTools → Application → Cookies)
   - ✅ Subsequent API calls return 401 Unauthorized

---

## 🔒 SECURITY VERIFICATION CHECKLIST

After deployment, verify these security improvements are active:

### XSS Protection (Fix #2)
- [ ] `document.cookie` does NOT show JWT tokens
- [ ] Cookies have `HttpOnly` flag in DevTools
- [ ] Tokens never appear in localStorage
- [ ] Tokens never appear in Network tab response bodies

### CSRF Protection (Fix #2)
- [ ] Cookies have `SameSite=Strict` attribute
- [ ] Production has `Secure` flag (HTTPS only)

### Email Security (Fix #5)
- [ ] Production users must verify email
- [ ] Disposable email domains blocked
- [ ] Development mode still allows auto-confirm (for testing)

### SSL/TLS (Fix #4)
- [ ] Database connections use SSL
- [ ] Certificate validation enabled in production
- [ ] No certificate warnings in logs

### Error Handling (Fix #1, #3)
- [ ] No crashes from undefined sourceIp
- [ ] Check-in/check-out operations complete successfully
- [ ] Audit logs contain proper userId values

---

## 🚨 ROLLBACK PROCEDURES

If issues occur after deployment:

### Quick Rollback (CDK)
```bash
cd aws/cdk
# Deploy previous CloudFormation stack version
aws cloudformation deploy \
  --stack-name Barkbase-dev \
  --template-file previous-template.json
```

### Per-Function Rollback
```bash
# Revert to previous Lambda version
aws lambda update-function-configuration \
  --function-name Barkbase-dev-auth-api \
  --publish \
  --revisions $PREVIOUS_VERSION
```

### Git Rollback
```bash
# Revert specific fix
git revert <commit-hash>
git push origin main
# Then redeploy
```

---

## 📊 MONITORING AFTER DEPLOYMENT

### CloudWatch Alarms to Set Up

1. **Lambda Errors:**
   ```bash
   # Monitor for increased error rates
   aws cloudwatch put-metric-alarm \
     --alarm-name barkbase-auth-api-errors \
     --metric-name Errors \
     --namespace AWS/Lambda \
     --statistic Sum \
     --period 300 \
     --threshold 10 \
     --comparison-operator GreaterThanThreshold
   ```

2. **Authentication Failures:**
   - Monitor CloudWatch Logs for `LOGIN_FAILED` events
   - Alert on unusual spike in auth failures

3. **Database Connection Issues:**
   - Monitor for `DATABASE_CONNECTION_FAILURE` events
   - Alert on SSL validation errors

---

## ✅ DEPLOYMENT COMPLETION CHECKLIST

- [ ] All Lambda functions deployed successfully
- [ ] Lambda layer updated with RDS CA bundle
- [ ] Frontend deployed with cookie-based auth
- [ ] Login/logout tested and working
- [ ] Check-in/check-out tested and working
- [ ] Email verification tested
- [ ] SSL connections verified in logs
- [ ] Security verification checklist completed
- [ ] Monitoring enabled
- [ ] Team notified of deployment
- [ ] Documentation updated

---

## 📞 SUPPORT

If you encounter issues:
1. Check CloudWatch Logs for error messages
2. Verify environment variables are set correctly
3. Ensure RDS CA bundle is included in layer
4. Check CORS configuration allows credentials
5. Verify frontend uses `credentials: 'include'`

---

**Last Updated**: 2025-11-13
**Status**: Ready for deployment (CDK stack errors must be fixed first)
**Region**: us-east-2
**Stage**: dev
