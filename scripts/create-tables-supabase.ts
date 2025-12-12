// Create tables in Supabase using raw SQL
// This bypasses Prisma's introspection issues with existing Supabase auth tables

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTables() {
  console.log('🚀 Creating tables in Supabase...\n');

  try {
    // Create AppointmentType table
    console.log('📋 Creating appointment_types table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS appointment_types (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50),
        appt_type VARCHAR(100),
        description TEXT,
        type_id_for_rate INTEGER
      );
    `);
    console.log('✅ appointment_types created\n');

    // Create TimePeriod table
    console.log('📋 Creating time_periods table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS time_periods (
        id BIGSERIAL PRIMARY KEY,
        year INTEGER NOT NULL,
        pay_period INTEGER NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL
      );
    `);
    console.log('✅ time_periods created\n');

    // Create Log table
    console.log('📋 Creating logs table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS logs (
        id BIGSERIAL PRIMARY KEY,
        log_time TIMESTAMP NOT NULL,
        type VARCHAR(100) NOT NULL,
        description TEXT NOT NULL
      );
    `);
    console.log('✅ logs created\n');

    // Create Employee table
    console.log('📋 Creating employees table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        active SMALLINT,
        start_date DATE,
        employee_sp_id INTEGER DEFAULT 0 NOT NULL,
        last_name VARCHAR(255),
        first_name VARCHAR(255),
        pay_type VARCHAR(100),
        gusto_id VARCHAR(100)
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_employees_last_name ON employees(last_name);`);
    console.log('✅ employees created with indexes\n');

    // Create Client table
    console.log('📋 Creating clients table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE RESTRICT,
        client_name VARCHAR(255),
        tx_plan BOOLEAN,
        npp BOOLEAN,
        consent BOOLEAN,
        loaded VARCHAR(255),
        email VARCHAR(255),
        created TIMESTAMP,
        updated TIMESTAMP,
        next_appt DATE,
        active BOOLEAN,
        client_sp_id INTEGER DEFAULT 0 NOT NULL,
        hashed_id VARCHAR(50) DEFAULT '' NOT NULL,
        employee_sp_id INTEGER DEFAULT 0,
        appt_type_id INTEGER NOT NULL REFERENCES appointment_types(id) ON DELETE RESTRICT,
        type VARCHAR(100) DEFAULT 'Individual'
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_clients_employee_id ON clients(employee_id);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_clients_appt_type_id ON clients(appt_type_id);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_clients_client_name ON clients(client_name);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);`);
    console.log('✅ clients created with indexes\n');

    // Create Rate table
    console.log('📋 Creating rates table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS rates (
        id SERIAL PRIMARY KEY,
        rate DOUBLE PRECISION,
        employee_id INTEGER REFERENCES employees(id) ON DELETE RESTRICT,
        start_date DATE NOT NULL,
        active SMALLINT,
        rate_type VARCHAR(255),
        end_date DATE,
        appt_type_id INTEGER REFERENCES appointment_types(id) ON DELETE RESTRICT,
        gusto_id BIGINT
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_rates_employee_id ON rates(employee_id);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_rates_appt_type_id ON rates(appt_type_id);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_rates_start_date ON rates(start_date);`);
    console.log('✅ rates created with indexes\n');

    // Create Appointment table
    console.log('📋 Creating appointments table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
        rate_id INTEGER REFERENCES rates(id) ON DELETE RESTRICT,
        appt_sp_id BIGINT,
        appt_type_id INTEGER REFERENCES appointment_types(id) ON DELETE RESTRICT,
        appt_date TIMESTAMP NOT NULL,
        units DOUBLE PRECISION,
        clinician_amount DOUBLE PRECISION,
        client_payment_status VARCHAR(255),
        duration DOUBLE PRECISION NOT NULL,
        has_progress_note BOOLEAN NOT NULL,
        created TIMESTAMP NOT NULL,
        updated TIMESTAMP NOT NULL,
        client_charge DOUBLE PRECISION,
        flagged BOOLEAN,
        client_payment_status_desc VARCHAR(255),
        vacation_hours DOUBLE PRECISION,
        bonus DOUBLE PRECISION,
        correction_payment DOUBLE PRECISION,
        personal_note VARCHAR(255),
        reimbursement DOUBLE PRECISION,
        comments VARCHAR(255)
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_appointments_multi ON appointments(client_id, employee_id, appt_type_id, appt_date);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_appointments_employee_date ON appointments(employee_id, appt_date);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appt_date);`);
    console.log('✅ appointments created with indexes\n');

    console.log('🎉 All tables created successfully!');
    console.log('\n📊 Verifying tables...');

    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    console.log('\n✅ Tables in database:');
    tables.forEach(t => console.log(`   - ${t.tablename}`));

  } catch (error: any) {
    console.error('\n❌ Error creating tables:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTables();
