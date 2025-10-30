const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');

const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE' };

exports.handler = async (event) => {
    const httpMethod = event.requestContext.http.method;
    const path = event.rawPath || event.requestContext?.http?.path || '';
    const tenantId = await getTenantIdFromEvent(event);
    if (!tenantId) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: 'Missing tenant context' }) };

    try {
        const pool = getPool();
        
        // ===== RUN TEMPLATE ENDPOINTS =====
        
        // GET /api/v1/run-templates - List all active templates
        if (httpMethod === 'GET' && path.includes('/run-templates') && !event.pathParameters?.id) {
            const { rows } = await pool.query(
                `SELECT * FROM "RunTemplate" WHERE "tenantId" = $1 AND "isActive" = true ORDER BY "name"`,
                [tenantId]
            );
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
        }
        
        // POST /api/v1/run-templates - Create new template
        if (httpMethod === 'POST' && path.includes('/run-templates')) {
            const { name, timePeriodMinutes, capacityType, maxCapacity } = JSON.parse(event.body);
            const { rows } = await pool.query(
                `INSERT INTO "RunTemplate" ("recordId", "tenantId", "name", "timePeriodMinutes", "capacityType", "maxCapacity", "updatedAt")
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW()) RETURNING *`,
                [tenantId, name, timePeriodMinutes || 30, capacityType || 'total', maxCapacity || 10]
            );
            return { statusCode: 201, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }
        
        // PUT /api/v1/run-templates/{id} - Update template
        if (httpMethod === 'PUT' && path.includes('/run-templates') && event.pathParameters?.id) {
            const { name, timePeriodMinutes, capacityType, maxCapacity } = JSON.parse(event.body);
            const { rows } = await pool.query(
                `UPDATE "RunTemplate" 
                 SET "name" = COALESCE($1, "name"), 
                     "timePeriodMinutes" = COALESCE($2, "timePeriodMinutes"),
                     "capacityType" = COALESCE($3, "capacityType"),
                     "maxCapacity" = COALESCE($4, "maxCapacity"),
                     "updatedAt" = NOW()
                 WHERE "recordId" = $5 AND "tenantId" = $6 
                 RETURNING *`,
                [name, timePeriodMinutes, capacityType, maxCapacity, event.pathParameters.id, tenantId]
            );
            if (rows.length === 0) {
                return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Template not found' }) };
            }
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }
        
        // DELETE /api/v1/run-templates/{id} - Soft delete template
        if (httpMethod === 'DELETE' && path.includes('/run-templates') && event.pathParameters?.id) {
            const { rows } = await pool.query(
                `UPDATE "RunTemplate" SET "isActive" = false, "updatedAt" = NOW() 
                 WHERE "recordId" = $1 AND "tenantId" = $2 RETURNING *`,
                [event.pathParameters.id, tenantId]
            );
            if (rows.length === 0) {
                return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Template not found' }) };
            }
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ message: 'Template deleted' }) };
        }
        
        // GET /api/v1/runs/{runId}/available-slots - Calculate available time slots
        if (httpMethod === 'GET' && path.includes('/available-slots') && event.pathParameters?.runId) {
            const { date } = event.queryStringParameters || {};
            const dateStr = date || new Date().toISOString().split('T')[0];
            
            // Get the run to find its template
            const { rows: runRows } = await pool.query(
                `SELECT r.*, rt."timePeriodMinutes", rt."capacityType", rt."maxCapacity"
                 FROM "Run" r
                 LEFT JOIN "RunTemplate" rt ON r."templateId" = rt."recordId"
                 WHERE r."recordId" = $1 AND r."tenantId" = $2`,
                [event.pathParameters.runId, tenantId]
            );
            
            if (runRows.length === 0) {
                return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Run not found' }) };
            }
            
            const run = runRows[0];
            const timePeriod = run.timePeriodMinutes || 30;
            const capacityType = run.capacityType || 'total';
            const maxCapacity = run.maxCapacity || run.capacity || 10;
            const assignments = run.assignedPets || [];
            
            // Generate all possible slots from 07:00 to 20:00
            const slots = [];
            for (let hour = 7; hour < 20; hour++) {
                for (let minute = 0; minute < 60; minute += timePeriod) {
                    const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                    const endMinute = minute + timePeriod;
                    const endHour = hour + Math.floor(endMinute / 60);
                    const endMin = endMinute % 60;
                    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
                    
                    if (endHour >= 20) break;
                    
                    // Count pets in this slot if capacityType is concurrent
                    let occupied = 0;
                    if (capacityType === 'concurrent') {
                        occupied = assignments.filter(a => {
                            return a.startTime < endTime && a.endTime > startTime;
                        }).length;
                    } else {
                        occupied = assignments.length;
                    }
                    
                    slots.push({
                        startTime,
                        endTime,
                        available: occupied < maxCapacity,
                        occupied
                    });
                }
            }
            
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(slots) };
        }
        
        // ===== RUN ENDPOINTS =====
        
        // GET /api/v1/runs/assignments - Get today's run assignments with pet details and template info
        if (httpMethod === 'GET' && path.includes('/assignments')) {
            const { date } = event.queryStringParameters || {};
            const dateStr = date || new Date().toISOString().split('T')[0];
            
            // First, check if runs exist for this date, if not, create from templates
            const { rows: existingRuns } = await pool.query(
                `SELECT COUNT(*) as count FROM "Run" WHERE "tenantId" = $1 AND DATE("date") = $2`,
                [tenantId, dateStr]
            );
            
            if (parseInt(existingRuns[0].count) === 0) {
                // No runs exist for this date, create from active templates
                const { rows: templates } = await pool.query(
                    `SELECT * FROM "RunTemplate" WHERE "tenantId" = $1 AND "isActive" = true ORDER BY "name"`,
                    [tenantId]
                );
                
                if (templates.length > 0) {
                    // Insert runs based on templates
                    const insertPromises = templates.map(template => 
                        pool.query(
                            `INSERT INTO "Run" ("recordId", "tenantId", "templateId", "name", "date", "capacity", "assignedPets", "updatedAt")
                             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, '[]'::jsonb, NOW())`,
                            [tenantId, template.recordId, template.name, dateStr, template.maxCapacity]
                        )
                    );
                    await Promise.all(insertPromises);
                }
            }
            
            // Get all runs for the date with template info
            const { rows: runs } = await pool.query(
                `SELECT 
                    r."recordId",
                    r."name",
                    r."capacity",
                    r."scheduleTime",
                    r."assignedPets",
                    r."date",
                    r."templateId",
                    rt."timePeriodMinutes",
                    rt."capacityType",
                    rt."maxCapacity"
                FROM "Run" r
                LEFT JOIN "RunTemplate" rt ON r."templateId" = rt."recordId"
                WHERE r."tenantId" = $1 AND DATE(r."date") = $2
                ORDER BY r."name"`,
                [tenantId, dateStr]
            );
            
            // For each run, fetch the pet details for assigned pets
            const runsWithAssignments = await Promise.all(
                runs.map(async (run) => {
                    const assignments = run.assignedPets || [];
                    
                    if (assignments.length === 0) {
                        return { ...run, assignments: [] };
                    }
                    
                    // Extract pet IDs from assignments (which now have petId, startTime, endTime)
                    const petIds = assignments.map(a => typeof a === 'string' ? a : a.petId);
                    
                    // Fetch pet details including behavioral flags and notes
                    const { rows: pets } = await pool.query(
                        `SELECT 
                            p."recordId",
                            p."name",
                            p."species",
                            p."breed",
                            p."behaviorFlags",
                            p."medicalNotes",
                            p."dietaryNotes",
                            json_agg(
                                json_build_object(
                                    'owner', json_build_object(
                                        'recordId', o."recordId",
                                        'firstName', o."firstName",
                                        'lastName', o."lastName"
                                    )
                                )
                            ) FILTER (WHERE o."recordId" IS NOT NULL) as owners
                        FROM "Pet" p
                        LEFT JOIN "PetOwner" po ON po."petId" = p."recordId"
                        LEFT JOIN "Owner" o ON o."recordId" = po."ownerId" AND o."tenantId" = $1
                        WHERE p."recordId" = ANY($2) AND p."tenantId" = $1
                        GROUP BY p."recordId", p."name", p."species", p."breed", p."behaviorFlags", p."medicalNotes", p."dietaryNotes"`,
                        [tenantId, petIds]
                    );
                    
                    // Create a map of pet details
                    const petMap = {};
                    pets.forEach(pet => {
                        petMap[pet.recordId] = pet;
                    });
                    
                    // Map assignments to include pet details and time info
                    const detailedAssignments = assignments.map(a => {
                        const petId = typeof a === 'string' ? a : a.petId;
                        return {
                            pet: petMap[petId],
                            startTime: typeof a === 'object' ? a.startTime : undefined,
                            endTime: typeof a === 'object' ? a.endTime : undefined
                        };
                    });
                    
                    return {
                        ...run,
                        assignments: detailedAssignments
                    };
                })
            );
            
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(runsWithAssignments) };
        }
        
        // GET /api/v1/runs - List runs for a date
        if (httpMethod === 'GET') {
            const { date } = event.queryStringParameters || {};
            const { rows } = await pool.query(
                `SELECT * FROM "Run" WHERE "tenantId" = $1 AND DATE("date") = $2 ORDER BY "name"`,
                [tenantId, date || new Date().toISOString().split('T')[0]]
            );
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
        }
        
        // POST /api/v1/runs - Create a new run
        if (httpMethod === 'POST') {
            const { name, date, capacity, assignedPets } = JSON.parse(event.body);
            const { rows } = await pool.query(
                `INSERT INTO "Run" ("recordId", "tenantId", "name", "date", "capacity", "assignedPets", "updatedAt")
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW()) RETURNING *`,
                [tenantId, name, date, capacity || 10, JSON.stringify(assignedPets || [])]
            );
            return { statusCode: 201, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }
        
        // PUT /api/v1/runs/{runId} - Update a run with time-slotted assignments
        if (httpMethod === 'PUT' && event.pathParameters?.runId) {
            const { assignedPets } = JSON.parse(event.body);
            
            // Get the run with template info for capacity validation
            const { rows: runRows } = await pool.query(
                `SELECT r.*, rt."timePeriodMinutes", rt."capacityType", rt."maxCapacity"
                 FROM "Run" r
                 LEFT JOIN "RunTemplate" rt ON r."templateId" = rt."recordId"
                 WHERE r."recordId" = $1 AND r."tenantId" = $2`,
                [event.pathParameters.runId, tenantId]
            );
            
            if (runRows.length === 0) {
                return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Run not found' }) };
            }
            
            const run = runRows[0];
            const capacityType = run.capacityType || 'total';
            const maxCapacity = run.maxCapacity || run.capacity || 10;
            
            // Validate capacity based on capacityType
            if (capacityType === 'total' && assignedPets.length > maxCapacity) {
                return { 
                    statusCode: 400, 
                    headers: HEADERS, 
                    body: JSON.stringify({ message: `Total capacity exceeded. Max: ${maxCapacity}` }) 
                };
            }
            
            if (capacityType === 'concurrent') {
                // Check for concurrent overlaps
                const timeSlots = {};
                assignedPets.forEach(a => {
                    if (a.startTime && a.endTime) {
                        const key = `${a.startTime}-${a.endTime}`;
                        timeSlots[key] = (timeSlots[key] || 0) + 1;
                        if (timeSlots[key] > maxCapacity) {
                            return { 
                                statusCode: 400, 
                                headers: HEADERS, 
                                body: JSON.stringify({ message: `Concurrent capacity exceeded for slot ${a.startTime}-${a.endTime}. Max: ${maxCapacity}` }) 
                            };
                        }
                    }
                });
            }
            
            // Update the run
            const { rows } = await pool.query(
                `UPDATE "Run" SET "assignedPets" = $1, "updatedAt" = NOW() WHERE "recordId" = $2 AND "tenantId" = $3 RETURNING *`,
                [JSON.stringify(assignedPets), event.pathParameters.runId, tenantId]
            );
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }
        
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not Found' }) };
    } catch (error) {
        console.error('Runs API Error:', error);
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

