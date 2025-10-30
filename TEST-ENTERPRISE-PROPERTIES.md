# 🧪 Testing the Enterprise Property Management System

## ✅ Everything is DEPLOYED and LIVE!

**Test Now**: Open your BarkBase UI and test the new features!

---

## 🚀 Quick Test Guide

### 1. Test the New UI (Frontend)

**Navigate to**: Settings → Properties

You should now see:

✅ **New Enterprise View Toggle**
- A checkbox: "Use enterprise view (v2)" (should be checked by default)
- When enabled, you'll see the new HubSpot-style table

✅ **Enhanced Properties Table** with columns:
- NAME (with property type icon)
- PROPERTY TYPE (system/standard/protected/custom badge)
- PROPERTY ACCESS (everyone can edit/view)
- GROUP
- CREATED BY
- USED IN (count of assets)
- DEPENDENCIES (count with graph icon)
- FILL RATE (% filled with bar)

✅ **Property Type Icons**:
- 🛡️ Red shield = System property
- 📦 Blue cube = Standard property
- 🔒 Amber lock = Protected property
- ➕ Green plus = Custom property

### 2. Test the API v2

Open your browser console (F12) and run:

```javascript
// Test API v2 (Properties with rich metadata)
fetch('https://smvidb1rd0.execute-api.us-east-2.amazonaws.com/api/v2/properties?objectType=pets', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}` // or get from your auth store
  }
})
.then(r => r.json())
.then(data => {
  console.log('✅ Properties API v2 Response:', data);
  console.log(`Found ${data.properties?.length} properties`);
  console.log('Sample property:', data.properties[0]);
});
```

**Expected Response Structure**:
```json
{
  "properties": [
    {
      "propertyId": "uuid-here",
      "propertyName": "Name",
      "displayLabel": "Pet Name",
      "propertyType": "standard",
      "objectType": "pets",
      "dataType": "text",
      "createdBy": "BarkBase",
      "usage": {
        "recordsWithValues": 1234,
        "fillRate": 95.2,
        "usedInWorkflows": 2
      },
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": false
      }
    }
  ],
  "metadata": {
    "totalCount": 68
  }
}
```

### 3. Test Permission Profiles

```javascript
// Get permission profiles
fetch('https://smvidb1rd0.execute-api.us-east-2.amazonaws.com/api/v1/profiles', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
})
.then(r => r.json())
.then(data => {
  console.log('✅ Permission Profiles:', data);
  data.forEach(profile => {
    console.log(`${profile.profile_name}: Level ${profile.hierarchy_level}, ${profile.user_count} users`);
  });
});
```

**Expected**: Array of 4 profiles (Owners, Managers, Front Desk, Care Staff)

### 4. Test in UI - Property Actions

**Try these actions**:

1. **View Dependencies** (Click dependency count icon)
   - Should show dependency graph viewer
   - Displays property relationships

2. **View Usage** (Click "Used In" count)
   - Should show alert with usage breakdown
   - Workflows, Forms, Reports counts

3. **Edit Property** (Click Edit button)
   - System properties: Should be disabled
   - Standard properties: Can edit label/description only
   - Custom properties: Full edit capability

4. **Delete Property** (Click Delete on custom property)
   - Should trigger impact analysis
   - Show impact modal with risk assessment
   - Walk through deletion wizard

---

## 📊 Expected Data in UI

### Properties Tab
When you open Settings → Properties → Pets:

**You should see 68 properties classified as**:
- 20 System properties (red shield icon)
- 44 Standard properties (blue cube icon)
- 4 Protected properties (amber lock icon)
- 0 Custom properties (none created yet)

**Example properties you'll see**:
- `sys_record_id` (System)
- `Name` (Standard)
- `DateOfBirth` (Standard)
- `Weight` (Standard)
- `IsNeutered` (Standard)

### Permission Profiles (Not yet in UI, via API)
- **Owners**: Full access to everything
- **Managers**: Read-write on most, read-only on system fields
- **Front Desk**: Read-write on customer fields, read-only on financial
- **Care Staff**: Read-write on pet care, hidden on financial fields

---

## 🎯 Test Scenarios

### Scenario 1: View System Property
1. Find `sys_record_id` in the table
2. Notice: Red shield icon, "System" badge, "BarkBase" created by
3. Click Edit → Should not allow modification
4. No Delete button (system properties can't be deleted)

### Scenario 2: View Standard Property
1. Find `Name` property
2. Notice: Blue cube icon, "Standard" badge
3. Fill rate should show percentage
4. Click Edit → Can modify label and description

### Scenario 3: Create Custom Property
1. Click "Create property" button
2. Fill in:
   - Property Name: `custom_favorite_toy_t`
   - Display Label: `Favorite Toy`
   - Data Type: Text
3. Submit
4. Should appear in table with green plus icon

### Scenario 4: Test Archive/Restore
1. Create a test custom property
2. Click Delete
3. Should show impact analysis (low risk for new property)
4. Confirm deletion
5. Go to "Archived" tab
6. Find your property
7. Click "Restore"
8. Should move back to Properties tab

---

## 🔍 Database Verification

Connect to database and run:

```sql
-- View migrated properties
SELECT 
  property_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as pct
FROM "PropertyMetadata"
WHERE is_deleted = false
GROUP BY property_type
ORDER BY count DESC;

-- Expected results:
-- standard   | 44 | 64.7%
-- system     | 20 | 29.4%
-- protected  | 4  | 5.9%
-- custom     | 0  | 0.0%
```

```sql
-- View permission profiles
SELECT 
  profile_name, 
  hierarchy_level,
  (SELECT COUNT(*) FROM "PropertyPermission" pp 
   WHERE pp.profile_id = p.profile_id) as permissions_configured
FROM "PermissionProfile" p
WHERE is_global = true
ORDER BY hierarchy_level DESC;

-- Expected results:
-- Owners      | 4 | 68
-- Managers    | 3 | 68
-- Front Desk  | 2 | 68
-- Care Staff  | 1 | 68
```

---

## ⚙️ Advanced Testing

### Test Impact Analysis
```javascript
// Analyze impact of deleting a property
fetch('https://smvidb1rd0.execute-api.us-east-2.amazonaws.com/api/v2/properties/PROPERTY_ID_HERE/impact-analysis', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    modificationType: 'delete'
  })
})
.then(r => r.json())
.then(data => {
  console.log('Impact Analysis:', data);
  console.log(`Risk Level: ${data.riskAssessment.level}`);
  console.log(`Affected Properties: ${data.impactSummary.affectedPropertiesCount}`);
  console.log(`Records with Values: ${data.impactSummary.recordsWithValuesCount}`);
});
```

### Test Archive Operation
```javascript
// Archive a custom property
fetch('https://smvidb1rd0.execute-api.us-east-2.amazonaws.com/api/v2/properties/PROPERTY_ID_HERE/archive', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reason: 'Testing archival feature',
    confirmed: true,
    cascadeStrategy: 'cancel'
  })
})
.then(r => r.json())
.then(data => {
  console.log('Archive Result:', data);
  console.log(`Restoration window: ${data.restorationWindow}`);
});
```

### Test Restore Operation
```javascript
// Restore archived property
fetch('https://smvidb1rd0.execute-api.us-east-2.amazonaws.com/api/v2/properties/PROPERTY_ID_HERE/restore', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
})
.then(r => r.json())
.then(data => {
  console.log('Restore Result:', data);
  console.log(`Restored ${data.restoredDependencies} dependencies`);
});
```

---

## 🐛 Troubleshooting

### Issue: Can't see new enterprise table

**Check**:
1. Is "Use enterprise view (v2)" checkbox checked?
2. Open browser console - any errors?
3. Check Network tab for failed API calls

**Solution**:
- Refresh the page
- Clear browser cache
- Check if API v2 is accessible

### Issue: API v2 returns error

**Common Errors**:

**401 Unauthorized**:
- Your auth token expired
- Log out and log back in

**Missing tenant context**:
- Tenant store not loaded yet
- Wait a moment and retry
- Check if you're logged in

**500 Internal Server Error**:
- Check CloudWatch Logs:
```bash
aws logs tail /aws/lambda/Barkbase-dev-PropertiesApiV2Function --follow
```

### Issue: Properties not showing usage data

**This is expected!**
- Usage statistics are calculated on-demand
- First load may show 0% fill rate
- Click property to see detailed usage
- Usage tracking will improve over time

---

## ✅ Success Indicators

### You'll know it's working when:

1. **Properties Page**:
   - ✅ See 68 properties in Pets table
   - ✅ Color-coded badges (System=red, Standard=blue, Protected=amber)
   - ✅ Fill rate bars showing data usage
   - ✅ Created by column shows "BarkBase" for system properties

2. **Interactions**:
   - ✅ Can toggle between v1 and v2 views
   - ✅ Can view dependency graphs (even if empty)
   - ✅ Can see usage statistics
   - ✅ Deletion wizard shows impact analysis

3. **API Responses**:
   - ✅ v2 API returns rich metadata
   - ✅ Profiles API returns 4 profiles
   - ✅ Archive/restore operations work

4. **Database**:
   - ✅ PropertyMetadata has 68 rows
   - ✅ PermissionProfile has 4 rows
   - ✅ PropertyPermission has 272 rows

---

## 📸 What You Should See

### Properties Table (Enterprise View)
```
┌─────────────────────────────────────────────────────────────────────┐
│ [✓] NAME                  TYPE    ACCESS         CREATED BY  FILL   │
├─────────────────────────────────────────────────────────────────────┤
│ [ ] 🛡️ sys_record_id      System  Everyone view  BarkBase    100%   │
│ [ ] 📦 Name                Standard Everyone edit BarkBase    95.2%  │
│ [ ] 📦 Breed               Standard Everyone edit BarkBase    87.3%  │
│ [ ] 📦 Color               Standard Everyone edit BarkBase    76.1%  │
│ [ ] 🔒 BalanceDueCents     Protected Everyone view BarkBase   45.2%  │
└─────────────────────────────────────────────────────────────────────┘
```

### Dependency Graph (When Clicked)
```
A modal should open showing:
- Graph visualization area
- Legend (System=red, Standard=blue, etc.)
- Metrics (Nodes, Edges, Max Depth)
- Selected node details
```

---

## 📊 Performance Tests

### Response Time Test
```javascript
console.time('Properties API v2');
fetch('https://smvidb1rd0.execute-api.us-east-2.amazonaws.com/api/v2/properties?objectType=pets', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
})
.then(r => r.json())
.then(data => {
  console.timeEnd('Properties API v2');
  console.log(`Loaded ${data.properties.length} properties`);
});

// Expected: < 500ms for first load, < 100ms cached
```

### Database Query Performance
```sql
-- Test query performance
EXPLAIN ANALYZE
SELECT * FROM "PropertyMetadata"
WHERE object_type = 'pets'
  AND is_deleted = false
ORDER BY property_type, property_name;

-- Should use indexes and execute in < 10ms
```

---

## 🎓 Learning Exercises

### Exercise 1: Explore Property Classification
1. Open Properties page
2. Note the distribution of property types
3. Try editing each type - see what's allowed
4. Understand the security model

### Exercise 2: Create a Custom Property
1. Click "Create property"
2. Enter:
   - Name: `custom_favorite_food_t`
   - Label: `Favorite Food`
   - Type: Custom
   - Data Type: Text
3. Save and see it appear with green icon

### Exercise 3: Test Archive/Restore
1. Create a test custom property
2. Delete it (watch the wizard flow)
3. Go to Archived tab
4. Restore it
5. See it return to active properties

### Exercise 4: View Dependency Graph
1. Click the dependency icon on any property
2. See the graph viewer modal
3. Understand upstream/downstream relationships
4. Close and try another property

---

## 📋 Checklist

Mark these off as you test:

- [ ] Can access Settings → Properties page
- [ ] Enterprise view toggle works
- [ ] See 68 pet properties in table
- [ ] Properties have correct type badges (red/blue/amber/green)
- [ ] Fill rate bars display
- [ ] Can click "Used In" to see usage
- [ ] Can click dependencies to see graph
- [ ] Can edit standard property label
- [ ] Can't edit system property (disabled)
- [ ] Can create custom property
- [ ] Can archive custom property
- [ ] Can restore from Archived tab
- [ ] API v2 returns rich metadata
- [ ] Permission profiles API works
- [ ] CloudWatch Logs show function executions

---

## 🆘 If Something Doesn't Work

### Frontend Issues
```bash
# Check browser console for errors
# Open DevTools → Console

# Check Network tab
# Look for failed /api/v2/properties calls
```

### Backend Issues
```bash
# Check Lambda logs
aws logs tail /aws/lambda/Barkbase-dev-PropertiesApiV2Function --follow --region us-east-2

# Check if function exists
aws lambda get-function --function-name Barkbase-dev-PropertiesApiV2Function --region us-east-2
```

### Database Issues
```bash
# Verify tables exist
psql -h barkbase-dev-public.ctuea6sg4d0d.us-east-2.rds.amazonaws.com \
  -U postgres -d barkbase \
  -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'Property%';"
```

---

## 🎯 Next Steps After Testing

1. **If everything works**: 
   - Start using the enterprise view
   - Create custom properties as needed
   - Explore dependency tracking
   - Review permission profiles

2. **If issues found**:
   - Check CloudWatch Logs
   - Review browser console errors
   - Verify API endpoints are accessible
   - Check database connectivity

3. **For production readiness**:
   - Run performance tests
   - Test with real tenant data
   - Validate permission filtering
   - Monitor scheduled jobs (wait 24 hours for first run)

---

## 🎉 Success Criteria

You've successfully deployed when:

✅ Properties page loads with new enterprise table  
✅ Can toggle between v1/v2 views  
✅ See 68 properties with proper classification  
✅ API v2 returns rich metadata  
✅ Can create/edit/archive/restore properties  
✅ Dependency graph viewer opens  
✅ Impact analysis modal shows before deletion  
✅ CloudWatch Logs show successful executions  
✅ Permission profiles accessible via API  
✅ Scheduled jobs configured in EventBridge  

---

**Status**: 🎊 **READY FOR TESTING!**

Open BarkBase and start exploring the new enterprise features!

