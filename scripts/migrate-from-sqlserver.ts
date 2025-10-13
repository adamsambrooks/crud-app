// Migration Script: SQL Server LocalDB → Supabase PostgreSQL
// Migrates 6 tables (excluding Logs): AppointmentType, Employee, TimePeriod, Client, Rate, Appointment
// Handles invalid date conversion: 0001-01-01 → NULL in Client.Next_Appt
// Run with: npx tsx scripts/migrate-from-sqlserver.ts

// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import sql from 'mssql';

const prisma = new PrismaClient();

// SQL Server LocalDB connection config
// For LocalDB, use named pipe connection
const sqlConfig: sql.config = {
  server: 'np:\\\\.\\pipe\\LOCALDB#DFD37587\\tsql\\query', // Named pipe from sqllocaldb info
  database: 'DEV',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    instanceName: 'MSSQLLocalDB',
    connectTimeout: 30000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Track migration statistics
const stats = {
  appointmentTypes: 0,
  employees: 0,
  timePeriods: 0,
  clients: 0,
  clientDatesConverted: 0,
  rates: 0,
  appointments: 0,
  errors: [] as string[],
};

// Helper: Format date for PostgreSQL
function formatDate(date: any): Date | null {
  if (!date) return null;

  // Check for invalid 0001-01-01 date
  const dateStr = date.toString();
  if (dateStr.includes('0001-01-01') || dateStr.includes('Jan 01 0001')) {
    return null; // Convert invalid placeholder to NULL
  }

  return new Date(date);
}

// Helper: Format datetime for PostgreSQL
function formatDateTime(date: any): Date | null {
  if (!date) return null;
  return new Date(date);
}

// 1. Migrate AppointmentType (30 rows - no dependencies)
async function migrateAppointmentTypes(pool: sql.ConnectionPool) {
  console.log('\n📋 Step 1: Migrating AppointmentType...');

  const result = await pool.request().query('SELECT * FROM AppointmentType ORDER BY ID');
  const types = result.recordset;

  console.log(`   Found ${types.length} appointment types`);

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
    stats.appointmentTypes++;
  }

  console.log(`   ✅ Migrated ${stats.appointmentTypes} appointment types`);
}

// 2. Migrate Employee (83 rows - no dependencies)
async function migrateEmployees(pool: sql.ConnectionPool) {
  console.log('\n👤 Step 2: Migrating Employee...');

  const result = await pool.request().query('SELECT * FROM Employee ORDER BY ID');
  const employees = result.recordset;

  console.log(`   Found ${employees.length} employees`);

  for (const emp of employees) {
    await prisma.employee.create({
      data: {
        id: emp.ID,
        name: emp.Name,
        email: emp.Email,
        active: emp.Active,
        startDate: formatDate(emp.Start_Date),
        employeeSpId: emp.EmployeeSP_ID || 0,
        lastName: emp.LastName,
        firstName: emp.FirstName,
        payType: emp.PayType,
        gustoId: emp.GustoId,
      },
    });
    stats.employees++;
  }

  console.log(`   ✅ Migrated ${stats.employees} employees`);
}

// 3. Migrate TimePeriod (444 rows - no dependencies)
async function migrateTimePeriods(pool: sql.ConnectionPool) {
  console.log('\n📅 Step 3: Migrating TimePeriod...');

  const result = await pool.request().query('SELECT * FROM TimePeriod ORDER BY ID');
  const periods = result.recordset;

  console.log(`   Found ${periods.length} time periods`);

  for (const period of periods) {
    await prisma.timePeriod.create({
      data: {
        id: BigInt(period.ID),
        year: period.Year,
        payPeriod: period.PayPeriod,
        startDate: formatDateTime(period.StartDate)!,
        endDate: formatDateTime(period.EndDate)!,
      },
    });
    stats.timePeriods++;
  }

  console.log(`   ✅ Migrated ${stats.timePeriods} time periods`);
}

// 4. Migrate Client (9,289 rows - depends on Employee, AppointmentType)
async function migrateClients(pool: sql.ConnectionPool) {
  console.log('\n🏥 Step 4: Migrating Client...');

  const result = await pool.request().query('SELECT * FROM Client ORDER BY ID');
  const clients = result.recordset;

  console.log(`   Found ${clients.length} clients`);
  console.log(`   Processing in batches of 1000...`);

  const batchSize = 1000;
  let processed = 0;

  for (let i = 0; i < clients.length; i += batchSize) {
    const batch = clients.slice(i, i + batchSize);

    for (const client of batch) {
      // Handle invalid Next_Appt dates (0001-01-01 → NULL)
      const nextAppt = formatDate(client.Next_Appt);
      if (client.Next_Appt && !nextAppt) {
        stats.clientDatesConverted++;
      }

      await prisma.client.create({
        data: {
          id: client.ID,
          employeeId: client.EmployeeID,
          clientName: client.Client_Name,
          txPlan: client.TxPlan,
          npp: client.NPP,
          consent: client.Consent,
          loaded: client.Loaded,
          email: client.Email,
          created: formatDateTime(client.Created),
          updated: formatDateTime(client.Updated),
          nextAppt: nextAppt, // Converts 0001-01-01 to NULL
          active: client.Active,
          clientSpId: client.ClientSP_ID || 0,
          hashedId: client.HashedID || '',
          employeeSpId: client.EmployeeSP_ID,
          apptTypeId: client.Appt_TypeID,
          type: client.Type || 'Individual',
        },
      });
      stats.clients++;
    }

    processed += batch.length;
    console.log(`   Progress: ${processed}/${clients.length} (${Math.round(processed/clients.length*100)}%)`);
  }

  console.log(`   ✅ Migrated ${stats.clients} clients`);
  console.log(`   📊 Converted ${stats.clientDatesConverted} invalid dates (0001-01-01 → NULL)`);
}

// 5. Migrate Rate (1,912 rows - depends on Employee, AppointmentType)
async function migrateRates(pool: sql.ConnectionPool) {
  console.log('\n💰 Step 5: Migrating Rate...');

  const result = await pool.request().query('SELECT * FROM Rate ORDER BY ID');
  const rates = result.recordset;

  console.log(`   Found ${rates.length} rates`);
  console.log(`   Processing in batches of 1000...`);

  const batchSize = 1000;
  let processed = 0;

  for (let i = 0; i < rates.length; i += batchSize) {
    const batch = rates.slice(i, i + batchSize);

    for (const rate of batch) {
      await prisma.rate.create({
        data: {
          id: rate.ID,
          rate: rate.Rate,
          employeeId: rate.EmployeeID,
          startDate: formatDate(rate.Start_Date)!,
          active: rate.Active,
          rateType: rate.RateType,
          endDate: formatDate(rate.End_Date),
          apptTypeId: rate.Appt_TypeID,
          gustoId: rate.GustoID ? BigInt(rate.GustoID) : null,
        },
      });
      stats.rates++;
    }

    processed += batch.length;
    console.log(`   Progress: ${processed}/${rates.length} (${Math.round(processed/rates.length*100)}%)`);
  }

  console.log(`   ✅ Migrated ${stats.rates} rates`);
}

// 6. Migrate Appointment (134,179 rows - depends on ALL tables)
async function migrateAppointments(pool: sql.ConnectionPool) {
  console.log('\n📆 Step 6: Migrating Appointment...');

  const result = await pool.request().query('SELECT * FROM Appointment ORDER BY ID');
  const appointments = result.recordset;

  console.log(`   Found ${appointments.length} appointments`);
  console.log(`   Processing in batches of 1000...`);
  console.log(`   ⏱️  This will take approximately 45-60 minutes...`);

  const batchSize = 1000;
  let processed = 0;
  const startTime = Date.now();

  for (let i = 0; i < appointments.length; i += batchSize) {
    const batch = appointments.slice(i, i + batchSize);

    for (const appt of batch) {
      try {
        await prisma.appointment.create({
          data: {
            id: appt.ID,
            clientId: appt.ClientID,
            employeeId: appt.EmployeeID,
            rateId: appt.RateID,
            apptSpId: appt.ApptSP_ID ? BigInt(appt.ApptSP_ID) : null,
            apptTypeId: appt.Appt_TypeID,
            apptDate: formatDateTime(appt.Appt_Date)!,
            units: appt.Units,
            clinicianAmount: appt.Clinician_Amount,
            clientPaymentStatus: appt.Client_Payment_Status,
            duration: appt.Duration,
            hasProgressNote: appt.HasProgressNote,
            created: formatDateTime(appt.Created)!,
            updated: formatDateTime(appt.Updated)!,
            clientCharge: appt.Client_Charge,
            flagged: appt.Flagged,
            clientPaymentStatusDesc: appt.Client_Payment_Status_Desc,
            vacationHours: appt.Vacation_Hours,
            bonus: appt.Bonus,
            correctionPayment: appt.Correction_Payment,
            personalNote: appt.Personal_Note,
            reimbursement: appt.Reimbursement,
            comments: appt.Comments,
          },
        });
        stats.appointments++;
      } catch (error: any) {
        stats.errors.push(`Appointment ID ${appt.ID}: ${error.message}`);
      }
    }

    processed += batch.length;
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = processed / elapsed;
    const remaining = (appointments.length - processed) / rate;

    console.log(`   Progress: ${processed}/${appointments.length} (${Math.round(processed/appointments.length*100)}%) - ETA: ${Math.round(remaining/60)} minutes`);
  }

  console.log(`   ✅ Migrated ${stats.appointments} appointments`);
  if (stats.errors.length > 0) {
    console.log(`   ⚠️  ${stats.errors.length} errors occurred`);
  }
}

// Main migration function
async function migrate() {
  console.log('🚀 Starting Migration: SQL Server LocalDB → Supabase PostgreSQL');
  console.log('📊 Migrating 6 tables (Logs excluded)');
  console.log('⏱️  Estimated time: 1.5-2 hours\n');

  const startTime = Date.now();
  let pool: sql.ConnectionPool | null = null;

  try {
    // Connect to SQL Server
    console.log('🔌 Connecting to SQL Server LocalDB...');
    pool = await sql.connect(sqlConfig);
    console.log('✅ Connected to SQL Server\n');

    console.log('🔌 Connecting to Supabase...');
    await prisma.$connect();
    console.log('✅ Connected to Supabase\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 STARTING DATA MIGRATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Migrate in dependency order
    await migrateAppointmentTypes(pool);
    await migrateEmployees(pool);
    await migrateTimePeriods(pool);
    await migrateClients(pool);
    await migrateRates(pool);
    await migrateAppointments(pool);

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ MIGRATION COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 Migration Summary:');
    console.log(`   AppointmentType: ${stats.appointmentTypes} records`);
    console.log(`   Employee:        ${stats.employees} records`);
    console.log(`   TimePeriod:      ${stats.timePeriods} records`);
    console.log(`   Client:          ${stats.clients} records`);
    console.log(`     └─ Invalid dates converted: ${stats.clientDatesConverted}`);
    console.log(`   Rate:            ${stats.rates} records`);
    console.log(`   Appointment:     ${stats.appointments} records`);
    console.log(`   ─────────────────────────────────`);
    console.log(`   TOTAL:           ${stats.appointmentTypes + stats.employees + stats.timePeriods + stats.clients + stats.rates + stats.appointments} records`);
    console.log(`\n⏱️  Total time: ${elapsed} minutes`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${stats.errors.length}`);
      console.log('   First 10 errors:');
      stats.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
    }

    console.log('\n🎉 Migration successful! Run verify-migration.ts to validate data.');

  } catch (error: any) {
    console.error('\n❌ MIGRATION FAILED');
    console.error('Error:', error.message);
    console.error('\nPartial migration completed:');
    console.error(`   AppointmentType: ${stats.appointmentTypes}`);
    console.error(`   Employee: ${stats.employees}`);
    console.error(`   TimePeriod: ${stats.timePeriods}`);
    console.error(`   Client: ${stats.clients}`);
    console.error(`   Rate: ${stats.rates}`);
    console.error(`   Appointment: ${stats.appointments}`);

    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 SQL Server connection closed');
    }
    await prisma.$disconnect();
    console.log('🔌 Supabase connection closed');
  }
}

// Run migration
migrate().catch(console.error);
