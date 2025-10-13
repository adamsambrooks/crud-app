import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const employeesData = [
  {
    firstName: 'Susan',
    lastName: 'Jordon',
    email: 'susan@example.com',
    active: true,
    payType: 'Salary',
  },
  {
    firstName: 'Adrienne',
    lastName: 'Doak',
    email: 'adrienne@example.com',
    active: true,
    payType: 'Salary',
  },
  {
    firstName: 'Rolf',
    lastName: 'Hegdal',
    email: 'rolf@example.com',
    active: false,
    payType: 'Hourly',
  },
  {
    firstName: 'Kent',
    lastName: 'Rosner',
    email: 'kent@example.com',
    active: true,
    payType: 'Hourly',
  },
  {
    firstName: 'Arsenio',
    lastName: 'Grant',
    email: 'arsenio@example.com',
    active: true,
    payType: 'Pct',
  },
  {
    firstName: 'Laurena',
    lastName: 'Lurie',
    email: 'laurena@example.com',
    active: true,
    payType: 'Salary',
  },
  {
    firstName: 'George',
    lastName: 'Tallman',
    email: 'george@example.com',
    active: false,
    payType: 'Salary',
  },
  {
    firstName: 'Jesica',
    lastName: 'Watlington',
    email: 'jesica@example.com',
    active: true,
    payType: 'Hourly',
  },
  {
    firstName: 'Matthew',
    lastName: 'Warren',
    email: 'matthew@example.com',
    active: true,
    payType: 'Pct',
  },
  {
    firstName: 'Lyndsey',
    lastName: 'Follette',
    email: 'lyndsey@example.com',
    active: true,
    payType: 'Salary',
  },
];

async function main() {
  console.log('Starting data migration...');

  // Check if data already exists
  const existingCount = await prisma.employee.count();
  if (existingCount > 0) {
    console.log(`Database already contains ${existingCount} employees.`);
    console.log('Skipping migration to avoid duplicates.');
    return;
  }

  // Migrate each employee
  for (const employee of employeesData) {
    await prisma.employee.create({
      data: {
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        active: employee.active ? 1 : 0,
        payType: employee.payType,
      },
    });
    console.log(`✓ Migrated ${employee.firstName} ${employee.lastName}`);
  }

  console.log(`\n✨ Successfully migrated ${employeesData.length} employees to the database!`);
}

main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
