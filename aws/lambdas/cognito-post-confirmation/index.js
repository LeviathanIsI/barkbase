const { getPool } = require('/opt/nodejs/index');
const { randomUUID } = require('crypto');

exports.handler = async (event) => {
    console.log('Cognito Post-Confirmation trigger event:', JSON.stringify(event, null, 2));

    const { userPoolId, userName, request } = event;
    const { userAttributes } = request;
    const cognitoSub = userName; // userName is the Cognito sub (UUID)
    const email = userAttributes.email;
    const name = userAttributes.name || userAttributes.given_name || email.split('@')[0];

    const pool = getPool();
    
    try {
        await pool.query('BEGIN');

        // Check if user already exists with this email
        const existingUser = await pool.query(
            'SELECT "recordId" FROM "User" WHERE "email" = $1',
            [email]
        );

        let userId;
        
        if (existingUser.rows.length > 0) {
            // User exists (created via database auth), link to Cognito
            userId = existingUser.rows[0].recordId;
            console.log(`Linking existing user ${userId} to Cognito sub ${cognitoSub}`);
            
            await pool.query(
                'UPDATE "User" SET "cognitoSub" = $1, "emailVerified" = true, "updatedAt" = CURRENT_TIMESTAMP WHERE "recordId" = $2',
                [cognitoSub, userId]
            );
        } else {
            // New user, create User record
            userId = randomUUID();
            console.log(`Creating new user ${userId} for Cognito sub ${cognitoSub}`);
            
            await pool.query(
                `INSERT INTO "User" 
                ("recordId", "email", "cognitoSub", "name", "passwordHash", "emailVerified", "isActive", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                [userId, email, cognitoSub, name, 'COGNITO_AUTH'] // passwordHash is unused for Cognito users
            );

            // Create a default tenant for the new user
            const tenantId = randomUUID();
            const tenantName = `${name}'s Organization`;
            const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
            
            await pool.query(
                `INSERT INTO "Tenant"
                ("recordId", "name", "slug", "plan", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, 'FREE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                [tenantId, tenantName, slug]
            );

            console.log(`Created tenant ${tenantId} for new user`);

            // Create Membership linking user to tenant
            const membershipId = randomUUID();
            await pool.query(
                `INSERT INTO "Membership"
                ("recordId", "userId", "tenantId", "role", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, 'OWNER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                [membershipId, userId, tenantId]
            );

            console.log(`Created membership ${membershipId} linking user to tenant`);
        }

        await pool.query('COMMIT');
        console.log('✅ Post-confirmation trigger completed successfully');

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('❌ Post-confirmation trigger failed:', error);
        throw error; // This will cause Cognito to fail the signup
    }

    return event; // Must return the event for Cognito to proceed
};
