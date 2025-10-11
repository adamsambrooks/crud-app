import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@/lib/auth';
import { updateEmployee, deleteEmployee } from '@/lib/db';

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
    const updatedData = await request.json();

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

    const employee = await updateEmployee(employeeId, updatedData);

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error: any) {
    // P2002 means unique constraint violation (duplicate email)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email already exists.' },
        { status: 409 }
      );
    }
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

    const employee = await deleteEmployee(employeeId);

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

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
