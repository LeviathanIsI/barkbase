const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE'
};

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
    if (!tenantId) {
        return {
            statusCode: 401,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Missing tenant context' }),
        };
    }

    try {
        // ==================== PETS ROUTES ====================
        if (path.startsWith('/api/v1/pets')) {
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
        }

        // ==================== OWNERS ROUTES ====================
        if (path.startsWith('/api/v1/owners')) {
            if (httpMethod === 'GET' && path === '/api/v1/owners') {
                return await listOwners(event, tenantId);
            }
            if (httpMethod === 'POST' && path === '/api/v1/owners') {
                return await createOwner(event, tenantId);
            }
            if (httpMethod === 'GET' && event.pathParameters?.id) {
                return await getOwnerById(event, tenantId);
            }
            if (httpMethod === 'PUT' && event.pathParameters?.id) {
                return await updateOwner(event, tenantId);
            }
            if (httpMethod === 'DELETE' && event.pathParameters?.id) {
                return await deleteOwner(event, tenantId);
            }
        }

        // ==================== STAFF ROUTES ====================
        if (path.startsWith('/api/v1/staff')) {
            if (httpMethod === 'GET' && path === '/api/v1/staff') {
                return await listStaff(event, tenantId);
            }
            if (httpMethod === 'POST' && path === '/api/v1/staff') {
                return await createStaff(event, tenantId);
            }
            if (httpMethod === 'GET' && event.pathParameters?.staffId) {
                return await getStaffById(event, tenantId);
            }
            if (httpMethod === 'PUT' && event.pathParameters?.staffId) {
                return await updateStaff(event, tenantId);
            }
            if (httpMethod === 'DELETE' && event.pathParameters?.staffId) {
                return await deleteStaff(event, tenantId);
            }
        }

        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Not Found' }),
        };

    } catch (error) {
        console.error('Entity service error:', error);
        return {
            statusCode: 500,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
};

// ==================== PETS HANDLERS ====================

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

    const pool = getPool();
    const { rows } = await pool.query(
        'SELECT * FROM "Pet" WHERE "tenantId" = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3',
        [tenantId, limit, offset]
    );

    const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM "Pet" WHERE "tenantId" = $1', [tenantId]);
    const totalCount = parseInt(countRows[0].count, 10);

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

// ==================== OWNERS HANDLERS ====================

async function listOwners(event, tenantId) {
    const pool = getPool();
    const { search, limit = '50', offset = '0' } = event.queryStringParameters || {};

    let query = `
        SELECT o.*,
               COUNT(DISTINCT po."petId") as "petCount",
               array_agg(
                   DISTINCT jsonb_build_object(
                       'recordId', p."recordId",
                       'name', p."name",
                       'species', p."species",
                       'breed', p."breed"
                   )
               ) FILTER (WHERE p."recordId" IS NOT NULL) as pets
        FROM "Owner" o
        LEFT JOIN "PetOwner" po ON o."recordId" = po."ownerId"
        LEFT JOIN "Pet" p ON po."petId" = p."recordId"
        WHERE o."tenantId" = $1`;

    const params = [tenantId];

    if (search) {
        query += ` AND (
            o."firstName" ILIKE $${params.length + 1} OR
            o."lastName" ILIKE $${params.length + 1} OR
            o."email" ILIKE $${params.length + 1} OR
            o."phone" ILIKE $${params.length + 1}
        )`;
        params.push(`%${search}%`);
    }

    query += ` GROUP BY o."recordId"`;
    query += ` ORDER BY o."lastName", o."firstName"`;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    const owners = result.rows.map(row => ({
        ...row,
        name: `${row.firstName} ${row.lastName}`.trim(),
        pets: row.pets || []
    }));

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(owners),
    };
}

async function createOwner(event, tenantId) {
    const pool = getPool();
    const {
        firstName,
        lastName,
        email,
        phone,
        address,
        emergencyContact,
        emergencyPhone,
        notes
    } = JSON.parse(event.body || '{}');

    if (!firstName || !lastName) {
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ message: 'First name and last name are required' }),
        };
    }

    const result = await pool.query(
        `INSERT INTO "Owner" (
            "recordId", "tenantId", "firstName", "lastName",
            "email", "phone", "address", "emergencyContact",
            "emergencyPhone", "notes"
        ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9
        ) RETURNING *`,
        [
            tenantId, firstName, lastName, email, phone,
            address, emergencyContact, emergencyPhone, notes
        ]
    );

    const owner = result.rows[0];
    owner.name = `${owner.firstName} ${owner.lastName}`.trim();
    owner.pets = [];
    owner.petCount = 0;

    return {
        statusCode: 201,
        headers: HEADERS,
        body: JSON.stringify(owner),
    };
}

async function getOwnerById(event, tenantId) {
    const pool = getPool();
    const { id } = event.pathParameters;

    // Get owner with pets
    const ownerResult = await pool.query(
        `SELECT o.*,
                array_agg(
                    DISTINCT jsonb_build_object(
                        'recordId', p."recordId",
                        'name', p."name",
                        'species', p."species",
                        'breed', p."breed",
                        'status', p."status",
                        'photoUrl', p."photoUrl"
                    )
                ) FILTER (WHERE p."recordId" IS NOT NULL) as pets
         FROM "Owner" o
         LEFT JOIN "PetOwner" po ON o."recordId" = po."ownerId"
         LEFT JOIN "Pet" p ON po."petId" = p."recordId" AND p."tenantId" = $1
         WHERE o."recordId" = $2 AND o."tenantId" = $1
         GROUP BY o."recordId"`,
        [tenantId, id]
    );

    if (ownerResult.rows.length === 0) {
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Owner not found' }),
        };
    }

    const owner = ownerResult.rows[0];
    owner.name = `${owner.firstName} ${owner.lastName}`.trim();
    owner.pets = owner.pets || [];
    owner.petCount = owner.pets.length;

    // Get recent bookings for this owner
    const bookingsResult = await pool.query(
        `SELECT b."recordId", b."status", b."checkIn", b."checkOut",
                p."name" as "petName", s."name" as "serviceName"
         FROM "Booking" b
         LEFT JOIN "Pet" p ON b."petId" = p."recordId"
         LEFT JOIN "Service" s ON b."serviceId" = s."recordId"
         WHERE b."ownerId" = $1 AND b."tenantId" = $2
         ORDER BY b."checkIn" DESC
         LIMIT 5`,
        [id, tenantId]
    );

    owner.recentBookings = bookingsResult.rows;

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(owner),
    };
}

async function updateOwner(event, tenantId) {
    const pool = getPool();
    const { id } = event.pathParameters;
    const updates = JSON.parse(event.body || '{}');

    // Check if owner exists
    const checkResult = await pool.query(
        'SELECT "recordId" FROM "Owner" WHERE "recordId" = $1 AND "tenantId" = $2',
        [id, tenantId]
    );

    if (checkResult.rows.length === 0) {
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Owner not found' }),
        };
    }

    // Build dynamic update query
    const allowedFields = [
        'firstName', 'lastName', 'email', 'phone',
        'address', 'emergencyContact', 'emergencyPhone', 'notes'
    ];

    const updateFields = [];
    const values = [];
    let paramCount = 2; // Starting after $1 (id) and $2 (tenantId)

    Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key) && updates[key] !== undefined) {
            updateFields.push(`"${key}" = $${++paramCount}`);
            values.push(updates[key]);
        }
    });

    if (updateFields.length === 0) {
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ message: 'No valid fields to update' }),
        };
    }

    const updateQuery = `
        UPDATE "Owner"
        SET ${updateFields.join(', ')}
        WHERE "recordId" = $1 AND "tenantId" = $2
        RETURNING *
    `;

    const result = await pool.query(updateQuery, [id, tenantId, ...values]);
    const owner = result.rows[0];
    owner.name = `${owner.firstName} ${owner.lastName}`.trim();

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(owner),
    };
}

async function deleteOwner(event, tenantId) {
    const pool = getPool();
    const { id } = event.pathParameters;

    // Check if owner has active bookings
    const bookingCheck = await pool.query(
        `SELECT COUNT(*) FROM "Booking"
         WHERE "ownerId" = $1 AND "tenantId" = $2
         AND "status" IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')`,
        [id, tenantId]
    );

    if (parseInt(bookingCheck.rows[0].count) > 0) {
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({
                message: 'Cannot delete owner with active bookings'
            }),
        };
    }

    const result = await pool.query(
        'DELETE FROM "Owner" WHERE "recordId" = $1 AND "tenantId" = $2 RETURNING "recordId"',
        [id, tenantId]
    );

    if (result.rows.length === 0) {
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Owner not found' }),
        };
    }

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ message: 'Owner deleted successfully' }),
    };
}

// ==================== STAFF HANDLERS ====================

async function listStaff(event, tenantId) {
    const pool = getPool();
    const { rows } = await pool.query(
        `SELECT s.*, m."role", u."name", u."email"
         FROM "Staff" s
         LEFT JOIN "Membership" m ON s."membershipId" = m."recordId"
         LEFT JOIN "User" u ON m."userId" = u."recordId"
         WHERE s."tenantId" = $1`,
        [tenantId]
    );
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
}

async function createStaff(event, tenantId) {
    const { membershipId, position, phone, emergencyContact } = JSON.parse(event.body);
    const pool = getPool();
    const { rows } = await pool.query(
        `INSERT INTO "Staff" ("recordId", "tenantId", "membershipId", "position", "phone", "emergencyContact", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW()) RETURNING *`,
        [tenantId, membershipId, position, phone, emergencyContact]
    );
    return { statusCode: 201, headers: HEADERS, body: JSON.stringify(rows[0]) };
}

async function getStaffById(event, tenantId) {
    const pool = getPool();
    const { rows } = await pool.query(
        `SELECT s.*, m."role", u."name" as "userName", u."email" as "userEmail"
         FROM "Staff" s
         LEFT JOIN "Membership" m ON s."membershipId" = m."recordId"
         LEFT JOIN "User" u ON m."userId" = u."recordId"
         WHERE s."recordId" = $1 AND s."tenantId" = $2`,
        [event.pathParameters.staffId, tenantId]
    );
    if (rows.length === 0) {
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Staff member not found' }) };
    }
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows[0]) };
}

async function updateStaff(event, tenantId) {
    const staffId = event.pathParameters.staffId;
    const body = JSON.parse(event.body || '{}');
    const pool = getPool();

    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramCount = 1;

    const updatableFields = ['membershipId', 'position', 'phone', 'emergencyContact', 'notes', 'hourlyRate', 'status'];

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
    const query = `UPDATE "Staff" SET ${setClause}, "updatedAt" = NOW() WHERE "recordId" = $${paramCount} AND "tenantId" = $${paramCount + 1} RETURNING *`;
    values.push(staffId, tenantId);

    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Staff member not found or you do not have permission to update it' }),
        };
    }

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(rows[0]),
    };
}

async function deleteStaff(event, tenantId) {
    const staffId = event.pathParameters.staffId;
    const pool = getPool();

    // Check if staff has any active schedules or assignments
    const checkResult = await pool.query(
        `SELECT COUNT(*) FROM "Schedule"
         WHERE "staffId" = $1 AND "tenantId" = $2
         AND "date" >= CURRENT_DATE`,
        [staffId, tenantId]
    );

    if (parseInt(checkResult.rows[0].count) > 0) {
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({
                message: 'Cannot delete staff member with active schedules. Please reassign or remove schedules first.'
            }),
        };
    }

    const { rowCount } = await pool.query(
        'DELETE FROM "Staff" WHERE "recordId" = $1 AND "tenantId" = $2',
        [staffId, tenantId]
    );

    if (rowCount === 0) {
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Staff member not found or you do not have permission to delete it' }),
        };
    }

    return {
        statusCode: 204, // No Content
        headers: HEADERS,
        body: '',
    };
}
