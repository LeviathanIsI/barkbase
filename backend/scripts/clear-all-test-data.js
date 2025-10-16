#!/usr/bin/env node

// This script clears ALL data except your core user/tenant/membership records

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Your account IDs to preserve
const YOUR_USER_ID = 'cmgtdqv2g0001us2syvg55ugt';
const YOUR_TENANT_ID = 'cmgtdqv000000us2sh5t96che';
const YOUR_MEMBERSHIP_ID = 'cmgtdqv7i0003us2sysxfuxco';

async function clearAllTestData() {
  console.log('🗑️  Clearing ALL test data (preserving your account)...\n');

  try {
    // First, delete all data from other tenants
    console.log('Deleting data from other tenants...');
    const otherTenants = await prisma.tenant.findMany({
      where: { recordId: { not: YOUR_TENANT_ID } }
    });

    for (const tenant of otherTenants) {
      console.log(`Deleting tenant: ${tenant.name} (${tenant.slug})`);
      
      // Delete all related data for other tenants
      await prisma.$transaction(async (tx) => {
        // Set tenant context
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenant.recordId}, true)`;
        
        // Delete in dependency order
        await tx.bookingService.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.bookingSegment.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.checkOut.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.checkIn.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.incidentReport.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.payment.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.booking.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.vaccination.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.petOwner.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.pet.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.owner.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.service.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.kennel.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.staff.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.auditLog.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.usageCounter.deleteMany({ where: { tenantId: tenant.recordId } });
        
        // Delete communication data
        await tx.communication.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.note.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.customerSegmentMember.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.customerSegment.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.customerTagMember.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.customerTag.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.campaign.deleteMany({ where: { tenantId: tenant.recordId } });
        
        // Delete tasks and messages
        await tx.task.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.message.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.runAssignment.deleteMany({ where: { tenantId: tenant.recordId } });
        await tx.run.deleteMany({ where: { tenantId: tenant.recordId } });
      });
    }

    // Delete the other tenant records themselves
    await prisma.tenant.deleteMany({
      where: { recordId: { not: YOUR_TENANT_ID } }
    });

    // Delete other users' memberships
    await prisma.membership.deleteMany({
      where: { 
        AND: [
          { userId: { not: YOUR_USER_ID } },
          { tenantId: { not: YOUR_TENANT_ID } }
        ]
      }
    });

    // Delete other users
    await prisma.user.deleteMany({
      where: { recordId: { not: YOUR_USER_ID } }
    });

    console.log('\n✅ Deleted all other tenants and users');

    // Now clear ALL data from YOUR tenant (except core records)
    console.log('\nClearing data from your tenant...');
    await prisma.$transaction(async (tx) => {
      // Set your tenant context
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${YOUR_TENANT_ID}, true)`;
      
      // Delete in dependency order
      console.log('- Deleting bookings and related data...');
      await tx.bookingService.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      await tx.bookingSegment.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      await tx.checkOut.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      await tx.checkIn.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      await tx.incidentReport.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      await tx.payment.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      await tx.booking.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      
      console.log('- Deleting pets and owners...');
      await tx.vaccination.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      await tx.petOwner.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      await tx.pet.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      await tx.owner.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      
      console.log('- Deleting kennels and services...');
      await tx.service.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      await tx.kennel.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      
      console.log('- Deleting staff (except yours)...');
      await tx.staff.deleteMany({ 
        where: { 
          tenantId: YOUR_TENANT_ID,
          membershipId: { not: YOUR_MEMBERSHIP_ID }
        } 
      });
      
      console.log('- Deleting other data...');
      await tx.auditLog.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      await tx.usageCounter.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      await tx.communication.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      await tx.note.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      await tx.customerSegmentMember.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      await tx.customerSegment.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      await tx.customerTagMember.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      await tx.customerTag.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      await tx.campaign.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      await tx.task.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      await tx.message.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      await tx.runAssignment.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
      await tx.run.deleteMany({ where: { tenantId: YOUR_TENANT_ID } });
    });

    console.log('\n✅ All test data cleared!');
    console.log('\n📋 Remaining in database:');
    console.log(`- Your user: ${YOUR_USER_ID}`);
    console.log(`- Your tenant: ${YOUR_TENANT_ID}`);
    console.log(`- Your membership: ${YOUR_MEMBERSHIP_ID}`);
    
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  }
}

async function main() {
  try {
    await clearAllTestData();
    console.log('\n✨ Done! Now run: npm run seed:my-account');
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
