import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Employee } from '@/lib/types';
import { employeesData } from '@/lib/data';
import { AUTH_COOKIE } from '@/lib/auth';

const DATA_FILE = path.join(process.cwd(), 'data', 'employees.json');

async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

async function readEmployees(): Promise<Employee[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return employeesData;
  }
}

async function writeEmployees(employees: Employee[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(employees, null, 2));
}

function isAuthenticated(request: NextRequest): boolean {
  return !!request.cookies.get(AUTH_COOKIE);
}

// PUT: Update an employee
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const employeeId = parseInt(id);
    const updatedData: Omit<Employee, 'id'> = await request.json();

    // Validate required fields
    if (
      !updatedData.firstName ||
      !updatedData.lastName ||
      !updatedData.email ||
      !updatedData.salary ||
      !updatedData.date
    ) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    const employees = await readEmployees();
    const index = employees.findIndex((e) => e.id === employeeId);

    if (index === -1) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    employees[index] = { ...updatedData, id: employeeId };
    await writeEmployees(employees);

    return NextResponse.json(employees[index]);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    );
  }
}

// DELETE: Delete an employee
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const employeeId = parseInt(id);

    const employees = await readEmployees();
    const employee = employees.find((e) => e.id === employeeId);

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    const filteredEmployees = employees.filter((e) => e.id !== employeeId);
    await writeEmployees(filteredEmployees);

    return NextResponse.json({
      success: true,
      employee,
      message: `${employee.firstName} ${employee.lastName}'s data has been deleted.`
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete employee' },
      { status: 500 }
    );
  }
}
