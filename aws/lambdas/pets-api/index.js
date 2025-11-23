// TODO (Decommission Phase):
// This Lambda is legacy. Its functionality has been superseded by entity-service (pets/owners/staff).
// Do NOT add new endpoints or business logic here.
// This Lambda will be retired in a future decommission phase once all callers are migrated.

const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
};

exports.handler = async (event) => {
    console.warn('[ROUTING DEBUG]', {
        route: event?.requestContext?.http?.path,
        method: event?.requestContext?.http?.method,
        note: 'Legacy pets-api handler invoked. Routes now use EntityServiceFunction.',
    });

    return {
        statusCode: 410,
        headers: HEADERS,
        body: JSON.stringify({
            message: 'Legacy pets-api has been retired. All /api/v1/pets routes are handled by EntityServiceFunction.',
        }),
    };
};

/*
// Legacy implementation retained for reference. EntityServiceFunction now owns all pet routes.

// Extract user info from API Gateway authorizer (JWT already validated by API Gateway)
function getUserInfoFromEvent(event) {
    const claims = event?.requestContext?.authorizer?.jwt?.claims;
    if (!claims) {
        console.error('No JWT claims found in event');
        return null;
    }

    return {
        sub: claims.sub,
        username: claims.username,
        email: claims.email,
        tenantId: claims['custom:tenantId'] || claims.tenantId
    };
}

exports.handler = async (event) => {

    const httpMethod = event.requestContext.http.method;
    const path = event.requestContext.http.path;

    if (httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: HEADERS, body: '' };
    }

    // Extract user info from API Gateway authorizer (JWT already validated)
    const userInfo = getUserInfoFromEvent(event);
    if (!userInfo) {
        return {
            statusCode: 401,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Unauthorized' }),
        };
    }

    // Get tenant ID from JWT claims or database
    const tenantId = userInfo.tenantId || await getTenantIdFromEvent(event);
    
    // TEMPORARY LOGGING
    console.log('[PETS API DEBUG] Request received:', {
        httpMethod,
        path,
        tenantId,
        userInfo: { sub: userInfo?.sub, email: userInfo?.email, tenantId: userInfo?.tenantId },
        hasJwtClaims: !!event?.requestContext?.authorizer?.jwt?.claims
    });
    
    if (!tenantId) {
        return {
            statusCode: 401,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Missing tenant context' }),
        };
    }

    try {
        // Vaccination routes - must come before general pet routes to avoid incorrect matching
        if (httpMethod === 'GET' && path === '/api/v1/pets/vaccinations/expiring') {
            return await listExpiringVaccinations(event, tenantId);
        }
        if (httpMethod === 'POST' && path.endsWith('/vaccinations') && event.pathParameters?.id && event.pathParameters?.vaccinationId === undefined) {
            return await createPetVaccination(event, tenantId);
        }
        if (httpMethod === 'PUT' && event.pathParameters?.id && event.pathParameters?.vaccinationId && path.includes('/vaccinations/')) {
            return await updatePetVaccination(event, tenantId);
        }
        if (httpMethod === 'DELETE' && event.pathParameters?.id && event.pathParameters?.vaccinationId && path.includes('/vaccinations/')) {
            return await deletePetVaccination(event, tenantId);
        }
        if (httpMethod === 'GET' && path.endsWith('/vaccinations') && event.pathParameters?.id && event.pathParameters?.vaccinationId === undefined) {
            return await listPetVaccinations(event, tenantId);
        }
        
        // Pet owner association route
        if (httpMethod === 'POST' && path === '/api/v1/pets/owners') {
            return await upsertPetOwner(event, tenantId);
        }
        
        // General pet routes
        if (httpMethod === 'GET' && path === '/api/v1/pets') {
            return await listPets(event, tenantId);
        }
        if (httpMethod === 'POST' && path === '/api/v1/pets') {
            return await createPet(event, tenantId);
        }
        if (httpMethod === 'GET' && event.pathParameters?.id) {
            return await getPetById(event, tenantId);
        }
        if (httpMethod === 'PUT' && event.pathParameters?.id) {
            return await updatePet(event, tenantId);
        }
        if (httpMethod === 'DELETE' && event.pathParameters?.id) {
            return await deletePet(event, tenantId);
        }
        
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Not Found' }),
        };

    } catch (error) {
        console.error('Error processing request:', error);
        return {
            statusCode: 500,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
};

... (legacy helper implementations remain below)

const listExpiringVaccinations = async (event, tenantId) => {
    const daysAhead = parseInt(event.queryStringParameters?.daysAhead || '90', 10);

    const pool = getPool();
    const { rows } = await pool.query(
        `
        SELECT 
            v."recordId",
            v."type",
            v."administeredAt",
            v."expiresAt",
            v."petId",
            p."name"       AS "petName",
            p."species"    AS "petSpecies",
            p."breed"      AS "petBreed",
            o."recordId"   AS "ownerId",
            o."firstName"  AS "ownerFirstName",
            o."lastName"   AS "ownerLastName",
            o."email"      AS "ownerEmail",
            o."phone"      AS "ownerPhone"
        FROM "Vaccination" v
        JOIN "Pet" p ON p."recordId" = v."petId" AND p."tenantId" = v."tenantId"
        LEFT JOIN "PetOwner" po ON po."petId" = p."recordId" AND po."tenantId" = v."tenantId" AND po."isPrimary" = true
        LEFT JOIN "Owner" o ON o."recordId" = po."ownerId" AND o."tenantId" = v."tenantId"
        WHERE v."tenantId" = $1
          AND v."expiresAt" <= NOW() + ($2 || ' days')::interval
        ORDER BY v."expiresAt" ASC
        `,
        [tenantId, daysAhead]
    );

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(rows),
    };
};

const getPetById = async (event, tenantId) => {
    const petId = event.pathParameters.id;

    const pool = getPool();
    const { rows } = await pool.query(
        'SELECT * FROM "Pet" WHERE "recordId" = $1 AND "tenantId" = $2', 
        [petId, tenantId]
    );

    if (rows.length === 0) {
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Pet not found' }),
        };
    }

    const pet = rows[0];

    // Enrich pet with owners (primary first) and keep Pet.primaryOwnerId in sync
    let owners = [];
    try {
        const result = await pool.query(
            `SELECT 
                o."recordId" AS "recordId",
                o."firstName" AS "firstName",
                o."lastName" AS "lastName",
                o."email" AS "email",
                o."phone" AS "phone",
                po."isPrimary" AS "isPrimary"
             FROM "PetOwner" po
             JOIN "Owner" o ON o."recordId" = po."ownerId" AND o."tenantId" = po."tenantId"
             WHERE po."tenantId" = $1 AND po."petId" = $2
             ORDER BY po."isPrimary" DESC, o."lastName" ASC, o."firstName" ASC`,
            [tenantId, petId]
        );
        owners = result.rows.map((o) => ({
            ...o,
            name: [o.firstName, o.lastName].filter(Boolean).join(' ').trim() || o.email || 'Owner',
        }));

        // If Pet.primaryOwnerId differs from joined primary, update it for consistency
        const primary = owners.find(o => o.isPrimary);
        if (primary && pet.primaryOwnerId !== primary.recordId) {
            await pool.query(
              'UPDATE "Pet" SET "primaryOwnerId" = $1, "updatedAt" = NOW() WHERE "recordId" = $2 AND "tenantId" = $3',
              [primary.recordId, petId, tenantId]
            );
            pet.primaryOwnerId = primary.recordId;
        }
    } catch (e) {
        console.error('[pets-api] owners join failed', e?.message || e);
        owners = [];
    }

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ ...pet, owners }),
    };
};

const listPets = async (event, tenantId) => {
    const limit = parseInt(event.queryStringParameters?.limit) || 20;
    const offset = parseInt(event.queryStringParameters?.offset) || 0;

    // TEMPORARY LOGGING
    console.log('[PETS API DEBUG] listPets called with:', {
        tenantId,
        limit,
        offset,
        queryParams: event.queryStringParameters
    });

    const pool = getPool();
    const { rows } = await pool.query(
        'SELECT * FROM "Pet" WHERE "tenantId" = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3',
        [tenantId, limit, offset]
    );

    const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM "Pet" WHERE "tenantId" = $1', [tenantId]);
    const totalCount = parseInt(countRows[0].count, 10);

    // TEMPORARY LOGGING
    console.log('[PETS API DEBUG] Query results:', {
        tenantId,
        totalCount,
        rowsReturned: rows.length,
        firstRow: rows.length > 0 ? { id: rows[0].recordId, name: rows[0].name } : null
    });

    return {
        statusCode: 200,
        headers: {
            ...HEADERS,
            'X-Total-Count': totalCount,
        },
        body: JSON.stringify(rows),
    };
};

const createPet = async (event, tenantId) => {
    const body = JSON.parse(event.body);
    // Destructure all possible fields from the Pet model
    const { 
        name, species, breed, birthdate, photoUrl, 
        medicalNotes, dietaryNotes, behaviorFlags, status, 
        weight, allergies, lastVetVisit, nextAppointment 
    } = body;

    if (!name) {
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Pet name is required' }),
        };
    }

    const pool = getPool();
    const { rows } = await pool.query(
        `INSERT INTO "Pet" (
            "recordId", "tenantId", "name", "species", "breed", "birthdate", 
            "photoUrl", "medicalNotes", "dietaryNotes", "behaviorFlags", "status", 
            "weight", "allergies", "lastVetVisit", "nextAppointment", "updatedAt"
        ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW()
        ) RETURNING *`,
        [
            tenantId, name, species, breed, birthdate, photoUrl, 
            medicalNotes, dietaryNotes, JSON.stringify(behaviorFlags || {}), status || 'active', 
            weight, allergies, lastVetVisit, nextAppointment
        ]
    );

    return {
        statusCode: 201,
        headers: HEADERS,
        body: JSON.stringify(rows[0]),
    };
};

const updatePet = async (event, tenantId) => {
    const petId = event.pathParameters.id;
    const body = JSON.parse(event.body);

    // Dynamically build the update query
    const fields = [];
    const values = [];
    let paramCount = 1;

    // List all updatable fields from the Pet model
    const updatableFields = [
        'name', 'species', 'breed', 'birthdate', 'photoUrl', 
        'medicalNotes', 'dietaryNotes', 'behaviorFlags', 'status', 
        'weight', 'allergies', 'lastVetVisit', 'nextAppointment'
    ];

    for (const field of updatableFields) {
        if (body[field] !== undefined) {
            // Handle JSON fields
            const value = (field === 'behaviorFlags') ? JSON.stringify(body[field]) : body[field];
            fields.push(`"${field}" = $${paramCount++}`);
            values.push(value);
        }
    }
    
    if (fields.length === 0) {
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ message: 'No valid fields provided for update' }),
        };
    }

    const setClause = fields.join(', ');
    const query = `UPDATE "Pet" SET ${setClause} WHERE "recordId" = $${paramCount} AND "tenantId" = $${paramCount + 1} RETURNING *`;
    values.push(petId, tenantId);

    const pool = getPool();
    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Pet not found or you do not have permission to update it' }),
        };
    }

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(rows[0]),
    };
};

const deletePet = async (event, tenantId) => {
    const petId = event.pathParameters.id;

    const pool = getPool();
    const { rowCount } = await pool.query('DELETE FROM "Pet" WHERE "recordId" = $1 AND "tenantId" = $2', [petId, tenantId]);

    if (rowCount === 0) {
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Pet not found or you do not have permission to delete it' }),
        };
    }

    return {
        statusCode: 204, // No Content
        headers: HEADERS,
        body: '',
    };
};

const listPetVaccinations = async (event, tenantId) => {
    const petId = event.pathParameters.id;
    const pool = getPool();
    const { rows } = await pool.query(
        `SELECT v."recordId", v."type", v."administeredAt", v."expiresAt", v."documentUrl", v."notes"
         FROM "Vaccination" v
         WHERE v."tenantId" = $1 AND v."petId" = $2
         ORDER BY v."administeredAt" DESC`,
        [tenantId, petId]
    );

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
};

const createPetVaccination = async (event, tenantId) => {
    const petId = event.pathParameters.id;
    const body = JSON.parse(event.body);
    const { type, administeredAt, expiresAt, documentUrl, notes } = body;

    if (!type || !administeredAt || !expiresAt) {
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Type, administeredAt, and expiresAt are required' }),
        };
    }

    const pool = getPool();
    const { rows } = await pool.query(
        `INSERT INTO "Vaccination" (
            "recordId", "tenantId", "petId", "type", "administeredAt", "expiresAt", "documentUrl", "notes", "updatedAt"
        ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW()
        ) RETURNING *`,
        [tenantId, petId, type, administeredAt, expiresAt, documentUrl, notes]
    );

    return {
        statusCode: 201,
        headers: HEADERS,
        body: JSON.stringify(rows[0]),
    };
};

const updatePetVaccination = async (event, tenantId) => {
    const vaccinationId = event.pathParameters.vaccinationId;
    const body = JSON.parse(event.body);
    const { type, administeredAt, expiresAt, documentUrl, notes } = body;

    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramCount = 1;

    const updatableFields = ['type', 'administeredAt', 'expiresAt', 'documentUrl', 'notes'];

    for (const field of updatableFields) {
        if (body[field] !== undefined) {
            fields.push(`"${field}" = $${paramCount++}`);
            values.push(body[field]);
        }
    }

    if (fields.length === 0) {
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ message: 'No valid fields provided for update' }),
        };
    }

    const setClause = fields.join(', ');
    const query = `UPDATE "Vaccination" SET ${setClause}, "updatedAt" = NOW() WHERE "recordId" = $${paramCount} AND "tenantId" = $${paramCount + 1} RETURNING *`;
    values.push(vaccinationId, tenantId);

    const pool = getPool();
    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Vaccination not found or you do not have permission to update it' }),
        };
    }

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(rows[0]),
    };
};

const deletePetVaccination = async (event, tenantId) => {
    const vaccinationId = event.pathParameters.vaccinationId;

    const pool = getPool();
    const { rowCount } = await pool.query(
        `DELETE FROM "Vaccination" WHERE "recordId" = $1 AND "tenantId" = $2`,
        [vaccinationId, tenantId]
    );

    if (rowCount === 0) {
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Vaccination not found or you do not have permission to delete it' }),
        };
    }

    return {
        statusCode: 204,
        headers: HEADERS,
        body: '',
    };
};

// Upsert PetOwner row and maintain single primary owner invariant
const upsertPetOwner = async (event, tenantId) => {
    const body = JSON.parse(event.body || '{}');
    const { petId, ownerId, isPrimary = false } = body;
    if (!petId || !ownerId) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: 'petId and ownerId are required' }) };
    }

    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // If setting primary, clear others for this pet
        if (isPrimary) {
            await client.query(
                'UPDATE "PetOwner" SET "isPrimary" = false WHERE "tenantId" = $1 AND "petId" = $2',
                [tenantId, petId]
            );
        }

        // Upsert PetOwner
        await client.query(
            `INSERT INTO "PetOwner" ("recordId", "tenantId", "petId", "ownerId", "isPrimary")
             VALUES (gen_random_uuid(), $1, $2, $3, $4)
             ON CONFLICT ("tenantId", "petId", "ownerId")
             DO UPDATE SET "isPrimary" = EXCLUDED."isPrimary"`,
            [tenantId, petId, ownerId, !!isPrimary]
        );

        // Sync Pet.primaryOwnerId
        if (isPrimary) {
            await client.query(
                'UPDATE "Pet" SET "primaryOwnerId" = $1, "updatedAt" = NOW() WHERE "recordId" = $2 AND "tenantId" = $3',
                [ownerId, petId, tenantId]
            );
        } else {
            // If no primaries remain, clear primaryOwnerId
            const { rows } = await client.query(
                'SELECT 1 FROM "PetOwner" WHERE "tenantId" = $1 AND "petId" = $2 AND "isPrimary" = true LIMIT 1',
                [tenantId, petId]
            );
            if (rows.length === 0) {
                await client.query(
                    'UPDATE "Pet" SET "primaryOwnerId" = NULL, "updatedAt" = NOW() WHERE "recordId" = $1 AND "tenantId" = $2',
                    [petId, tenantId]
                );
            }
        }

        await client.query('COMMIT');
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('[pets-api] upsertPetOwner failed', e?.message || e);
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: 'Failed to upsert pet owner' }) };
    } finally {
        client.release();
    }
};

*/
