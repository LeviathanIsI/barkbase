1. Core Environment
   AWS region / stacks

Region: us-east-2

Stacks in play (CDK):

Barkbase-NetworkStack-dev

Barkbase-DatabaseStack-dev

Barkbase-ApiCoreStack-dev

Barkbase-ServicesStack-dev

Barkbase-RealtimeStack-dev

Barkbase-JobsStack-dev

Barkbase-BillingAnalyticsStack

Barkbase-FrontendStack

Barkbase-MonitoringStack

Network outputs

From Barkbase-NetworkStack-dev:

Private app subnets:

subnet-078c284310fe11311

subnet-012923003eb5bfd23

Lambda security group (for DB access etc.):

sg-0e01cbd8dd71d1bfb

2. API Gateway (HTTP API – core entrypoint)
   Core API info

From Barkbase-ApiCoreStack-dev:

HTTP API ID: ejxp74eyhe

Base URL:
https://ejxp74eyhe.execute-api.us-east-2.amazonaws.com

Relevant routes for auth

From the routes dump:

ANY /api/v1/auth

ANY /api/v1/auth/{proxy+}

Integration for both:

IntegrationId: integrations/mxp87dh

Integration details:

aws apigatewayv2 get-integration `  --api-id ejxp74eyhe`
--integration-id mxp87dh `
--query "{Uri:IntegrationUri}" --output text

Result:

arn:aws:lambda:us-east-2:211125574375:function:Barkbase-ServicesStack-dev-AuthApiFunction31FCF8B8-0yk0RvG8dN84

So:

Auth route handler lambda:
Barkbase-ServicesStack-dev-AuthApiFunction31FCF8B8-0yk0RvG8dN84

Full route table

Entire HTTP API route list saved to:
routes.txt (local file you generated from aws apigatewayv2 get-routes).

Keep that updated anytime we start messing with routes.

3. Key Lambda Functions (Auth + Profiles)
   3.1 Auth Lambda

Name:

Barkbase-ServicesStack-dev-AuthApiFunction31FCF8B8-0yk0RvG8dN84

Runtime:

nodejs20.x

Source code path (local repo):

aws/lambdas/auth-api/index.js

aws/lambdas/auth-api/package.json

aws/lambdas/auth-api/package-lock.json (if present)

Legacy duplication: there used to be a security-utils.js here; now centralized in shared.

Imports:

const { getPool } = require('/opt/nodejs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
CognitoIdentityProviderClient,
InitiateAuthCommand
} = require('@aws-sdk/client-cognito-identity-provider');

const {
getSecureHeaders,
auditLog,
securityEvent,
getRequestMetadata,
errorResponse: createErrorResponse,
successResponse: createSuccessResponse
} = require('./security-utils');

Shared utilities for auth lambda:

aws/lambdas/shared/auth-handler.js

aws/lambdas/shared/security-utils.js

Those are bundled via a layer or direct include depending on how CDK wires them.

3.2 User Profile Service Lambda

The “old” function:

Barkbase-dev-UserProfileServiceFunction5A1818D5-DsznKUKuYfjx
(still exists in AWS but should not be wired to HTTP API)

The current CDK-managed function (from ServicesStack outputs):

Logical export: FnGetAttUserProfileServiceFunction5A1818D5Arn

Physical ARN:
arn:aws:lambda:us-east-2:211125574375:function:Barkbase-ServicesStack-de-UserProfileServiceFuncti-cuvgNTcrpMmt

Local code:

aws/lambdas/user-profile-service/index.js

aws/lambdas/user-profile-service/package.json

aws/lambdas/user-profile-service/permission-calculator.js

Shared module for both auth/profile:

aws/lambdas/shared/security-utils.js

4. Lambda Layout Summary

Current aws/lambdas tree (only key bits):

aws/lambdas
├── auth-api
│ ├── index.js
│ ├── package-lock.json
│ └── package.json
├── user-profile-service
│ ├── index.js
│ ├── package.json
│ └── permission-calculator.js
├── shared
│ ├── auth-handler.js
│ └── security-utils.js
└── ... lots of other feature lambdas ...

Other service lambdas tied into Barkbase-ServicesStack-dev (from exports):

TenantsMembershipsConfigServiceFunction

EntityServiceFunction

OperationsServiceFunction

FeaturesServiceFunction

GetUploadUrlFunction

PropertiesApiV2Function

GetDownloadUrlFunction

FacilityServicesConfigServiceFunction

FinancialServiceFunction

AnalyticsServiceFunction

AdminApiFunction

RolesConfigServiceFunction

All of these are created from aws/cdk/lib/ServicesStack.ts.

5. CDK Files Involved

These are the CDK sources that matter for this plumbing:

API Core stack:

aws/cdk/lib/ApiCoreStack.ts

Defines the HTTP API, routes, and integrations.

Services stack:

aws/cdk/lib/ServicesStack.ts

Defines:

All service lambdas

Their code paths (../../lambdas/...)

Layers (DB, shared)

VPC + security groups

Auth lambda source:

aws/lambdas/auth-api/index.js

aws/lambdas/shared/security-utils.js

aws/lambdas/shared/auth-handler.js

User profile lambda source:

aws/lambdas/user-profile-service/index.js

aws/lambdas/user-profile-service/permission-calculator.js

6. Frontend Auth Call

From earlier logs (React dev):

Frontend origin:
http://localhost:5173

Login API call:

[Login] Starting login for: joshua.r.bradford1@gmail.com
[DB-AUTH] Attempting login to: https://ejxp74eyhe.execute-api.us-east-2.amazonaws.com/api/v1/auth/login

That maps to the HTTP API route POST /api/v1/auth/login hitting the AuthApiFunction.

7. Test / Debug Commands

Keep these around for quick reproduction.

7.1 List relevant Lambda functions
aws lambda list-functions --output text | findstr AuthApiFunction
aws lambda list-functions --output text | findstr UserProfile

7.2 Tail logs for auth lambda
aws logs tail "/aws/lambda/Barkbase-ServicesStack-dev-AuthApiFunction31FCF8B8-0yk0RvG8dN84" --since 5m --follow

7.3 Tail logs for (old) user profile lambda (if needed)
aws logs tail "/aws/lambda/Barkbase-dev-UserProfileServiceFunction5A1818D5-DsznKUKuYfjx" --since 5m --follow

Or for the current profile service:

aws logs tail "/aws/lambda/Barkbase-ServicesStack-de-UserProfileServiceFuncti-cuvgNTcrpMmt" --since 5m --follow

7.4 Get routes & auth integration (HTTP API)
aws apigatewayv2 get-routes `  --api-id ejxp74eyhe`
--output table > routes.txt

aws apigatewayv2 get-integration `  --api-id ejxp74eyhe`
--integration-id mxp87dh `
--query "{Uri:IntegrationUri}" --output text

7.5 Test login from PowerShell

⚠️ Don’t store your real password in this doc. Use a placeholder here and keep the real value in a secret manager or .env file.

$body = @{
email = "joshua.r.bradford1@gmail.com"
password = "<ACTUAL_PASSWORD_HERE>"
} | ConvertTo-Json -Compress

Write-Host "REQUEST BODY:" $body

curl.exe -v `  -X POST "https://ejxp74eyhe.execute-api.us-east-2.amazonaws.com/api/v1/auth/login"`
-H "Content-Type: application/json" `
--data-binary "$body"

8. Known Issues / Gotchas We Already Hit

Missing shared module

Error: Cannot find module '../shared/security-utils'

Root cause: Lambda zip did not include shared/security-utils.js in the expected relative path.

Fix: Restore aws/lambdas/shared/security-utils.js and ensure the require('./security-utils') path matches the packaged structure (or move all shared code into a proper layer directory /opt/nodejs and require from there).

Missing dependency

Error: Cannot find module 'bcryptjs'

Root cause: bcryptjs not included in auth lambda bundle.

Fix: Add to aws/lambdas/auth-api/package.json and redeploy Barkbase-ServicesStack-dev.

Bad JSON in request body

Error: Expected property name or '}' in JSON at position X coming from:

const { email, password } = JSON.parse(event.body || "{}");

Root cause: Request body arriving as non-JSON (wrong curl flags, mutations, etc.).

Fix: Use ConvertTo-Json + --data-binary exactly as in the test command, and add logging:

console.log('[AUTH][login] raw event.body:', event.body);

CORS errors (earlier)

Browser showed: No 'Access-Control-Allow-Origin' header...

Root cause: Missing/incorrect CORS configuration on HTTP API or integration.

Fix path: Configure CORS on HttpApi in ApiCoreStack.ts and/or use an OPTIONS handler / default CORS responses for error paths.

9. Files Already Shared / Uploaded (Context)

These are files we’ve already looked at in this debugging session:

routes.txt – Full route dump from aws apigatewayv2 get-routes

aws/cdk/lib/ApiCoreStack.ts

aws/cdk/lib/ServicesStack.ts

aws/lambdas/auth-api/index.js

aws/lambdas/shared/security-utils.js

aws/lambdas/shared/auth-handler.js

aws/lambdas/user-profile-service/index.js

aws/lambdas/user-profile-service/permission-calculator.js
