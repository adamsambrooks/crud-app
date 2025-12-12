/**
 * SQL Server Data Export Script (FOR JSON PATH)
 *
 * Exports data from SQL Server LocalDB to JSON files using SQL Server's FOR JSON PATH.
 * This is more reliable than CSV parsing and preserves all data accurately.
 *
 * Excludes Logs table per user request.
 *
 * Export order (respects dependencies):
 * 1. AppointmentType (30 rows) - No dependencies
 * 2. Employee (83 rows) - No dependencies
 * 3. TimePeriod (444 rows) - No dependencies
 * 4. Client (9,289 rows) - Depends on Employee, AppointmentType
 * 5. Rate (1,912 rows) - Depends on Employee, AppointmentType
 * 6. Appointment (134,179 rows) - Depends on Client, Employee, Rate, AppointmentType
 *
 * Total: 145,897 records
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// SQL Server connection details
const SQL_SERVER = '(localdb)\\MSSQLLocalDB';
const SQL_DATABASE = 'DEV';

// Output directory
const EXPORT_DIR = path.join(__dirname, '..', 'data', 'exports');

// Ensure export directory exists
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

console.log(`✓ Export directory ready: ${EXPORT_DIR}\n`);

/**
 * Export table using FOR JSON PATH
 */
function exportTableToJson(tableName: string, outputFile: string, expectedRows?: number): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Exporting ${tableName}`);
  console.log(`${'='.repeat(60)}`);

  const outputPath = path.join(EXPORT_DIR, outputFile);

  console.log(`  Querying ${tableName}...`);

  try {
    // Use SQL Server's FOR JSON PATH to export directly to JSON
    const query = `SET NOCOUNT ON; SELECT * FROM [${tableName}] ORDER BY ID FOR JSON PATH`;

    // Execute query and save output
    execSync(
      `sqlcmd -S "${SQL_SERVER}" -d "${SQL_DATABASE}" -E -Q "${query}" -o "${outputPath}" -h -1 -W`,
      {
        encoding: 'utf-8',
        maxBuffer: 100 * 1024 * 1024, // 100MB buffer for large datasets
      }
    );

    // Read the file and clean up - sqlcmd may insert line breaks
    let content = fs.readFileSync(outputPath, 'utf-8');

    // Remove any leading/trailing whitespace and join lines
    content = content.trim().replace(/\r?\n/g, '');

    // Parse JSON
    const json = JSON.parse(content);
    const recordCount = Array.isArray(json) ? json.length : 0;

    console.log(`  ✓ Exported ${recordCount} records to ${outputFile}`);

    if (expectedRows && recordCount !== expectedRows) {
      console.warn(`  ⚠ Warning: Expected ${expectedRows} rows, got ${recordCount}`);
    }

    // Pretty-print the JSON for readability
    fs.writeFileSync(outputPath, JSON.stringify(json, null, 2), 'utf-8');
    console.log(`  ✓ Formatted JSON written`);

  } catch (error: any) {
    console.error(`  ✗ Failed: ${error.message}`);
    throw error;
  }
}

/**
 * Main export process
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       SQL Server LocalDB to JSON Export Script            ║');
  console.log('║              (Using FOR JSON PATH)                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nServer: ${SQL_SERVER}`);
  console.log(`Database: ${SQL_DATABASE}`);
  console.log(`Export Directory: ${EXPORT_DIR}`);
  console.log(`\nExcluding: Logs table (per user request)\n`);

  const startTime = Date.now();

  try {
    // 1. AppointmentType (30 rows)
    exportTableToJson('AppointmentType', 'appointmenttype.json', 30);

    // 2. Employee (83 rows)
    exportTableToJson('Employee', 'employee.json', 83);

    // 3. TimePeriod (444 rows)
    exportTableToJson('TimePeriod', 'timeperiod.json', 444);

    // 4. Client (9,289 rows) - INCLUDES INVALID DATES TO CONVERT
    exportTableToJson('Client', 'client.json', 9289);

    // 5. Rate (1,912 rows)
    exportTableToJson('Rate', 'rate.json', 1912);

    // 6. Appointment (134,179 rows) - LARGEST TABLE
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Exporting Appointment (LARGE TABLE - may take 1-2 minutes)`);
    console.log(`${'='.repeat(60)}`);
    exportTableToJson('Appointment', 'appointment.json', 134179);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Export Complete!                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\nTotal time: ${duration} seconds`);
    console.log(`\nExported files:`);
    console.log(`  1. appointmenttype.json (30 records)`);
    console.log(`  2. employee.json (83 records)`);
    console.log(`  3. timeperiod.json (444 records)`);
    console.log(`  4. client.json (9,289 records) ⚠ Contains invalid dates`);
    console.log(`  5. rate.json (1,912 records)`);
    console.log(`  6. appointment.json (134,179 records)`);
    console.log(`\nTotal: 145,897 records`);
    console.log(`\n✓ All JSON files saved to: ${EXPORT_DIR}`);
    console.log(`\nNext step: Run 'npm run import-supabase' to load data into PostgreSQL`);

  } catch (error: any) {
    console.error('\n✗ Export failed');
    console.error(error.message);
    process.exit(1);
  }
}

main();
