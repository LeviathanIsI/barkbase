-- Verify Enterprise Property System Deployment

\echo '=== Property Classification Distribution ==='
SELECT 
    property_type,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
FROM "PropertyMetadata"
WHERE is_deleted = false
GROUP BY property_type
ORDER BY count DESC;

\echo ''
\echo '=== Permission Profiles ==='
SELECT profile_name, hierarchy_level, is_global, is_active
FROM "PermissionProfile"
ORDER BY hierarchy_level DESC;

\echo ''
\echo '=== Property Permissions Summary ==='
SELECT 
    pp.profile_name,
    COUNT(*) FILTER (WHERE perm.access_level = 'read-write') as read_write,
    COUNT(*) FILTER (WHERE perm.access_level = 'read-only') as read_only,
    COUNT(*) FILTER (WHERE perm.access_level = 'hidden') as hidden,
    COUNT(*) as total
FROM "PropertyPermission" perm
INNER JOIN "PermissionProfile" pp ON perm.profile_id = pp.profile_id
GROUP BY pp.profile_name
ORDER BY pp.hierarchy_level DESC;

\echo ''
\echo '=== Schema Version Status ==='
SELECT 
    tenant_id,
    current_schema_version,
    migration_status,
    rollout_group
FROM "TenantSchemaVersion"
LIMIT 5;

\echo ''
\echo '=== Audit Trail Sample ==='
SELECT 
    change_type,
    COUNT(*) as count
FROM "PropertyChangeAudit"
GROUP BY change_type
ORDER BY count DESC;

\echo ''
\echo '✓ Deployment Verification Complete'

