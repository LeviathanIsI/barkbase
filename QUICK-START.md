# Enterprise Property Management System - Quick Start Guide

## 🚀 System is Now LIVE!

The Enterprise Property Management System has been successfully deployed with all backend infrastructure operational.

---

## ✅ What's Deployed

### Database (100% Complete)
- ✅ 68 properties migrated and classified
- ✅ 4 permission profiles configured
- ✅ 11 database tables created
- ✅ 15+ stored procedures for automation
- ✅ Complete audit trail system

### Lambda Functions (100% Complete)
- ✅ 7 Lambda functions deployed
- ✅ 2 scheduled jobs configured (daily archival, weekly deletion)
- ✅ 40+ API endpoints ready (not yet integrated with API Gateway)

### Documentation (100% Complete)
- ✅ 5 comprehensive guides
- ✅ Migration runbooks
- ✅ API reference
- ✅ Admin documentation

---

## 🎯 Quick Access

### View Migrated Properties
```sql
psql -h barkbase-dev-public.ctuea6sg4d0d.us-east-2.rds.amazonaws.com \
  -U postgres -d barkbase \
  -c "SELECT property_name, property_type, object_type, created_by 
      FROM \"PropertyMetadata\" 
      WHERE is_deleted = false 
      ORDER BY property_type, object_type 
      LIMIT 20;"
```

### Check Permission Profiles
```sql
SELECT 
  pp.profile_name,
  pp.hierarchy_level,
  COUNT(perm.permission_id) as configured_properties
FROM "PermissionProfile" pp
LEFT JOIN "PropertyPermission" perm ON pp.profile_id = perm.profile_id
GROUP BY pp.profile_name, pp.hierarchy_level
ORDER BY pp.hierarchy_level DESC;
```

### View Scheduled Jobs
```bash
aws events list-rules --name-prefix "BarkbaseProperty" --region us-east-2
```

### View Lambda Functions
```bash
aws lambda list-functions \
  --query "Functions[?contains(FunctionName, 'BarkbaseEnterprise')].[FunctionName,Runtime,Timeout]" \
  --output table \
  --region us-east-2
```

---

## 📖 Documentation

| Guide | Location | Purpose |
|-------|----------|---------|
| **Migration Guide** | `docs/enterprise-property-system-migration.md` | Deployment steps, rollback procedures |
| **Admin Guide** | `docs/admin-guide-enterprise-properties.md` | Day-to-day administration |
| **API Reference** | `docs/api-reference-properties-v2.md` | Complete API documentation |
| **Type Conversion** | `docs/type-conversion-matrix.md` | Type change rules and patterns |
| **Naming Conventions** | `docs/naming-conventions.md` | Property naming standards |
| **Deployment Summary** | `DEPLOYMENT-SUMMARY.md` | Deployment statistics and status |

---

## 🔧 Common Tasks

### 1. Create a Custom Property

Not yet available via UI (requires API Gateway integration). For now, use direct SQL:

```sql
INSERT INTO "PropertyMetadata" (
  property_name,
  display_label,
  description,
  object_type,
  property_type,
  data_type,
  created_by,
  tenant_id,
  is_global
) VALUES (
  'custom_favorite_color_ss',
  'Favorite Color',
  'Pet''s favorite color',
  'pets',
  'custom',
  'single_select',
  'user-id-here',
  'tenant-id-here',
  false
);
```

### 2. View Property Dependencies

```sql
SELECT 
  pm_source.property_name as source,
  pm_dependent.property_name as dependent,
  pd.dependency_type,
  pd.is_critical
FROM "PropertyDependencies" pd
INNER JOIN "PropertyMetadata" pm_source ON pd.source_property_id = pm_source.property_id
INNER JOIN "PropertyMetadata" pm_dependent ON pd.dependent_property_id = pm_dependent.property_id
WHERE pd.is_active = true
LIMIT 20;
```

### 3. Check Audit Trail

```sql
SELECT 
  change_type,
  property_id,
  changed_by,
  changed_date,
  change_reason
FROM "PropertyChangeAudit"
ORDER BY changed_date DESC
LIMIT 20;
```

### 4. View User Permissions

```sql
SELECT * FROM get_accessible_properties(
  'user-id-here',  -- User ID
  'tenant-id-here', -- Tenant ID
  'pets',          -- Object type
  'read-only'      -- Minimum access level
);
```

---

## ⚠️ Important Notes

### API Gateway Integration Required
The Lambda functions are deployed but not yet integrated with API Gateway. To use them:

**Option A: Invoke directly via AWS CLI**
```bash
aws lambda invoke \
  --function-name BarkbaseEnterprise-properties-api-v2 \
  --payload '{"requestContext":{"http":{"method":"GET","path":"/api/v2/properties"}}}' \
  response.json
```

**Option B: Add to API Gateway manually** (temporary until CDK stack optimized)
1. Go to AWS Console → API Gateway
2. Select "BarkbaseApi"
3. Create resources and integrations for `/api/v2/properties/*` routes
4. Point to deployed Lambda functions

**Option C: Wait for CDK stack optimization** (recommended)
We're working on splitting the stack to stay under AWS's 500-resource limit.

### Frontend Integration Pending
The new UI components are created but not yet integrated into the main app:
- `EnterprisePropertiesTable.jsx` - Ready for integration
- `DependencyGraphViewer.jsx` - Ready for integration
- `ImpactAnalysisModal.jsx` - Ready for integration
- `PropertyDeletionWizard.jsx` - Ready for integration

To integrate, update `frontend/src/features/settings/routes/PropertiesOverview.jsx` to import and use these components.

---

## 🎯 Rollout Plan

### Phase 1: Internal Testing (Current)
- **Status**: ✅ Deployed
- **Scope**: Database + Lambda functions
- **Access**: Internal team only
- **Duration**: 1-2 weeks

### Phase 2: API Integration
- **Status**: ⏳ Pending
- **Task**: Integrate Lambdas with API Gateway
- **Duration**: 1-2 days

### Phase 3: Frontend Integration
- **Status**: ⏳ Pending
- **Task**: Deploy new UI components
- **Duration**: 2-3 days

### Phase 4: Beta Rollout
- **Status**: ⏳ Pending
- **Scope**: 10% of production tenants
- **Duration**: 1 week

### Phase 5: Full Production
- **Status**: ⏳ Pending
- **Scope**: All tenants
- **Duration**: 2 weeks (staged)

---

## 💡 Pro Tips

1. **Backup Before Changes**: All modifications are logged, but backups are still recommended
2. **Use Impact Analysis**: Always analyze before deleting properties
3. **Follow Naming Conventions**: Ensures consistency and enables automation
4. **Review Audit Trail**: Comprehensive history of all changes
5. **Leverage Permissions**: Use profiles instead of individual permissions

---

## 📊 Monitoring

### CloudWatch Metrics (Available After API Gateway Integration)
- API request count
- Error rates
- Latency (p50, p95, p99)
- Lambda invocations
- Database connections

### EventBridge Jobs
- View execution history in AWS Console → EventBridge → Rules
- Check Lambda function logs for job results
- Monitor CloudWatch for errors

---

## 🆘 Troubleshooting

### Issue: Lambda function not responding
**Solution**: Check CloudWatch logs for the specific function

### Issue: Permission denied errors
**Solution**: Verify user has profile assignment in `UserProfileAssignment` table

### Issue: Property not appearing
**Solution**: Check `is_deleted` flag in `PropertyMetadata` table

### Issue: Scheduled jobs not running
**Solution**: Verify EventBridge rules are enabled and Lambda has invoke permissions

---

## 📞 Support

- **Documentation**: `/docs` directory
- **Logs**: CloudWatch Logs (AWS Console)
- **Issues**: Contact BarkBase engineering team

---

**Status**: ✅ **BACKEND DEPLOYED & OPERATIONAL**  
**Next Action**: API Gateway integration + Frontend deployment  
**Timeline**: 3-5 days for full integration

🎉 **Enterprise Property Management System - Backend is LIVE!**

