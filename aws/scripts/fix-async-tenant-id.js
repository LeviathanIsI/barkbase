const fs = require('fs');
const path = require('path');

const lambdaDirs = [
  'account-defaults-api', 'admin-api', 'billing-api', 'bookings-api',
  'calendar-api', 'communication-api', 'facility-api', 'incidents-api',
  'invites-api', 'invoices-api', 'kennels-api', 'memberships-api',
  'messages-api', 'notes-api', 'owners-api', 'packages-api',
  'payments-api', 'pets-api', 'reports-api', 'roles-api',
  'runs-api', 'services-api', 'staff-api', 'tasks-api',
  'tenants-api', 'user-permissions-api'
];

const lambdasDir = path.join(__dirname, '../lambdas');

lambdaDirs.forEach(dir => {
  const filePath = path.join(lambdasDir, dir, 'index.js');
  
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Skipping ${dir} (file not found)`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace synchronous call with await
  const updated = content.replace(
    /const tenantId = getTenantIdFromEvent\(event\);/g,
    'const tenantId = await getTenantIdFromEvent(event);'
  );

  if (content !== updated) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`✅ Updated ${dir}/index.js`);
  } else {
    console.log(`⏭️  No changes needed for ${dir}/index.js`);
  }
});

console.log('\n✅ All Lambda functions updated!');


