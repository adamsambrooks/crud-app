# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **therapy practice management application** built with **Next.js 15 App Router**. It demonstrates full-stack CRUD operations with server-side authentication, API routes, and **PostgreSQL (Supabase)** database persistence via Prisma ORM.

**Originally**: Simple employee management CRUD app
**Current State**: Full practice management system with 7 interconnected tables supporting:
- Employee/clinician management
- Client/patient records
- Appointment scheduling and billing
- Compensation rate tracking
- Audit logging

**Data Scale**: 164,664+ total records migrated from SQL Server LocalDB.

## Quick Reference: Key Files

### Core Application
- **`app/`** — Next.js App Router. Server components by default; client components need `'use client'`
- **`app/api/`** — Backend API routes. Pattern examples in `app/api/employees/` and `app/api/auth/`
- **`lib/db.ts`** — Prisma client singleton and database helper functions
- **`lib/auth.ts`** — Auth helpers. Cookie name: `auth_token`. Default credentials: admin@example.com / qwerty
- **`lib/types.ts`** — TypeScript interfaces (Employee, AuthState, etc.)
- **`lib/utils.ts`** — Utility functions (cn helper for className merging with clsx/tailwind-merge)
- **`middleware.ts`** — Next.js middleware for route protection and auth redirects

### Database & Migrations
- **`prisma/schema.prisma`** — **PostgreSQL** provider with 7 tables (Employee, Client, Appointment, Rate, AppointmentType, TimePeriod, Log)
- **`scripts/migrate-data.ts`** — SQLite seed script (legacy)
- **`scripts/import-to-supabase.ts`** — Import data to Supabase from SQL Server export
- **`scripts/export-sqlserver-data.ts`** — Export SQL Server data to JSON
- **`scripts/test-supabase-connection.ts`** — Connection testing utility

### UI Components
- **`app/dashboard/`** — Classic table view page with simple HTML table
- **`app/employees-table/`** — Advanced table with TanStack Table (sorting, filtering, search, pagination)
- **`components/`** — Client-side UI components (all use `'use client'`)
- **`components/ui/`** — shadcn/ui base components (Button, Input, Table, DropdownMenu)
- **`components/data-table.tsx`** — TanStack Table wrapper component
- **`components/employee-columns.tsx`** — Column definitions for TanStack Table

### Documentation
- **`MIGRATION_PRD.md`** — Comprehensive migration plan from SQL Server to Supabase (164K+ records)
- **`DATA_QUALITY_ANALYSIS.md`** — Analysis of Client.Next_Appt invalid date issue (6,976 records)
- **`README.md`** — User-facing project documentation

## Development Commands

```bash
# Install dependencies
npm install

# Database Commands
npm run db:push           # Push Prisma schema to PostgreSQL (Supabase)
npm run db:studio         # Open Prisma Studio (database GUI)

# Legacy/Development Seeding
npm run migrate-data      # Seed SQLite database (legacy, for local dev prototype)

# Production Data Migration (from SQL Server to Supabase)
npm run export-sqlserver  # Export SQL Server data to JSON
npm run import-supabase   # Import JSON data to Supabase PostgreSQL

# Development Server
npm run dev               # Start Next.js dev server with Turbopack (http://localhost:3000)

# Production
npm run build             # Create production build
npm run start             # Start production server

# Code Quality
npm run lint              # Run ESLint
```

## Architecture

### Database: PostgreSQL (Supabase)

**Provider**: Supabase PostgreSQL (migrated from SQL Server LocalDB)
**Connection**: Environment variable `DATABASE_URL` (postgresql://...)
**ORM**: Prisma with singleton pattern to prevent multiple client instances

**7-Table Schema**:
1. **employees** (83 rows) — Clinicians and staff with payroll integration (SimplePractice, Gusto)
2. **clients** (9,289 rows) — Patient/client records with case management data
3. **appointments** (134,179 rows) — Therapy session records with billing and payment tracking
4. **rates** (1,912 rows) — Compensation rates by employee, appointment type, and date range
5. **appointment_types** (30 rows) — Lookup table for session types and billing codes
6. **time_periods** (444 rows) — Payroll period definitions (bi-weekly, 2014-present)
7. **logs** (18,767 rows) — Application audit trail and error logging

**Relationships**:
```
AppointmentType ──┬─> Client ──> Appointment
                  └─> Rate ───────┘
                                  ↑
Employee ─────────┬──────────────┘
                  ├─> Client
                  └─> Rate

TimePeriod (independent)
Log (independent)
```

**Key Schema Details**:
- All tables use auto-incrementing integer primary keys
- Foreign keys use `ON DELETE RESTRICT` to prevent orphaned records
- Dates stored as `DateTime @db.Date` (date only) or `DateTime @db.Timestamp` (date + time)
- Employee table has fields for: firstName, lastName, email, startDate, active, payType, employeeSpId (SimplePractice), gustoId (Gusto payroll)
- Client table includes: clientName, email, employeeId (FK), apptTypeId (FK), active, txPlan (treatment plan), npp (privacy notice), consent, nextAppt
- Appointment table tracks: clientId, employeeId, rateId, apptTypeId, apptDate, duration, units, clinicianAmount, clientCharge, hasProgressNote, flagged, comments

**Important Data Quality Note**:
- Client.nextAppt field had 6,976 invalid `0001-01-01` placeholder dates (75% of records) in source system
- These were converted to NULL during migration (see `DATA_QUALITY_ANALYSIS.md`)
- Field appears unused by application logic (not maintained when appointments scheduled)

### Next.js App Router Structure

Uses modern **Next.js App Router** (not Pages Router) with clear server/client component separation:

```
app/
├── layout.tsx              # Root layout with global styles
├── page.tsx                # Home page (redirects to /login)
├── globals.css             # Tailwind CSS styles
├── login/
│   └── page.tsx            # Client component: Login page
├── dashboard/
│   └── page.tsx            # Client component: Classic dashboard with simple table
├── employees-table/
│   └── page.tsx            # Client component: Advanced table with TanStack Table
└── api/
    ├── auth/
    │   ├── login/route.ts   # POST: Login authentication
    │   ├── logout/route.ts  # POST: Logout
    │   └── check/route.ts   # GET: Check auth status
    └── employees/
        ├── route.ts         # GET: List all | POST: Create
        └── [id]/route.ts    # PUT: Update | DELETE: Delete
```

**Future API Routes** (for full practice management):
- `/api/clients/*` — Client/patient CRUD
- `/api/appointments/*` — Appointment scheduling and billing
- `/api/rates/*` — Compensation rate management
- `/api/appointment-types/*` — Session type lookup
- `/api/time-periods/*` — Payroll period lookup
- `/api/logs/*` — Audit log access

### Authentication System

**Server-side authentication** using HTTP-only cookies:
- Hardcoded dev credentials: `admin@example.com` / `qwerty` (in `lib/auth.ts`)
- Cookie name: `auth_token` (set via API routes)
- Middleware (`middleware.ts`) protects `/dashboard` routes and redirects to `/login`
- Pattern: Check `request.cookies.get('auth_token')` in API routes → return 401 if missing

### Component Architecture

**Client vs Server Components**:
- Pages needing interactivity marked with `'use client'` directive
- API routes run server-only
- Components in `/components` are client components (forms, tables, interactive UI)

**State Management**: React hooks (useState, useEffect) — no Redux/Context needed for current scale

### Advanced Table Component (TanStack Table)

Two table views available:
1. **Classic Table** (`/dashboard`) — Simple HTML table
2. **Advanced Table** (`/employees-table`) — TanStack Table v8 with global search, column sorting, pagination (10/25/50/100 rows), column visibility toggle, responsive design

**Key Files**:
- `components/data-table.tsx` — Reusable TanStack Table wrapper (TypeScript generics)
- `components/employee-columns.tsx` — Column definitions with sortable columns, cell formatters (salary, status badges), Edit/Delete actions
- Export `createEmployeeColumns(handleEdit, handleDelete)` function

**Usage Pattern**:
```typescript
import { DataTable } from '@/components/data-table';
import { createEmployeeColumns } from '@/components/employee-columns';

const columns = createEmployeeColumns(handleEdit, handleDelete);
return <DataTable columns={columns} data={employees} />;
```

### Styling

**Tailwind CSS** utility-first styling:
- Config: `tailwind.config.ts`
- Global styles: `app/globals.css`
- shadcn/ui components use Tailwind classes
- `lib/utils.ts` provides `cn()` helper for conditional class merging

## Common Development Patterns

### Database Operations (lib/db.ts)

**Current Employee Helpers**:
```typescript
getAllEmployees()           // Returns all employees ordered by ID
getEmployeeById(id)         // Returns single employee or null
createEmployee(data)        // Creates new employee (auto-generated ID)
updateEmployee(id, data)    // Updates employee or null if not found
deleteEmployee(id)          // Deletes employee or null if not found
emailExists(email, excludeId?)  // Check email uniqueness
```

**Date Serialization**: Prisma returns Date objects; `serializeEmployee()` converts to YYYY-MM-DD strings for API responses.

**Pattern for Additional Tables**:
- Follow same naming convention: `getAllClients()`, `createAppointment()`, etc.
- Use Prisma client singleton: `prisma.client.findMany()`, `prisma.appointment.create()`, etc.
- Handle Prisma errors: `P2002` (unique constraint) → 409, `P2025` (not found) → 404

### Adding New Employee Fields

When adding/renaming employee fields:

1. **Update Prisma schema**: Modify `Employee` model in `prisma/schema.prisma`
2. **Apply changes**: Run `npm run db:push` (pushes to Supabase)
3. **Update TypeScript types**: Modify `Employee` interface in `lib/types.ts`
4. **Update database utilities**: Modify `serializeEmployee()` and CRUD functions in `lib/db.ts`
5. **Update seed data**: Modify `lib/data.ts` and `scripts/migrate-data.ts` if needed
6. **Update UI components**: Add form inputs in `AddEmployee.tsx`, `EditEmployee.tsx`; add table columns in `Table.tsx` or `employee-columns.tsx`
7. **Test**: Run `npm run dev` and verify CRUD operations

### Modifying API Routes

**Conventions**:
- **GET/POST**: Export from `route.ts` (e.g., `/api/employees/route.ts`)
- **PUT/DELETE**: Dynamic routes with `[id]` (e.g., `/api/employees/[id]/route.ts`)
- Use `NextRequest` and `NextResponse` for typed request/response
- All routes check authentication via `request.cookies.get('auth_token')`

**Authentication Pattern**:
```typescript
const authToken = request.cookies.get('auth_token');
if (!authToken) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Request Validation Pattern**:
```typescript
const { firstName, lastName, email, salary, date } = await request.json();

if (!firstName || !lastName || !email || !salary || !date) {
  return NextResponse.json(
    { error: 'Missing required fields' },
    { status: 400 }
  );
}
```

**Prisma Error Handling**:
```typescript
try {
  const employee = await createEmployee(data);
  return NextResponse.json(employee, { status: 201 });
} catch (error: any) {
  if (error.code === 'P2002') {
    // Unique constraint violation (duplicate email)
    return NextResponse.json(
      { error: 'Email already exists' },
      { status: 409 }
    );
  }
  if (error.code === 'P2025') {
    // Record not found
    return NextResponse.json(
      { error: 'Employee not found' },
      { status: 404 }
    );
  }
  throw error;
}
```

**Common Status Codes**:
- `200` — Success (GET, PUT, DELETE)
- `201` — Created (POST)
- `400` — Bad Request (missing/invalid fields)
- `401` — Unauthorized (missing auth token)
- `404` — Not Found (resource doesn't exist)
- `409` — Conflict (duplicate constraint violation)
- `500` — Internal Server Error

### Adding New Pages

1. Create `page.tsx` in appropriate `app/` subdirectory
2. Add `'use client'` if page needs client-side interactivity (forms, state, event handlers)
3. Update `middleware.ts` matcher if page requires authentication
4. Import types from `lib/types.ts` for type safety

**Example**: New authenticated page at `/reports`:
- Create `app/reports/page.tsx`
- Add `'use client'` if needed
- Update middleware: `matcher: ['/dashboard/:path*', '/reports', '/employees-table/:path*', '/login']`

## Database Setup & Migration

### Environment Configuration

Create `.env` file in project root:
```bash
# Supabase PostgreSQL Connection
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### First-Time Development Setup

1. **Install dependencies**: `npm install`
2. **Push database schema**: `npm run db:push` (creates tables in Supabase)
3. **Verify in Prisma Studio**: `npm run db:studio` (opens GUI at http://localhost:5555)
4. **Start development server**: `npm run dev`
5. **Login**: Navigate to http://localhost:3000, use `admin@example.com` / `qwerty`

### Production Data Migration (SQL Server → Supabase)

**Context**: This project was migrated from SQL Server LocalDB with 164K+ records.

**Migration Scripts**:
1. `npm run export-sqlserver` — Export SQL Server data to JSON files
2. `npm run import-supabase` — Import JSON files to Supabase PostgreSQL
3. Manual validation in Prisma Studio

**Key Migration Considerations** (from `MIGRATION_PRD.md`):
- Tables migrated in dependency order (AppointmentType → Employee → TimePeriod → Client → Rate → Appointment → Log)
- Large tables use batch processing (1000 rows/batch)
- Invalid dates (`0001-01-01` in Client.nextAppt) converted to NULL (6,976 records)
- Foreign key constraints enforced (`ON DELETE RESTRICT`)
- Data transformations: SQL Server datetime2 → PostgreSQL timestamp, bit → boolean

**Validation Queries**:
```sql
-- Row count verification (should match source)
SELECT 'employees' AS table, COUNT(*) FROM employees
UNION ALL SELECT 'clients', COUNT(*) FROM clients
UNION ALL SELECT 'appointments', COUNT(*) FROM appointments;
-- ... etc

-- Foreign key integrity check (should return 0)
SELECT c.id FROM clients c
LEFT JOIN employees e ON c.employee_id = e.id
WHERE c.employee_id IS NOT NULL AND e.id IS NULL;
```

## Key Differences from Original Version

- **Database**: SQLite (local file) → **PostgreSQL (Supabase, cloud-hosted)**
- **Schema**: Single Employee table → **7 interconnected tables** (Employee, Client, Appointment, Rate, AppointmentType, TimePeriod, Log)
- **Scale**: 10 prototype records → **164,664+ production records**
- **Purpose**: Demo CRUD app → **Therapy practice management system**
- **Data Integrity**: Manual ID management → **Database-managed auto-increment + foreign key constraints**
- **Naming**: camelCase → **snake_case** column names (SQL convention)
- **Additional Scripts**: Multiple migration and data import/export utilities

## Security Notes

**Current State** (Development):
- Mock authentication: Hardcoded credentials `admin@example.com` / `qwerty` in `lib/auth.ts`
- No password hashing (plain text comparison)
- HTTP-only cookies (better than localStorage, but still basic)
- PostgreSQL connection via Supabase (production-grade infrastructure)

**For Production Deployment**:
1. Implement proper password hashing (bcrypt, argon2)
2. Use secure session management (JWT with proper expiration, refresh tokens)
3. Enable HTTPS-only cookies with SameSite=Strict
4. Add rate limiting for API routes
5. Implement CSRF protection
6. Set up Supabase Row Level Security (RLS) policies
7. Use environment variables for all sensitive config
8. Add proper error handling (don't leak internal details)

## Pre-Deployment Checklist

Before running `npm run build`:
- [ ] Run `npm run lint` and fix all issues
- [ ] Run `npm run db:push` if schema changed (pushes to Supabase)
- [ ] Test all CRUD operations locally with `npm run dev`
- [ ] Verify authentication flow (login, logout, protected routes)
- [ ] Check unique email constraint works (try creating duplicate employee)
- [ ] Verify Supabase connection with `DATABASE_URL` environment variable
- [ ] Test error handling (404s, 409 conflicts, 401 unauthorized)
- [ ] Validate date handling (ensure no `0001-01-01` dates in Client.nextAppt)
- [ ] Check foreign key constraints (no orphaned records)

## Additional Resources

### Related Documentation
- **`MIGRATION_PRD.md`** — Full migration plan with schema definitions, data quality analysis, timeline, risk assessment
- **`DATA_QUALITY_ANALYSIS.md`** — Deep dive into Client.Next_Appt invalid date issue (6,976 records with `0001-01-01`)
- **`README.md`** — User-facing project overview and setup instructions
- **`.github/copilot-instructions.md`** — Concise quick-start guide for AI coding agents

### External References
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js 15 App Router](https://nextjs.org/docs/app)
- [Supabase PostgreSQL](https://supabase.com/docs/guides/database)
- [TanStack Table v8](https://tanstack.com/table/v8)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
