/**
 * Migration script to transition existing users to the new permission system
 * This script:
 * 1. Creates system roles for each tenant
 * 2. Assigns roles based on existing membership roles
 * 3. Maintains backward compatibility
 */

const { prisma } = require('../lib/prisma');
const permissionService = require('../services/permission.service');

async function migrateToPermissionSystem() {
  console.log('Starting migration to new permission system...');

  try {
    // Get all tenants
    const tenants = await prisma.tenant.findMany({
      select: {
        recordId: true,
        name: true,
        slug: true
      }
    });

    console.log(`Found ${tenants.length} tenants to migrate`);

    for (const tenant of tenants) {
      console.log(`\nMigrating tenant: ${tenant.name} (${tenant.slug})`);

      // 1. Initialize system roles for the tenant
      console.log('  - Creating system roles...');
      const systemRoles = await permissionService.initializeSystemRoles(
        tenant.recordId,
        null // System created
      );
      console.log(`    Created ${systemRoles.length} system roles`);

      // 2. Get all memberships for this tenant
      const memberships = await prisma.membership.findMany({
        where: { tenantId: tenant.recordId },
        include: {
          user: {
            select: {
              recordId: true,
              email: true
            }
          }
        }
      });

      console.log(`  - Found ${memberships.length} memberships to migrate`);

      // 3. Map legacy roles to new roles
      const roleMapping = {
        'OWNER': 'Owner',
        'ADMIN': 'Administrator',
        'STAFF': 'Staff',
        'READONLY': 'Read Only'
      };

      // 4. Assign roles based on legacy membership roles
      for (const membership of memberships) {
        const legacyRole = membership.role;
        const newRoleName = roleMapping[legacyRole];

        if (!newRoleName) {
          console.warn(`    ! Unknown legacy role: ${legacyRole} for user ${membership.user.email}`);
          continue;
        }

        // Find the corresponding new role
        const newRole = await prisma.customRole.findFirst({
          where: {
            tenantId: tenant.recordId,
            name: newRoleName
          }
        });

        if (!newRole) {
          console.error(`    ! Could not find role: ${newRoleName}`);
          continue;
        }

        // Check if user already has this role
        const existingAssignment = await prisma.userRole.findUnique({
          where: {
            userId_roleId: {
              userId: membership.userId,
              roleId: newRole.recordId
            }
          }
        });

        if (existingAssignment) {
          console.log(`    - User ${membership.user.email} already has role ${newRoleName}`);
          continue;
        }

        // Assign the role
        await prisma.userRole.create({
          data: {
            userId: membership.userId,
            roleId: newRole.recordId,
            assignedBy: null // System assigned
          }
        });

        console.log(`    ✓ Assigned ${newRoleName} role to ${membership.user.email}`);
      }
    }

    // 5. Create default custom roles for better organization
    console.log('\nCreating suggested custom roles...');
    
    for (const tenant of tenants) {
      const customRoles = [
        {
          name: 'Receptionist',
          description: 'Front desk staff with booking and customer management access'
        },
        {
          name: 'Kennel Attendant',
          description: 'Staff responsible for daily pet care'
        },
        {
          name: 'Manager',
          description: 'Facility managers with extended permissions'
        }
      ];

      for (const roleData of customRoles) {
        const existingRole = await prisma.customRole.findUnique({
          where: {
            tenantId_name: {
              tenantId: tenant.recordId,
              name: roleData.name
            }
          }
        });

        if (!existingRole) {
          await permissionService.createRoleFromTemplate(
            tenant.recordId,
            roleData.name.toUpperCase().replace(' ', '_'),
            { name: roleData.name, description: roleData.description },
            null
          ).catch(err => {
            // Role template might not exist, create basic role
            return prisma.customRole.create({
              data: {
                tenantId: tenant.recordId,
                name: roleData.name,
                description: roleData.description,
                permissions: {},
                isSystem: false,
                isActive: true
              }
            });
          });
          console.log(`  ✓ Created ${roleData.name} role for ${tenant.name}`);
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Review the assigned roles in the admin panel');
    console.log('2. Customize permissions for each role as needed');
    console.log('3. Assign custom roles to users for more granular control');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  migrateToPermissionSystem()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { migrateToPermissionSystem };
