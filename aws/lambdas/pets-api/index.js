const { getPool } = require('/opt/nodejs');

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
};

exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    const httpMethod = event.requestContext.http.method;
    const path = event.requestContext.http.path;
    const tenantId = event.headers['x-tenant-id'];

    if (!tenantId) {
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Missing x-tenant-id header' }),
        };
    }

    try {
        if (httpMethod === 'GET' && event.pathParameters?.id) {
            return await getPetById(event, tenantId);
        }
        if (httpMethod === 'GET' && path === '/pets') {
            return await listPets(event, tenantId);
        }
        if (httpMethod === 'POST' && path === '/pets') {
            return await createPet(event, tenantId);
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

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(rows[0]),
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
