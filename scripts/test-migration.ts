// Test Migration Script: Migrate only AppointmentType table (30 rows)
// Run with: npx tsx scripts/test-migration.ts

// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import sql from 'mssql';

const prisma = new PrismaClient();

// SQL Server LocalDB connection config
// Try localhost with default instance
const sqlConfig: sql.config = {
  server: 'localhost',
  database: 'DEV',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    port: 1433, // Default SQL Server port
    connectTimeout: 30000,
  },
  authentication: {
    type: 'default',
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

async function testMigration() {
  console.log('🧪 TEST MIGRATION: AppointmentType only');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let pool: sql.ConnectionPool | null = null;

  try {
    // Connect to SQL Server
    console.log('🔌 Connecting to SQL Server LocalDB...');
    pool = await sql.connect(sqlConfig);
    console.log('✅ Connected\n');

    // Connect to Supabase
    console.log('🔌 Connecting to Supabase...');
    await prisma.$connect();
    console.log('✅ Connected\n');

    // Fetch AppointmentType data
    console.log('📋 Fetching AppointmentType from SQL Server...');
    const result = await pool.request().query('SELECT * FROM AppointmentType ORDER BY ID');
    const types = result.recordset;
    console.log(`   Found ${types.length} appointment types\n`);

    // Display first 3 records
    console.log('📄 Sample data (first 3 records):');
    types.slice(0, 3).forEach((type, idx) => {
      console.log(`   ${idx + 1}. ID: ${type.ID}, Code: ${type.Code}, Type: ${type.Appt_Type}`);
    });
    console.log('');

    // Check if table already has data
    const existingCount = await prisma.appointmentType.count();
    if (existingCount > 0) {
      console.log(`⚠️  Warning: appointment_types table already has ${existingCount} records`);
      console.log('   Skipping migration to avoid duplicates');
      console.log('   To re-run, first clear the table in Supabase Studio\n');
      return;
    }

    // Migrate data
    console.log('💾 Migrating to Supabase...');
    let migrated = 0;

    for (const type of types) {
      await prisma.appointmentType.create({
        data: {
          id: type.ID,
          code: type.Code,
          apptType: type.Appt_Type,
          description: type.Description,
          typeIdForRate: type.TypeIdForRate,
        },
      });
      migrated++;
      process.stdout.write(`\r   Progress: ${migrated}/${types.length}`);
    }

    console.log('\n\n✅ Migration complete!\n');

    // Verify in Supabase
    console.log('🔍 Verifying data in Supabase...');
    const supabaseTypes = await prisma.appointmentType.findMany({
      orderBy: { id: 'asc' },
      take: 3,
    });

    console.log('   First 3 records in Supabase:');
    supabaseTypes.forEach((type, idx) => {
      console.log(`   ${idx + 1}. ID: ${type.id}, Code: ${type.code}, Type: ${type.apptType}`);
    });

    const totalCount = await prisma.appointmentType.count();
    console.log(`\n📊 Total records in Supabase: ${totalCount}`);

    if (totalCount === types.length) {
      console.log('✅ SUCCESS: All records migrated correctly!');
    } else {
      console.log(`❌ ERROR: Expected ${types.length} but found ${totalCount}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Test migration successful!');
    console.log('   You can now run the full migration:');
    console.log('   npx tsx scripts/migrate-from-sqlserver.ts');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error: any) {
    console.error('\n❌ Test migration failed:');
    console.error('Error:', error.message);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
    }
    await prisma.$disconnect();
  }
}

testMigration().catch(console.error);
