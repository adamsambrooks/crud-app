import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@/lib/auth';
import { getAllEmployees, createEmployee } from '@/lib/db';

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
    const employees = await getAllEmployees();
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
    const newEmployee = await request.json();

    // Validate required fields
    if (
      !newEmployee.firstName ||
      !newEmployee.lastName ||
      !newEmployee.email ||
      typeof newEmployee.active !== 'boolean' ||
      !newEmployee.payType
    ) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    // Validate payType enum
    if (!['Hourly', 'Salary', 'Pct'].includes(newEmployee.payType)) {
      return NextResponse.json(
        { error: 'Invalid pay type. Must be Hourly, Salary, or Pct.' },
        { status: 400 }
      );
    }

    const employee = await createEmployee(newEmployee);
    return NextResponse.json(employee, { status: 201 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // P2002 means unique constraint violation (duplicate email)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email already exists.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}
