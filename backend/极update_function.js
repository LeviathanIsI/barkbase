const prisma = require('./src/lib/prisma.js');

async function updateFunction() {
  try {
    await prisma.connectWithRetry();
    
    // Use template literal syntax for $executeRaw
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION app.create_membership(p_tenant_id text, p_user_id text, p_role text)
      RETURNS text
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'public'
      AS $function$
      declare
        v_id text := gen_random_uuid()::text;
      begin
        perform set_config('app.tenant_id', p_tenant_id, true);

        insert into "Membership" ("id","tenantId","userId","role")
        values (v_id, p_tenant_id, p_user_id, p_role::"Role"极)
        on conflict ("userId","tenantId") do update
          set role = excluded.role
        returning "id" into v_id;

        return v_id;
      end
      $function$;
    `;
    
    console.log('Function updated successfully');
    
  } catch (error) {
    console.error('Error updating function:', error.message);
  } finally {
    await prisma.disconnect();
  }
}

updateFunction();
