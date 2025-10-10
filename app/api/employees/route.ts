import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Employee } from '@/lib/types';
import { employeesData } from '@/lib/data';
import { AUTH_COOKIE } from '@/lib/auth';

const DATA_FILE = path.join(process.cwd(), 'data', 'employees.json');

// Helper to ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Helper to read employees from file
async function readEmployees(): Promise<Employee[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    // If file doesn't exist, return default data
    return employeesData;
  }
}

// Helper to write employees to file
async function writeEmployees(employees: Employee[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(employees, null, 2));
}

// Helper to check authentication
function isAuthenticated(request: NextRequest): boolean {
  return !!request.cookies.get(AUTH_COOKIE);
}

// GET: Fetch all employees
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const employees = await readEmployees();
    return NextResponse.json(employees);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

// POST: Create a new employee
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const newEmployee: Omit<Employee, 'id'> = await request.json();

    // Validate required fields
    if (
      !newEmployee.firstName ||
      !newEmployee.lastName ||
      !newEmployee.email ||
      !newEmployee.salary ||
      !newEmployee.date
    ) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    const employees = await readEmployees();

    // Generate new ID (find max ID and add 1)
    const maxId = employees.length > 0
      ? Math.max(...employees.map(e => e.id))
      : 0;

    const employee: Employee = {
      ...newEmployee,
      id: maxId + 1,
    };

    employees.push(employee);
    await writeEmployees(employees);

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}
