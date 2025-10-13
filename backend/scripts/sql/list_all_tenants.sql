-- List all tenants in the database
SELECT "recordId" as id, slug, name, plan, "createdAt" 
FROM "Tenant" 
ORDER BY "createdAt" DESC;

