/**
 * Export Property Data Handler
 * Exports all data values for a property to enable safe type conversion
 * Generates CSV export for the Export-Clear-Change-Import pattern
 */

const { getPool } = require('/opt/nodejs');

/**
 * Export property data to CSV format
 * @param {string} propertyId - Property ID
 * @param {number} tenantId - Tenant ID
 * @returns {object} - Export result with CSV data
 */
async function exportPropertyData(propertyId, tenantId) {
  const pool = getPool();

  // Get property details
  const propertyResult = await pool.query(
    `SELECT * FROM "PropertyMetadata" 
     WHERE "property_id" = $1 AND ("tenant_id" = $2 OR "is_global" = true)`,
    [propertyId, tenantId]
  );

  if (propertyResult.rows.length === 0) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Property not found' }),
    };
  }

  const property = propertyResult.rows[0];

  // Map object types to table names
  const tableMap = {
    pets: 'Pet',
    owners: 'Owner',
    bookings: 'Booking',
    payments: 'Payment',
    invoices: 'Invoice',
    staff: 'Staff',
    facilities: 'Facility',
    kennels: 'Kennel',
    runs: 'Run',
    services: 'Service',
    packages: 'Package',
    memberships: 'Membership',
    vaccinations: 'Vaccination',
    incidents: 'Incident',
    notes: 'Note',
    messages: 'Message',
    tasks: 'Task',
    users: 'User',
  };

  const tableName = tableMap[property.object_type];
  if (!tableName) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unsupported object type for export' }),
    };
  }

  try {
    let queryResult;
    
    // For custom properties, extract from JSONB
    if (property.property_type === 'custom') {
      queryResult = await pool.query(
        `SELECT 
          "recordId",
          "customFields"->>'${property.property_name}' AS value,
          "createdAt",
          "updatedAt"
         FROM "${tableName}" 
         WHERE "customFields"->>'${property.property_name}' IS NOT NULL
           AND ("tenantId" = $1 OR $1 IS NULL)
         ORDER BY "recordId"`,
        [property.tenant_id]
      );
    } else {
      // For system/standard properties, query actual column
      const columnCheck = await pool.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = $1 AND column_name = $2`,
        [tableName, property.property_name]
      );

      if (columnCheck.rows.length === 0) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Property column does not exist in table' }),
        };
      }

      queryResult = await pool.query(
        `SELECT 
          "recordId",
          "${property.property_name}" AS value,
          "createdAt",
          "updatedAt"
         FROM "${tableName}" 
         WHERE "${property.property_name}" IS NOT NULL
           AND ("tenantId" = $1 OR $1 IS NULL)
         ORDER BY "recordId"`,
        [property.tenant_id]
      );
    }

    // Generate CSV
    const csv = generateCSV(queryResult.rows, property);

    // Store export metadata for audit
    await pool.query(
      `INSERT INTO "PropertyChangeAudit" (
        "property_id",
        "change_type",
        "changed_by",
        "changed_date",
        "change_reason",
        "affected_records_count",
        "risk_level"
      ) VALUES ($1, 'MODIFY', 'system', NOW(), 'Property data exported for type conversion', $2, 'low')`,
      [propertyId, queryResult.rows.length]
    );

    // Return CSV with appropriate headers
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${property.property_name}_export_${Date.now()}.csv"`,
      },
      body: csv,
    };
  } catch (error) {
    console.error('Error exporting property data:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
}

/**
 * Generate CSV from query results
 */
function generateCSV(rows, property) {
  if (rows.length === 0) {
    return `recordId,${property.property_name},createdAt,updatedAt\n`;
  }

  // Header row
  const headers = ['recordId', property.property_name, 'createdAt', 'updatedAt'];
  let csv = headers.join(',') + '\n';

  // Data rows
  for (const row of rows) {
    const values = [
      escapeCSV(row.recordId),
      escapeCSV(row.value),
      escapeCSV(row.createdAt ? row.createdAt.toISOString() : ''),
      escapeCSV(row.updatedAt ? row.updatedAt.toISOString() : ''),
    ];
    csv += values.join(',') + '\n';
  }

  return csv;
}

/**
 * Escape CSV values
 */
function escapeCSV(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Clear property data (part of Export-Clear-Change-Import)
 * @param {string} propertyId - Property ID
 * @param {number} tenantId - Tenant ID
 * @param {string} userId - User ID performing the operation
 * @param {object} options - Clear options
 * @returns {object} - Clear result
 */
async function clearPropertyData(propertyId, tenantId, userId, options = {}) {
  const pool = getPool();

  // Get property details
  const propertyResult = await pool.query(
    `SELECT * FROM "PropertyMetadata" 
     WHERE "property_id" = $1 AND ("tenant_id" = $2 OR "is_global" = true)`,
    [propertyId, tenantId]
  );

  if (propertyResult.rows.length === 0) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Property not found' }),
    };
  }

  const property = propertyResult.rows[0];

  // Require confirmation
  if (!options.confirmed) {
    return {
      statusCode: 409,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requiresConfirmation: true,
        message: 'This will permanently clear all data for this property',
        confirmationRequired: `Type "${property.property_name}" to confirm`,
      }),
    };
  }

  const tableMap = {
    pets: 'Pet',
    owners: 'Owner',
    bookings: 'Booking',
    payments: 'Payment',
    invoices: 'Invoice',
    staff: 'Staff',
    facilities: 'Facility',
    kennels: 'Kennel',
    runs: 'Run',
    services: 'Service',
    packages: 'Package',
    memberships: 'Membership',
    vaccinations: 'Vaccination',
    incidents: 'Incident',
    notes: 'Note',
    messages: 'Message',
    tasks: 'Task',
    users: 'User',
  };

  const tableName = tableMap[property.object_type];
  if (!tableName) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unsupported object type' }),
    };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let clearedCount = 0;

    // Clear data
    if (property.property_type === 'custom') {
      const result = await client.query(
        `UPDATE "${tableName}"
         SET "customFields" = "customFields" - '${property.property_name}'
         WHERE "customFields"->>'${property.property_name}' IS NOT NULL
           AND ("tenantId" = $1 OR $1 IS NULL)`,
        [property.tenant_id]
      );
      clearedCount = result.rowCount;
    } else {
      const result = await client.query(
        `UPDATE "${tableName}"
         SET "${property.property_name}" = NULL
         WHERE "${property.property_name}" IS NOT NULL
           AND ("tenantId" = $1 OR $1 IS NULL)`,
        [property.tenant_id]
      );
      clearedCount = result.rowCount;
    }

    // Log to audit trail
    await client.query(
      `INSERT INTO "PropertyChangeAudit" (
        "property_id",
        "change_type",
        "changed_by",
        "changed_date",
        "change_reason",
        "affected_records_count",
        "risk_level"
      ) VALUES ($1, 'MODIFY', $2, NOW(), $3, $4, 'high')`,
      [propertyId, userId, options.reason || 'Property data cleared for type conversion', clearedCount]
    );

    await client.query('COMMIT');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Property data cleared successfully',
        clearedCount,
      }),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error clearing property data:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  } finally {
    client.release();
  }
}

module.exports = {
  exportPropertyData,
  clearPropertyData,
};

