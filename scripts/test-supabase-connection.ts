// Test Supabase database connection
// Run with: npx tsx scripts/test-supabase-connection.ts

import { PrismaClient } from '@prisma/client';

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');

  // Show connection string (masking password)
  const dbUrl = process.env.DATABASE_URL || '';
  const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
  console.log('📡 Connection string:', maskedUrl);
  console.log('');

  const prisma = new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

  try {
    console.log('⏳ Attempting to connect...');

    // Try a simple query
    await prisma.$queryRaw`SELECT version()`;

    console.log('✅ SUCCESS! Connected to Supabase PostgreSQL');
    console.log('');

    // Get database version
    const result = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version()`;
    console.log('📊 Database version:', result[0].version);
    console.log('');

    // List existing tables
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    console.log('📋 Existing tables in public schema:');
    if (tables.length === 0) {
      console.log('   (none - database is empty)');
    } else {
      tables.forEach(t => console.log(`   - ${t.tablename}`));
    }

  } catch (error: any) {
    console.log('❌ CONNECTION FAILED\n');
    console.error('Error details:', error.message);
    console.log('');

    if (error.message.includes('P1001')) {
      console.log('💡 Troubleshooting tips:');
      console.log('   1. Check if password is correct in .env file');
      console.log('   2. Verify your machine can reach Supabase (firewall/proxy)');
      console.log('   3. Try getting connection string from Supabase dashboard:');
      console.log('      Project Settings → Database → Connection String');
      console.log('   4. Supabase might require IPv6 - check network settings');
    } else if (error.message.includes('password')) {
      console.log('💡 Password authentication failed');
      console.log('   → Double-check your database password in .env');
      console.log('   → Get it from: Supabase Dashboard → Settings → Database');
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
