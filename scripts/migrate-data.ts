import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const employeesData = [
  {
    firstName: 'Susan',
    lastName: 'Jordon',
    email: 'susan@example.com',
    salary: '95000',
    date: '2019-04-11',
    active: true,
    payType: 'Salary',
  },
  {
    firstName: 'Adrienne',
    lastName: 'Doak',
    email: 'adrienne@example.com',
    salary: '80000',
    date: '2019-04-17',
    active: true,
    payType: 'Salary',
  },
  {
    firstName: 'Rolf',
    lastName: 'Hegdal',
    email: 'rolf@example.com',
    salary: '79000',
    date: '2019-05-01',
    active: false,
    payType: 'Hourly',
  },
  {
    firstName: 'Kent',
    lastName: 'Rosner',
    email: 'kent@example.com',
    salary: '56000',
    date: '2019-05-03',
    active: true,
    payType: 'Hourly',
  },
  {
    firstName: 'Arsenio',
    lastName: 'Grant',
    email: 'arsenio@example.com',
    salary: '65000',
    date: '2019-06-13',
    active: true,
    payType: 'Pct',
  },
  {
    firstName: 'Laurena',
    lastName: 'Lurie',
    email: 'laurena@example.com',
    salary: '120000',
    date: '2019-07-30',
    active: true,
    payType: 'Salary',
  },
  {
    firstName: 'George',
    lastName: 'Tallman',
    email: 'george@example.com',
    salary: '90000',
    date: '2019-08-15',
    active: false,
    payType: 'Salary',
  },
  {
    firstName: 'Jesica',
    lastName: 'Watlington',
    email: 'jesica@example.com',
    salary: '60000',
    date: '2019-10-10',
    active: true,
    payType: 'Hourly',
  },
  {
    firstName: 'Matthew',
    lastName: 'Warren',
    email: 'matthew@example.com',
    salary: '71000',
    date: '2019-10-15',
    active: true,
    payType: 'Pct',
  },
  {
    firstName: 'Lyndsey',
    lastName: 'Follette',
    email: 'lyndsey@example.com',
    salary: '110000',
    date: '2020-01-15',
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
        salary: employee.salary,
        date: new Date(employee.date),
        active: employee.active,
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
