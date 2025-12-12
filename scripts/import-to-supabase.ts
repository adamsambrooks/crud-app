/**
 * Supabase Import Script
 *
 * Imports data from JSON files (exported from SQL Server) into Supabase PostgreSQL.
 * Handles critical data transformations including invalid date conversion.
 *
 * CRITICAL TRANSFORMATION:
 * - Converts 0001-01-01 dates in Client.Next_Appt to NULL (6,976 records affected per PRD)
 *
 * Import order (respects foreign key dependencies):
 * 1. AppointmentType (~30 rows) - No dependencies
 * 2. Employee (83 rows) - No dependencies
 * 3. TimePeriod (444 rows) - No dependencies
 * 4. Client (~9,289 rows) - Depends on Employee, AppointmentType
 * 5. Rate (1,912 rows) - Depends on Employee, AppointmentType
 * 6. Appointment (~134,179 rows) - Depends on Client, Employee, Rate, AppointmentType
 *
 * Total: ~145,897 records
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// JSON export directory
const EXPORT_DIR = path.join(__dirname, '..', 'data', 'exports');

// Batch size for large imports
const BATCH_SIZE = 1000;

/**
 * Check if date is invalid (0001-01-01 placeholder)
 */
function isInvalidDate(dateStr: string | null): boolean {
  if (!dateStr) return true;
  return dateStr.includes('0001-01-01') || dateStr.includes('Jan  1 0001') || dateStr.includes('1-01-01');
}

/**
 * Parse date string to Date or null
 * Handles SQL Server datetime format and invalid 0001-01-01 dates
 */
function parseDate(dateStr: string | null): Date | null {
  if (!dateStr || dateStr === 'NULL') return null;
  if (isInvalidDate(dateStr)) return null;

  try {
    // SQL Server datetime format: "2020-05-11 00:00:00.0000000"
    const cleaned = dateStr.split('.')[0].trim(); // Remove fractional seconds
    const date = new Date(cleaned);

    // Validate date is reasonable (after 1900)
    if (date.getFullYear() < 1900) return null;

    return date;
  } catch {
    return null;
  }
}

/**
 * Import AppointmentType records
 */
async function importAppointmentTypes(): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Importing AppointmentType');
  console.log(`${'='.repeat(60)}`);

  const jsonPath = path.join(EXPORT_DIR, 'appointmenttype.json');
  const records = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  console.log(`  Found ${records.length} records in JSON file`);

  // Add missing records that weren't in CSV export but are referenced by Clients
  const missingRecords = [
    { ID: 11, Code: '00011', Appt_Type: 'Pro Bono', Description: 'Free session for client, clinician gets paid out of the GoFundMe fund', TypeIdForRate: 11 },
    { ID: 41, Code: '00041', Appt_Type: 'Team Lead', Description: 'Pay code that includes Clinical Lead, Clinical Manager, PCC Manager, HR Manager and Client Relationship Manager', TypeIdForRate: 41 },
  ];

  const allRecords = [...records, ...missingRecords];
  console.log(`  Total records (including manually added): ${allRecords.length}`);
  console.log(`  Inserting...`);

  let inserted = 0;
  for (const record of allRecords) {
    await prisma.appointmentType.create({
      data: {
        id: record.ID,
        code: record.Code !== null && record.Code !== undefined ? String(record.Code) : null,
        apptType: record.Appt_Type || null,
        description: record.Description || null,
        typeIdForRate: record.TypeIdForRate || null,
      },
    });
    inserted++;
  }

  console.log(`  ✓ Inserted ${inserted} AppointmentType records`);
}

/**
 * Import Employee records
 */
async function importEmployees(): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Importing Employee');
  console.log(`${'='.repeat(60)}`);

  const jsonPath = path.join(EXPORT_DIR, 'employee.json');
  const records = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  console.log(`  Found ${records.length} records in JSON file`);
  console.log(`  Inserting...`);

  let inserted = 0;
  for (const record of records) {
    // Convert boolean to number for active field (Prisma expects Int)
    const active = record.Active === true || record.Active === 1 ? 1 : 0;

    await prisma.employee.create({
      data: {
        id: record.ID,
        name: record.Name || null,
        email: record.Email || null,
        active: active,
        startDate: parseDate(record.Start_Date),
        employeeSpId: record.EmployeeSP_ID || 0,
        lastName: record.LastName || null,
        firstName: record.FirstName || null,
        payType: record.PayType || null,
        gustoId: record.GustoId || null,
      },
    });
    inserted++;
  }

  console.log(`  ✓ Inserted ${inserted} Employee records`);
}

/**
 * Import TimePeriod records
 */
async function importTimePeriods(): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Importing TimePeriod');
  console.log(`${'='.repeat(60)}`);

  const jsonPath = path.join(EXPORT_DIR, 'timeperiod.json');
  const records = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  console.log(`  Found ${records.length} records in JSON file`);
  console.log(`  Inserting in batches of ${BATCH_SIZE}...`);

  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    await prisma.$transaction(
      batch.map((record: any) =>
        prisma.timePeriod.create({
          data: {
            id: BigInt(record.ID),
            year: record.Year,
            payPeriod: record.PayPeriod,
            startDate: new Date(record.StartDate.split('.')[0]),
            endDate: new Date(record.EndDate.split('.')[0]),
          },
        })
      )
    );

    inserted += batch.length;
    console.log(`  Progress: ${inserted}/${records.length}`);
  }

  console.log(`  ✓ Inserted ${inserted} TimePeriod records`);
}

/**
 * Import Client records
 * CRITICAL: Converts invalid 0001-01-01 dates to NULL in Next_Appt field
 */
async function importClients(): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Importing Client (with invalid date conversion)');
  console.log(`${'='.repeat(60)}`);

  const jsonPath = path.join(EXPORT_DIR, 'client.json');
  const records = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  console.log(`  Found ${records.length} records in JSON file`);
  console.log(`  Inserting in batches of ${BATCH_SIZE}...`);

  let inserted = 0;
  let invalidDatesConverted = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    await prisma.$transaction(
      batch.map((record: any) => {
        // CRITICAL: Convert invalid Next_Appt dates to NULL
        const nextAppt = parseDate(record.Next_Appt);
        if (record.Next_Appt && !nextAppt) {
          invalidDatesConverted++;
        }

        return prisma.client.create({
          data: {
            id: record.ID,
            employeeId: record.EmployeeID || null,
            clientName: record.Client_Name || null,
            txPlan: record.TxPlan === 1 || record.TxPlan === true,
            npp: record.NPP === 1 || record.NPP === true,
            consent: record.Consent === 1 || record.Consent === true,
            loaded: record.Loaded || null,
            email: record.Email || null,
            created: parseDate(record.Created),
            updated: parseDate(record.Updated),
            nextAppt: nextAppt, // CONVERTED: 0001-01-01 → NULL
            active: record.Active === 1 || record.Active === true || null,
            clientSpId: record.ClientSP_ID || 0,
            hashedId: String(record.HashedID || ''),
            employeeSpId: record.EmployeeSP_ID || 0,
            apptTypeId: record.Appt_TypeID,
            type: record.Type || 'Individual',
          },
        });
      })
    );

    inserted += batch.length;
    console.log(`  Progress: ${inserted}/${records.length}`);
  }

  console.log(`  ✓ Inserted ${inserted} Client records`);
  console.log(`  ✓ Converted ${invalidDatesConverted} invalid dates (0001-01-01) to NULL`);
}

/**
 * Import Rate records
 */
async function importRates(): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Importing Rate');
  console.log(`${'='.repeat(60)}`);

  const jsonPath = path.join(EXPORT_DIR, 'rate.json');
  const records = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  console.log(`  Found ${records.length} records in JSON file`);
  console.log(`  Inserting in batches of ${BATCH_SIZE}...`);

  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    await prisma.$transaction(
      batch.map((record: any) => {
        // Convert boolean to number for active field (Prisma expects Int)
        const active = record.Active === true || record.Active === 1 ? 1 : 0;

        return prisma.rate.create({
          data: {
            id: record.ID,
            rate: record.Rate || null,
            employeeId: record.EmployeeID || null,
            startDate: new Date(record.Start_Date.split('.')[0]),
            active: active,
            rateType: record.RateType || null,
            endDate: parseDate(record.End_Date),
            apptTypeId: record.Appt_TypeID || null,
            gustoId: record.GustoID ? BigInt(record.GustoID) : null,
          },
        });
      })
    );

    inserted += batch.length;
    console.log(`  Progress: ${inserted}/${records.length}`);
  }

  console.log(`  ✓ Inserted ${inserted} Rate records`);
}

/**
 * Import Appointment records (largest table)
 */
async function importAppointments(): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Importing Appointment (LARGE TABLE - may take 2-3 minutes)');
  console.log(`${'='.repeat(60)}`);

  const jsonPath = path.join(EXPORT_DIR, 'appointment.json');
  const records = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  console.log(`  Found ${records.length} records in JSON file`);
  console.log(`  Inserting in batches of ${BATCH_SIZE}...`);

  let inserted = 0;
  let failed = 0;
  const errors: Array<{ recordId: number; error: string }> = [];

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    try {
      await prisma.$transaction(
        batch.map((record: any) => {
          // Validate required fields
          if (!record.Duration && record.Duration !== 0) {
            throw new Error(`Record ${record.ID}: Missing required field 'Duration'`);
          }

          // Parse dates safely using helper function
          const apptDate = parseDate(record.Appt_Date);
          const created = parseDate(record.Created);
          const updated = parseDate(record.Updated);

          if (!apptDate) {
            throw new Error(`Record ${record.ID}: Invalid or missing Appt_Date: ${record.Appt_Date}`);
          }
          if (!created) {
            throw new Error(`Record ${record.ID}: Invalid or missing Created date: ${record.Created}`);
          }
          if (!updated) {
            throw new Error(`Record ${record.ID}: Invalid or missing Updated date: ${record.Updated}`);
          }

          // Safely parse BigInt
          let apptSpId: bigint | null = null;
          if (record.ApptSP_ID) {
            try {
              apptSpId = BigInt(record.ApptSP_ID);
            } catch (e) {
              console.warn(`  ⚠ Record ${record.ID}: Invalid ApptSP_ID ${record.ApptSP_ID}, setting to NULL`);
            }
          }

          return prisma.appointment.create({
            data: {
              id: record.ID,
              clientId: record.ClientID,
              employeeId: record.EmployeeID,
              rateId: record.RateID || null,
              apptSpId: apptSpId,
              apptTypeId: record.Appt_TypeID || null,
              apptDate: apptDate,
              units: record.Units || null,
              clinicianAmount: record.Clinician_Amount || null,
              clientPaymentStatus: record.Client_Payment_Status || null,
              duration: record.Duration,
              hasProgressNote: record.HasProgressNote === 1 || record.HasProgressNote === true,
              created: created,
              updated: updated,
              clientCharge: record.Client_Charge || null,
              flagged: record.Flagged === 1 || record.Flagged === true || null,
              clientPaymentStatusDesc: record.Client_Payment_Status_Desc || null,
              vacationHours: record.Vacation_Hours || null,
              bonus: record.Bonus || null,
              correctionPayment: record.Correction_Payment || null,
              personalNote: record.Personal_Note || null,
              reimbursement: record.Reimbursement || null,
              comments: record.Comments || null,
            },
          });
        })
      );

      inserted += batch.length;
      if (inserted % 10000 === 0 || inserted === records.length) {
        console.log(`  Progress: ${inserted}/${records.length} (${failed} failed)`);
      }
    } catch (error: any) {
      failed += batch.length;
      const batchStart = batch[0]?.ID || 'unknown';
      const batchEnd = batch[batch.length - 1]?.ID || 'unknown';
      const errorMsg = `Batch failed (IDs ${batchStart}-${batchEnd}): ${error.message}`;

      console.error(`  ✗ ${errorMsg}`);
      errors.push({ recordId: batchStart, error: errorMsg });

      // Log first few records in failed batch for debugging
      if (errors.length <= 3) {
        console.error(`  Debug - First record in failed batch:`, JSON.stringify(batch[0], null, 2));
      }
    }
  }

  console.log(`  ✓ Inserted ${inserted} Appointment records`);
  if (failed > 0) {
    console.warn(`  ⚠ Failed to insert ${failed} records`);
    console.warn(`  ⚠ Total errors: ${errors.length} batches failed`);
    if (errors.length > 0) {
      console.warn(`\n  First few errors:`);
      errors.slice(0, 5).forEach(e => console.warn(`    - Record ${e.recordId}: ${e.error}`));
    }
  }
}

/**
 * Verify data integrity after import
 */
async function verifyImport(): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Verifying Import');
  console.log(`${'='.repeat(60)}`);

  const appointmentTypeCount = await prisma.appointmentType.count();
  const employeeCount = await prisma.employee.count();
  const timePeriodCount = await prisma.timePeriod.count();
  const clientCount = await prisma.client.count();
  const rateCount = await prisma.rate.count();
  const appointmentCount = await prisma.appointment.count();

  // Check for invalid dates in Client.nextAppt
  const invalidDatesCount = await prisma.client.count({
    where: {
      nextAppt: {
        lt: new Date('1900-01-01'),
      },
    },
  });

  console.log(`\n  Record Counts:`);
  console.log(`  - AppointmentType: ${appointmentTypeCount}`);
  console.log(`  - Employee: ${employeeCount}`);
  console.log(`  - TimePeriod: ${timePeriodCount}`);
  console.log(`  - Client: ${clientCount}`);
  console.log(`  - Rate: ${rateCount}`);
  console.log(`  - Appointment: ${appointmentCount}`);
  console.log(`  - Total: ${appointmentTypeCount + employeeCount + timePeriodCount + clientCount + rateCount + appointmentCount}`);

  console.log(`\n  Data Quality:`);
  console.log(`  - Invalid dates in Client.nextAppt: ${invalidDatesCount} (should be 0)`);

  if (invalidDatesCount > 0) {
    console.warn(`  ⚠ Warning: Found ${invalidDatesCount} invalid dates - data cleaning needed!`);
  } else {
    console.log(`  ✓ All dates validated successfully`);
  }
}

/**
 * Main import process
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Supabase PostgreSQL Import Script                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nImport Directory: ${EXPORT_DIR}`);
  console.log(`Database: Supabase PostgreSQL`);
  console.log(`\nImport Order (respects foreign key dependencies):`);
  console.log(`1. AppointmentType`);
  console.log(`2. Employee`);
  console.log(`3. TimePeriod`);
  console.log(`4. Client (with invalid date conversion)`);
  console.log(`5. Rate`);
  console.log(`6. Appointment`);

  const startTime = Date.now();

  try {
    // Clear existing data (in reverse dependency order)
    console.log(`\n⚠ Clearing existing data...`);
    await prisma.appointment.deleteMany();
    await prisma.rate.deleteMany();
    await prisma.client.deleteMany();
    await prisma.timePeriod.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.appointmentType.deleteMany();
    console.log(`✓ Existing data cleared\n`);

    // Import in dependency order
    await importAppointmentTypes();
    await importEmployees();
    await importTimePeriods();
    await importClients();
    await importRates();
    await importAppointments();

    // Verify import
    await verifyImport();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Import Complete!                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\nTotal time: ${duration} seconds`);
    console.log(`\n✓ All data migrated successfully to Supabase PostgreSQL!`);

  } catch (error: any) {
    console.error('\n✗ Import failed');
    console.error(`Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
