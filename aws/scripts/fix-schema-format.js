const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'schema.sql');

// Read the file
let content = fs.readFileSync(schemaPath, 'utf8');

// The compressed Package tables line to replace (line 129)
const compressedPackage = /-- Package table - Bundled service offeringsCREATE TABLE.*?CREATE INDEX IF NOT EXISTS idx_package_service_service ON "PackageService"\("serviceId"\);/s;

// The properly formatted version
const formattedPackage = `-- Package table - Bundled service offerings
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

// Replace
if (compressedPackage.test(content)) {
    content = content.replace(compressedPackage, formattedPackage);
    fs.writeFileSync(schemaPath, content, 'utf8');
    console.log('✓ Fixed compressed Package tables formatting in schema.sql');
} else {
    console.log('✗ Could not find compressed Package tables to fix');
}
