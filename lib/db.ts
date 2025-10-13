import { PrismaClient } from '@prisma/client';
import { Employee } from './types';

// Singleton pattern for Prisma client
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Helper to serialize employee data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeEmployee(employee: any): Employee {
  return {
    id: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    active: Boolean(employee.active),
    payType: employee.payType,
  };
}

// Get all employees
export async function getAllEmployees(): Promise<Employee[]> {
  const employees = await prisma.employee.findMany({
    orderBy: { id: 'asc' },
  });
  return employees.map(serializeEmployee);
}

// Get employee by ID
export async function getEmployeeById(id: number): Promise<Employee | null> {
  const employee = await prisma.employee.findUnique({
    where: { id },
  });
  return employee ? serializeEmployee(employee) : null;
}

// Create a new employee
export async function createEmployee(
  data: Omit<Employee, 'id'>
): Promise<Employee> {
  const employee = await prisma.employee.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      active: data.active ? 1 : 0,
      payType: data.payType,
    },
  });
  return serializeEmployee(employee);
}

// Update an existing employee
export async function updateEmployee(
  id: number,
  data: Omit<Employee, 'id'>
): Promise<Employee | null> {
  try {
    const employee = await prisma.employee.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        active: data.active ? 1 : 0,
        payType: data.payType,
      },
    });
    return serializeEmployee(employee);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // P2025 means record not found
    if (error.code === 'P2025') {
      return null;
    }
    throw error;
  }
}

// Delete an employee
export async function deleteEmployee(id: number): Promise<Employee | null> {
  try {
    const employee = await prisma.employee.delete({
      where: { id },
    });
    return serializeEmployee(employee);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // P2025 means record not found
    if (error.code === 'P2025') {
      return null;
    }
    throw error;
  }
}

// Check if email already exists (for validation)
export async function emailExists(
  email: string,
  excludeId?: number
): Promise<boolean> {
  const employee = await prisma.employee.findFirst({
    where: { email },
  });

  if (!employee) return false;
  if (excludeId && employee.id === excludeId) return false;

  return true;
}
