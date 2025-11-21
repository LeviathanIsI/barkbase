import os
import re

# Services to fix
services = [
    'analytics-service',
    'operations-service',
    'config-service',
    'financial-service'
]

# The fixed getUserInfoFromEvent function
fixed_function = '''async function getUserInfoFromEvent(event) {
    // First, try to get claims from API Gateway JWT authorizer
    const claims = event?.requestContext?.authorizer?.jwt?.claims;

    if (claims) {
        console.log('[AUTH] Using API Gateway JWT claims');

        // Cognito tokens don't have tenantId - fetch from database
        let tenantId = claims['custom:tenantId'] || claims.tenantId;

        if (!tenantId && claims.sub) {
            console.log('[AUTH] Fetching tenantId from database for Cognito user:', claims.sub);
            const pool = getPool();

            try {
                // Query for user's tenant based on Cognito sub or email
                const result = await pool.query(
                    `SELECT m."tenantId"
                     FROM public."Membership" m
                     JOIN public."User" u ON m."userId" = u."recordId"
                     WHERE (u."cognitoSub" = $1 OR u."email" = $2)
                     AND m."deletedAt" IS NULL
                     ORDER BY m."updatedAt" DESC
                     LIMIT 1`,
                    [claims.sub, claims.email || claims['cognito:username']]
                );

                if (result.rows.length > 0) {
                    tenantId = result.rows[0].tenantId;
                    console.log('[AUTH] Found tenantId from database:', tenantId);
                } else {
                    console.error('[AUTH] No tenant found for user:', claims.sub);
                }
            } catch (error) {
                console.error('[AUTH] Error fetching tenantId from database:', error.message);
            }
        }

        return {
            sub: claims.sub,
            username: claims.username || claims['cognito:username'],
            email: claims.email,
            tenantId: tenantId,
            userId: claims.sub,
            role: claims['custom:role'] || 'USER'
        };
    }'''

for service in services:
    file_path = f'D:/barkbase-react/aws/lambdas/{service}/index.js'

    if os.path.exists(file_path):
        print(f"Fixing {service}...")

        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Find and replace the getUserInfoFromEvent function
        pattern = r'async function getUserInfoFromEvent\(event\) \{[^}]*?if \(claims\) \{[^}]*?return \{[^}]*?\};\s*\}'

        if re.search(pattern, content, re.DOTALL):
            # Replace the function up to the closing brace of the if(claims) block
            content = re.sub(pattern, fixed_function, content, flags=re.DOTALL, count=1)

            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)

            print(f"  [FIXED] getUserInfoFromEvent in {service}")
        else:
            print(f"  [WARNING] Pattern not found in {service}, may need manual fix")
    else:
        print(f"  [ERROR] File not found: {file_path}")

print("\nDone! All services updated to fetch tenantId from database for Cognito users.")