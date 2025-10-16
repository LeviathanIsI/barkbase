#!/usr/bin/env node
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const { PrismaClient } = require("@prisma/client");
const {
  getDatabaseUrl,
  getConnectionInfo,
} = require("../src/config/databaseUrl");

async function setupDatabase() {
  console.log("🚀 Setting up Supabase database...\n");

  // Get database connection info
  const connectionInfo = getConnectionInfo();
  console.log("Database Connection Info:");
  console.log("- Environment:", connectionInfo.nodeEnv);
  console.log("- Source:", connectionInfo.source);
  console.log("- Host:", connectionInfo.host);
  console.log("- Port:", connectionInfo.port);
  console.log("- Is Pooler:", connectionInfo.isPooler);
  console.log("- Redacted URL:", connectionInfo.redactedUrl);
  console.log("\n");

  if (
    !process.env.DATABASE_URL &&
    !process.env.DEV_DATABASE_URL &&
    !process.env.PROD_DATABASE_URL
  ) {
    console.error("❌ No database URL configured!");
    console.error("\nPlease set one of the following environment variables:");
    console.error("- DATABASE_URL: Main database URL");
    console.error(
      "- DEV_DATABASE_URL: Development database URL (direct connection)"
    );
    console.error(
      "- PROD_DATABASE_URL: Production database URL (pooled connection)"
    );
    console.error("\nExample:");
    console.error(
      "DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
    );
    process.exit(1);
  }

  // Test connection
  const prisma = new PrismaClient();

  try {
    console.log("Testing database connection...");
    await prisma.$connect();

    // Check if we can query the database
    const result =
      await prisma.$queryRaw`SELECT current_database(), current_schema(), current_user`;
    console.log("✅ Connected successfully!");
    console.log("Database info:", result[0]);

    // Check if RLS is enabled
    console.log("\nChecking RLS status...");
    const rlsCheck = await prisma.$queryRaw`
      SELECT schemaname, tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('tenants', 'users', 'pets', 'owners')
      ORDER BY tablename
    `;

    console.log("\nRLS Status:");
    for (const table of rlsCheck) {
      console.log(
        `- ${table.tablename}: ${
          table.rowsecurity ? "✅ Enabled" : "❌ Disabled"
        }`
      );
    }

    // Check if app schema exists (for RLS functions)
    const schemaCheck = await prisma.$queryRaw`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'app'
    `;

    if (schemaCheck.length === 0) {
      console.log(
        "\n⚠️  App schema not found. You may need to run RLS setup scripts."
      );
    } else {
      console.log("\n✅ App schema exists");

      // Check for set_tenant_id function
      const functionCheck = await prisma.$queryRaw`
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'app' 
        AND routine_name = 'set_tenant_id'
      `;

      if (functionCheck.length === 0) {
        console.log("⚠️  set_tenant_id function not found");
      } else {
        console.log("✅ set_tenant_id function exists");
      }
    }

    // Check table count
    const tableCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `;

    console.log(`\n📊 Total tables in public schema: ${tableCount[0].count}`);
  } catch (error) {
    console.error("❌ Failed to connect to database:", error.message);

    if (error.message.includes("P1001")) {
      console.error("\nConnection timeout. Please check:");
      console.error("1. Your database URL is correct");
      console.error("2. Your Supabase project is active");
      console.error("3. Your network allows connections to Supabase");
    } else if (error.message.includes("P1002")) {
      console.error("\nDatabase server rejected the connection. Please check:");
      console.error("1. Your password is correct");
      console.error("2. The database user exists");
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n✨ Database setup check complete!");
  console.log("\nNext steps:");
  console.log("1. Run migrations: npm run prisma:migrate");
  console.log("2. Generate Prisma Client: npm run prisma:generate");
  console.log("3. Seed data: npm run seed");
}

setupDatabase().catch(console.error);
