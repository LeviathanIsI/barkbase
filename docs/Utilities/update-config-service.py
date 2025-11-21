#!/usr/bin/env python3
import re

# Read the file
with open('D:/barkbase-react/aws/lambdas/config-service/index.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the old handlers to replace
old_handlers = '''async function getPackages(event, tenantId) {
    const pool = getPool();
    const { rows } = await pool.query(`SELECT * FROM "Package" WHERE "tenantId" = $1 ORDER BY "name"`, [tenantId]);
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
}

async function createPackage(event, tenantId) {
    const pool = getPool();
    const { name, description, creditCount, priceCents, validityDays } = JSON.parse(event.body);
    const { rows } = await pool.query(
        `INSERT INTO "Package" ("recordId", "tenantId", "name", "description", "creditCount", "priceCents", "validityDays", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
        [tenantId, name, description, creditCount || 10, priceCents || 0, validityDays || 365]
    );
    return { statusCode: 201, headers: HEADERS, body: JSON.stringify(rows[0]) };
}'''

# Define the new handlers
new_handlers = '''async function getPackages(event, tenantId) {
    const pool = getPool();
    const { rows } = await pool.query(
        `SELECT * FROM "Package"
         WHERE "tenantId" = $1
         ORDER BY "displayOrder" ASC, "name" ASC`,
        [tenantId]
    );
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
}

async function getPackageById(event, tenantId, packageId) {
    const pool = getPool();

    const packageResult = await pool.query(
        `SELECT * FROM "Package" WHERE "recordId" = $1 AND "tenantId" = $2`,
        [packageId, tenantId]
    );

    if (packageResult.rows.length === 0) {
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Package not found' }) };
    }

    const servicesResult = await pool.query(
        `SELECT ps."recordId" as "packageServiceId", ps."quantity",
                s."recordId" as "serviceId", s."name", s."category",
                s."description", s."priceInCents", s."duration"
         FROM "PackageService" ps
         JOIN "Service" s ON ps."serviceId" = s."recordId"
         WHERE ps."packageId" = $1
         ORDER BY s."name" ASC`,
        [packageId]
    );

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ ...packageResult.rows[0], services: servicesResult.rows })
    };
}

async function createPackage(event, tenantId) {
    const pool = getPool();
    const body = JSON.parse(event.body || '{}');
    const { name, description, price, isActive = true, displayOrder = 0, services = [] } = body;

    if (!name) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: 'Package name is required' }) };
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const packageResult = await client.query(
            `INSERT INTO "Package" ("recordId", "tenantId", "name", "description", "price", "isActive", "displayOrder", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
            [tenantId, name, description || null, price || 0, isActive, displayOrder]
        );

        const newPackage = packageResult.rows[0];
        const includedServices = [];

        for (const service of services) {
            if (service.serviceId && service.quantity) {
                const serviceResult = await client.query(
                    `INSERT INTO "PackageService" ("recordId", "packageId", "serviceId", "quantity", "createdAt")
                     VALUES (gen_random_uuid(), $1, $2, $3, NOW()) RETURNING *`,
                    [newPackage.recordId, service.serviceId, service.quantity]
                );
                includedServices.push(serviceResult.rows[0]);
            }
        }

        await client.query('COMMIT');
        return { statusCode: 201, headers: HEADERS, body: JSON.stringify({ ...newPackage, services: includedServices }) };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function updatePackage(event, tenantId, packageId) {
    const pool = getPool();
    const body = JSON.parse(event.body || '{}');
    const { name, description, price, isActive, displayOrder, services } = body;

    const existingPackage = await pool.query(
        `SELECT * FROM "Package" WHERE "recordId" = $1 AND "tenantId" = $2`,
        [packageId, tenantId]
    );

    if (existingPackage.rows.length === 0) {
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Package not found' }) };
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const updateResult = await client.query(
            `UPDATE "Package" SET "name" = COALESCE($1, "name"), "description" = COALESCE($2, "description"),
                "price" = COALESCE($3, "price"), "isActive" = COALESCE($4, "isActive"),
                "displayOrder" = COALESCE($5, "displayOrder"), "updatedAt" = NOW()
             WHERE "recordId" = $6 AND "tenantId" = $7 RETURNING *`,
            [name, description, price, isActive, displayOrder, packageId, tenantId]
        );

        if (services && Array.isArray(services)) {
            await client.query(`DELETE FROM "PackageService" WHERE "packageId" = $1`, [packageId]);
            for (const service of services) {
                if (service.serviceId && service.quantity) {
                    await client.query(
                        `INSERT INTO "PackageService" ("recordId", "packageId", "serviceId", "quantity", "createdAt")
                         VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
                        [packageId, service.serviceId, service.quantity]
                    );
                }
            }
        }

        const servicesResult = await client.query(
            `SELECT ps."recordId" as "packageServiceId", ps."quantity", s."recordId" as "serviceId",
                    s."name", s."category", s."description", s."priceInCents", s."duration"
             FROM "PackageService" ps JOIN "Service" s ON ps."serviceId" = s."recordId"
             WHERE ps."packageId" = $1 ORDER BY s."name" ASC`,
            [packageId]
        );

        await client.query('COMMIT');
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ...updateResult.rows[0], services: servicesResult.rows }) };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function deletePackage(event, tenantId, packageId) {
    const pool = getPool();
    const result = await pool.query(
        `UPDATE "Package" SET "isActive" = false, "updatedAt" = NOW()
         WHERE "recordId" = $1 AND "tenantId" = $2 RETURNING *`,
        [packageId, tenantId]
    );

    if (result.rows.length === 0) {
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Package not found' }) };
    }

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ message: 'Package deleted successfully', package: result.rows[0] }) };
}'''

# Replace the handlers
if old_handlers in content:
    content = content.replace(old_handlers, new_handlers)
    print("✓ Replaced package handlers successfully")
else:
    print("✗ Could not find old handlers to replace")

# Write the updated content
with open('D:/barkbase-react/aws/lambdas/config-service/index.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ File updated successfully")
