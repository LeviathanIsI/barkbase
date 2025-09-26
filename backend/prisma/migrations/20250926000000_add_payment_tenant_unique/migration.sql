-- Add unique composite index for tenant-scoped payment external IDs
CREATE UNIQUE INDEX "Payment_tenantId_externalId_key" ON "Payment" ("tenantId", "externalId");
