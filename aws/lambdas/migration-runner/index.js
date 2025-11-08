const { getPool } = require('/opt/nodejs');

const MIGRATION_SQL = `
-- Package table - Bundled service offerings
CREATE TABLE IF NOT EXISTS "Package" (
    "recordId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("recordId") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN DEFAULT TRUE,
    "displayOrder" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_package_tenant ON "Package"("tenantId");
CREATE INDEX IF NOT EXISTS idx_package_active ON "Package"("isActive");

-- PackageService table - Junction table linking packages to services
CREATE TABLE IF NOT EXISTS "PackageService" (
    "recordId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "packageId" UUID NOT NULL REFERENCES "Package"("recordId") ON DELETE CASCADE,
    "serviceId" UUID NOT NULL REFERENCES "Service"("recordId") ON DELETE CASCADE,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE("packageId", "serviceId")
);

CREATE INDEX IF NOT EXISTS idx_package_service_package ON "PackageService"("packageId");
CREATE INDEX IF NOT EXISTS idx_package_service_service ON "PackageService"("serviceId");
`;

exports.handler = async (event) => {
    const pool = getPool();

    try {
        console.log('Running Package tables migration...');

        // Run the migration
        await pool.query(MIGRATION_SQL);

        console.log('Migration completed successfully');

        // Verify tables exist
        const result = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('Package', 'PackageService')
            ORDER BY table_name
        `);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Migration completed successfully',
                tables: result.rows.map(r => r.table_name)
            })
        };
    } catch (error) {
        console.error('Migration error:', error);

        if (error.code === '42P07') {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Tables already exist - migration already applied',
                    code: error.code
                })
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Migration failed',
                error: error.message,
                code: error.code
            })
        };
    }
};
