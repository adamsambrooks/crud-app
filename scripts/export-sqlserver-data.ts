/**
 * SQL Server Data Export Script
 *
 * Exports data from SQL Server LocalDB to JSON files using BCP utility.
 * BCP is more reliable than sqlcmd for data export.
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

// Output directories
const EXPORT_DIR = path.join(__dirname, '..', 'data', 'exports');
const CSV_DIR = path.join(EXPORT_DIR, 'csv');

// Ensure export directories exist
[EXPORT_DIR, CSV_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log(`✓ Export directories ready\n`);

/**
 * Export table using sqlcmd with CSV output
 */
function exportTableToCsv(tableName: string, outputFile: string, columns: string[]): void {
  const csvPath = path.join(CSV_DIR, outputFile);
  const queryFile = path.join(CSV_DIR, `_${tableName}_query.sql`);

  // Create SQL query that outputs CSV format
  const query = `
SET NOCOUNT ON;
SELECT ${columns.map(c => `[${c}]`).join(', ')}
FROM [${tableName}]
ORDER BY ID;
  `.trim();

  // Write query to file
  fs.writeFileSync(queryFile, query, 'utf-8');

  console.log(`  Querying ${tableName}...`);

  try {
    // Use sqlcmd with output redirection to CSV file
    execSync(
      `sqlcmd -S "${SQL_SERVER}" -d "${SQL_DATABASE}" -E -i "${queryFile}" -o "${csvPath}" -s "," -W`,
      {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
      }
    );

    // Clean up query file
    fs.unlinkSync(queryFile);

    console.log(`  ✓ Exported to CSV: ${outputFile}`);
  } catch (error: any) {
    console.error(`  ✗ Failed: ${error.message}`);
    throw error;
  }
}

/**
 * Parse CSV to JSON
 */
function csvToJson(csvFile: string, columns: string[]): any[] {
  const csvPath = path.join(CSV_DIR, csvFile);
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n');

  const records: any[] = [];
  let dataStarted = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Skip header separator lines (dashes and spaces)
    if (trimmed.match(/^[-\s,]+$/)) continue;

    // Skip row count lines
    if (trimmed.includes('rows affected') || trimmed.includes('row affected')) continue;

    // Detect column header line (first line with commas after skipping separators)
    if (!dataStarted && trimmed.includes(',')) {
      // Check if this looks like a header (has column names from our list)
      const headerMatches = columns.some(col =>
        trimmed.toUpperCase().includes(col.toUpperCase().replace('_', ' '))
      );
      if (headerMatches) {
        dataStarted = false; // Skip this header line
        continue;
      }
      dataStarted = true;
    }

    if (!dataStarted) continue;

    // Parse data row
    const values = trimmed.split(',').map(v => v.trim());

    // Skip if wrong number of columns
    if (values.length !== columns.length) continue;

    const record: any = {};
    columns.forEach((col, index) => {
      const value = values[index];

      // Handle NULL/empty values
      if (value === 'NULL' || value === '' || value === 'null') {
        record[col] = null;
      }
      // Handle boolean values (looking at specific field names)
      else if (value === '1' || value === '0') {
        const colLower = col.toLowerCase();
        if (colLower.includes('active') || colLower === 'tx_plan' ||
            colLower === 'npp' || colLower === 'consent' ||
            colLower === 'flagged' || colLower === 'has_progress_note') {
          record[col] = value === '1';
        } else {
          record[col] = parseInt(value);
        }
      }
      // Handle numeric values
      else if (!isNaN(Number(value)) && value !== '') {
        record[col] = Number(value);
      }
      // String values
      else {
        record[col] = value;
      }
    });

    records.push(record);
  }

  return records;
}

/**
 * Export a table to JSON via CSV intermediary
 */
function exportTable(
  tableName: string,
  columns: string[],
  expectedRows?: number
): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Exporting ${tableName}`);
  console.log(`${'='.repeat(60)}`);

  const csvFile = `${tableName.toLowerCase()}.csv`;
  const jsonFile = `${tableName.toLowerCase()}.json`;

  // Export to CSV
  exportTableToCsv(tableName, csvFile, columns);

  // Convert CSV to JSON
  console.log(`  Converting to JSON...`);
  const records = csvToJson(csvFile, columns);

  // Write JSON file
  const jsonPath = path.join(EXPORT_DIR, jsonFile);
  fs.writeFileSync(jsonPath, JSON.stringify(records, null, 2), 'utf-8');

  console.log(`  ✓ Saved ${records.length} records to ${jsonFile}`);

  if (expectedRows && records.length !== expectedRows) {
    console.warn(`  ⚠ Warning: Expected ${expectedRows} rows, got ${records.length}`);
  }
}

/**
 * Main export process
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       SQL Server LocalDB to JSON Export Script            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nServer: ${SQL_SERVER}`);
  console.log(`Database: ${SQL_DATABASE}`);
  console.log(`Export Directory: ${EXPORT_DIR}`);
  console.log(`\nExcluding: Logs table (per user request)\n`);

  const startTime = Date.now();

  try {
    // 1. AppointmentType (30 rows)
    exportTable(
      'AppointmentType',
      ['ID', 'Code', 'Appt_Type', 'Description', 'TypeIdForRate'],
      30
    );

    // 2. Employee (83 rows)
    exportTable(
      'Employee',
      [
        'ID', 'Name', 'Email', 'Active', 'Start_Date', 'EmployeeSP_ID',
        'LastName', 'FirstName', 'PayType', 'GustoId'
      ],
      83
    );

    // 3. TimePeriod (444 rows)
    exportTable(
      'TimePeriod',
      ['ID', 'Year', 'PayPeriod', 'StartDate', 'EndDate'],
      444
    );

    // 4. Client (9,289 rows) - INCLUDES INVALID DATES TO CONVERT
    exportTable(
      'Client',
      [
        'ID', 'EmployeeID', 'Client_Name', 'TxPlan', 'NPP', 'Consent',
        'Loaded', 'Email', 'Created', 'Updated', 'Next_Appt', 'Active',
        'ClientSP_ID', 'HashedID', 'EmployeeSP_ID', 'Appt_TypeID', 'Type'
      ],
      9289
    );

    // 5. Rate (1,912 rows)
    exportTable(
      'Rate',
      [
        'ID', 'Rate', 'EmployeeID', 'Start_Date', 'Active', 'RateType',
        'End_Date', 'Appt_TypeID', 'GustoID'
      ],
      1912
    );

    // 6. Appointment (134,179 rows) - LARGEST TABLE
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Exporting Appointment (LARGE TABLE - may take 1-2 minutes)`);
    console.log(`${'='.repeat(60)}`);

    exportTable(
      'Appointment',
      [
        'ID', 'ClientID', 'EmployeeID', 'RateID', 'ApptSP_ID',
        'Appt_TypeID', 'Appt_Date', 'Units', 'Clinician_Amount',
        'Client_Payment_Status', 'Duration', 'HasProgressNote',
        'Created', 'Updated', 'Client_Charge', 'Flagged',
        'Client_Payment_Status_Desc', 'Vacation_Hours', 'Bonus',
        'Correction_Payment', 'Personal_Note', 'Reimbursement', 'Comments'
      ],
      134179
    );

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
    console.log(`✓ CSV files saved to: ${CSV_DIR}`);
    console.log(`\nNext step: Run 'npm run import-supabase' to load data into PostgreSQL`);

  } catch (error: any) {
    console.error('\n✗ Export failed');
    console.error(error.message);
    process.exit(1);
  }
}

main();
