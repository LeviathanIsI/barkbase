# Authentication Debug Guide: JWT Cookie Migration

## 🎯 Purpose

This guide helps you debug and verify the JWT httpOnly cookie authentication implementation after deployment.

---

## 🔍 CRITICAL FIX: SameSite=Lax

**What Changed**: Cookie `SameSite` attribute changed from `Strict` to `Lax`

**Why This Matters**:
- **SameSite=Strict**: Blocks cookies on ALL cross-origin requests (even safe navigation)
- **SameSite=Lax**: Allows cookies on top-level navigation, blocks on cross-site forms
- **Your Setup**: Frontend (Vite/CloudFront) and Backend (API Gateway) are on different origins

**Result**: Authentication cookies now work cross-origin while maintaining CSRF protection.

---

## 📋 PRE-TESTING CHECKLIST

Before testing, ensure:
- [ ] Backend deployed with updated `auth-api/index.js` (Commit: ea6fef9)
- [ ] Frontend deployed with updated debug logging (Commit: ea6fef9)
- [ ] Browser DevTools open (Console + Application tabs)
- [ ] Network tab recording enabled
- [ ] Preserve log enabled in Console

---

## 🧪 STEP-BY-STEP TESTING

### Step 1: Open Application and Clear State

1. Navigate to login page
2. Open DevTools (F12)
3. Go to **Application** → **Cookies**
4. Delete all existing `accessToken` and `refreshToken` cookies
5. Go to **Application** → **Local Storage**
6. Delete `barkbase-auth` entry
7. Refresh the page

### Step 2: Attempt Login

1. Enter credentials in login form
2. **Before submitting**, open **Console** tab
3. Click "Sign In"
4. **Immediately watch Console for debug output**

### Step 3: Analyze Console Output

You should see this sequence:

```javascript
[Login] Starting login for: user@example.com
[DB-AUTH] Attempting login to: https://api.example.com/api/v1/auth/login
[DB-AUTH] Login response status: 200
[DB-AUTH] Response headers: {
  set-cookie: null,  // ⚠️ Note: browser hides httpOnly cookies from JavaScript
  access-control-allow-credentials: "true",
  access-control-allow-origin: "https://app.example.com"
}
[DB-AUTH] Login response data: {
  hasUser: true,
  hasTenant: true,
  userRole: "OWNER",
  tenantId: "abc-123-def"
}
[Login] SignIn returned: {user: {...}, tenant: {...}}
[Login] Login successful: {
  userId: "user-123",
  userRole: "OWNER",
  tenantId: "tenant-456",
  hasUser: true,
  hasTenant: true
}
[Login] Checking cookies: {
  allCookies: "",  // ⚠️ httpOnly cookies won't appear here
  note: "httpOnly cookies will not be visible here"
}
[Login] Setting auth state...
[Login] Auth state after setAuth: {
  hasUser: true,
  role: "OWNER",
  tenantId: "tenant-456",
  isAuthenticated: true  // ✅ This should be TRUE
}
[Login] Setting tenant data...
[Login] Navigating to dashboard...
```

### Step 4: Verify Cookies Were Set

1. Go to **Application** → **Cookies** → Select your domain
2. Look for two cookies:

#### accessToken Cookie:
```
Name: accessToken
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (long JWT string)
Path: /
Expires: (15 minutes from now)
HttpOnly: ✅ true
Secure: ✅ true (production) / false (development)
SameSite: Lax
```

#### refreshToken Cookie:
```
Name: refreshToken
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (long JWT string)
Path: /
Expires: (30 days from now)
HttpOnly: ✅ true
Secure: ✅ true (production) / false (development)
SameSite: Lax
```

### Step 5: Verify Navigation Worked

1. Check if you were redirected to `/dashboard`
2. Dashboard should load successfully
3. No authentication errors should appear

### Step 6: Verify API Calls Include Cookies

1. Go to **Network** tab
2. Filter by "Fetch/XHR"
3. Find any API request (e.g., to load dashboard data)
4. Click on the request
5. Go to **Headers** tab
6. Scroll to **Request Headers**
7. Look for `Cookie:` header:
   ```
   Cookie: accessToken=eyJhbGc...; refreshToken=eyJhbGc...
   ```

### Step 7: Test XSS Protection

1. Go to **Console** tab
2. Type: `document.cookie`
3. Press Enter
4. **Expected Result**: Empty string or cookies WITHOUT JWT tokens
5. **Why**: httpOnly flag prevents JavaScript access

```javascript
// Good (XSS protected):
document.cookie
// ""

// Bad (vulnerable to XSS):
document.cookie
// "accessToken=eyJ...; refreshToken=eyJ..."
```

### Step 8: Test Logout

1. Click Logout button
2. Check **Console** for logout flow
3. Go to **Application** → **Cookies**
4. Verify `accessToken` and `refreshToken` are deleted
5. You should be redirected to login page

---

## ⚠️ TROUBLESHOOTING

### Problem: Cookies Not Appearing

**Check:**
1. **Network Tab** → Find login request → **Response Headers**
2. Look for `Set-Cookie` headers:
   ```
   Set-Cookie: accessToken=eyJ...; Path=/; Max-Age=900; HttpOnly; SameSite=Lax
   Set-Cookie: refreshToken=eyJ...; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax
   ```

**If missing:**
- Backend not setting cookies properly
- Check CloudWatch logs for `[COOKIE]` messages

**If present but not stored:**
- CORS issue (check `Access-Control-Allow-Credentials: true`)
- Domain mismatch
- Secure flag issue (HTTPS required in production)

### Problem: `isAuthenticated: false` After Login

**Causes:**
1. `setAuth()` didn't update store
2. User data missing from response
3. Auth store persistence issue

**Debug:**
```javascript
// In Console after login:
useAuthStore.getState()
// Should show: {user: {...}, role: "...", tenantId: "..."}
```

### Problem: 401 Errors on API Calls

**Causes:**
1. Cookies not being sent with requests
2. Missing `credentials: 'include'` in fetch calls
3. SameSite policy blocking cookies

**Verify:**
- Network tab → Request headers → `Cookie` present?
- `apiClient.js` has `credentials: 'include'`?

### Problem: CORS Error

**Check:**
```
Access-Control-Allow-Origin: https://your-frontend.com (NOT *)
Access-Control-Allow-Credentials: true
```

**Frontend must:**
```javascript
fetch(url, {
  credentials: 'include',  // Required!
  // ...
})
```

---

## 🔍 BACKEND LOGS (CloudWatch)

### Check Lambda Logs

```bash
aws logs tail /aws/lambda/Barkbase-dev-auth-api --follow
```

### Expected Log Output

```
[COOKIE] Creating accessToken cookie: HttpOnly, SameSite=Lax, MaxAge=900s, Secure=true
[COOKIE] Creating refreshToken cookie: HttpOnly, SameSite=Lax, MaxAge=2592000s, Secure=true
[LOGIN] Setting cookies in response headers
[LOGIN] Response structure: {
  statusCode: 200,
  hasCookies: true,
  cookieCount: 2,
  hasUser: true,
  headers: ['Content-Type', 'Access-Control-Allow-Origin', ...]
}
{
  "timestamp": "2025-11-13T...",
  "level": "AUDIT",
  "action": "LOGIN_SUCCESS",
  "userId": "user-123",
  "tenantId": "tenant-456",
  "email": "user@example.com",
  "result": "SUCCESS",
  "sourceIp": "1.2.3.4"
}
```

---

## ✅ SUCCESS CRITERIA

Authentication is working correctly if:

1. **Console Logs**:
   - ✅ No errors in console
   - ✅ `isAuthenticated: true` after login
   - ✅ All debug logs appear in sequence

2. **Cookies**:
   - ✅ Two cookies set: `accessToken`, `refreshToken`
   - ✅ Both have `HttpOnly: true`
   - ✅ Both have `SameSite: Lax`
   - ✅ Production has `Secure: true`

3. **XSS Protection**:
   - ✅ `document.cookie` doesn't show JWT tokens

4. **Navigation**:
   - ✅ Redirected to dashboard after login
   - ✅ Dashboard loads without errors

5. **API Calls**:
   - ✅ Requests include `Cookie` header
   - ✅ No 401 errors

6. **Logout**:
   - ✅ Cookies cleared
   - ✅ Redirected to login
   - ✅ Subsequent API calls return 401

---

## 🚨 COMMON ISSUES & FIXES

### Issue 1: "Login successful but immediately logged out"

**Cause**: `isAuthenticated()` returning `false` despite user data present

**Fix**:
```javascript
// Check auth store
console.log(useAuthStore.getState());
// If user is present but isAuthenticated is false, check implementation
```

### Issue 2: "Cookies set but not sent on API requests"

**Cause**: Missing `credentials: 'include'` in fetch

**Fix**: Verify all API calls use:
```javascript
fetch(url, { credentials: 'include' })
```

### Issue 3: "Set-Cookie header in response but cookie not stored"

**Cause**: CORS or Secure flag issue

**Fix**:
- Check `Access-Control-Allow-Credentials: true` in response
- Check `Access-Control-Allow-Origin` matches frontend origin (not *)
- In production, ensure HTTPS is used (Secure flag requirement)

### Issue 4: "TypeError: Cannot read properties of undefined"

**Cause**: Response structure changed, old code expecting tokens

**Fix**: Search codebase for:
- `result.accessToken`
- `result.refreshToken`
- `useAuthStore.getState().accessToken`

All should be removed/updated to use cookie-based auth.

---

## 📊 MONITORING

After successful login, monitor:

### CloudWatch Metrics:
- Lambda invocations increasing
- No error rate spikes
- Average duration stable

### CloudWatch Logs:
```bash
# Filter for successful logins
aws logs filter-log-events \
  --log-group-name /aws/lambda/Barkbase-dev-auth-api \
  --filter-pattern "LOGIN_SUCCESS" \
  --start-time $(date -d '10 minutes ago' +%s)000
```

### Application Monitoring:
- No console errors
- Users staying logged in
- Session persistence across tabs
- Refresh token working (no re-login for 30 days)

---

## 📝 ROLLBACK PROCEDURE

If authentication is completely broken:

```bash
# Revert to previous commit
cd /c/barkbase-react
git revert ea6fef9 26d05d2
git push origin main

# Redeploy
# (Use your deployment method)
```

Or revert just the SameSite change:
```javascript
// In auth-api/index.js, change line 68:
'SameSite=Lax',  // Change back to 'SameSite=None' or remove cookie auth entirely
```

---

## 🎓 LEARNING RESOURCES

- **MDN SameSite**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
- **OWASP Cookie Security**: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- **HttpOnly Flag**: https://owasp.org/www-community/HttpOnly

---

**Created**: 2025-11-13
**Last Updated**: 2025-11-13
**Status**: Ready for testing
**Related Commit**: ea6fef9
