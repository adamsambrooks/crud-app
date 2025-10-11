# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a modern employee management CRUD (Create, Read, Update, Delete) application built with **Next.js 15** using the **App Router**. It demonstrates full-stack CRUD operations with server-side authentication, API routes, and **SQLite database** persistence via Prisma ORM.

## Quick Reference: Key Files

- **`app/`** — Next.js App Router. Server components by default; client components must include `'use client'`
- **`app/api/`** — Backend API routes. See `app/api/employees/route.ts` and `app/api/employees/[id]/route.ts` for patterns
- **`app/dashboard/`** — Classic table view page with simple HTML table
- **`app/employees-table/`** — Advanced table view with TanStack Table (filtering, sorting, search, pagination)
- **`lib/db.ts`** — Prisma client singleton and all DB helpers (getAllEmployees, createEmployee, updateEmployee, deleteEmployee, emailExists)
- **`lib/auth.ts`** — Auth constants and `validateCredentials`. Cookie name: `auth_token`
- **`lib/types.ts`** — TypeScript interfaces (Employee, AuthState)
- **`lib/utils.ts`** — Utility functions (cn helper for className merging)
- **`prisma/schema.prisma`** — Database schema (SQLite provider, `Employee` model)
- **`scripts/migrate-data.ts`** — Seed script; run via `npm run migrate-data`
- **`middleware.ts`** — Next.js middleware for protecting routes and handling auth redirects
- **`components/`** — Client-side UI components (all use `'use client'` directive)
- **`components/ui/`** — shadcn/ui base components (Button, Input, Table, DropdownMenu)
- **`components/data-table.tsx`** — TanStack Table wrapper component
- **`components/employee-columns.tsx`** — Column definitions for TanStack Table

## Development Commands

```bash
# Install dependencies
npm install

# Database Commands
npm run db:push          # Push Prisma schema to database
npm run db:studio        # Open Prisma Studio (database GUI)
npm run migrate-data     # Seed database with initial employee data

# Development
npm run dev              # Start Next.js dev server with Turbopack (runs on http://localhost:3000)

# Production
npm run build            # Create production build
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
```

## Architecture

### Next.js App Router Structure

This application uses the modern **Next.js App Router** (not Pages Router) with a clear separation between server and client components:

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

### Authentication System

**Server-side authentication** using HTTP-only cookies:
- Credentials validated in `lib/auth.ts` (admin@example.com / qwerty)
- Authentication cookie (`auth_token`) set via API routes
- Middleware (`middleware.ts`) protects `/dashboard` routes and redirects unauthenticated users to `/login`
- Cookie-based auth (not localStorage) for better security

### Data Persistence

**SQLite database with Prisma ORM**:
- Employee data stored in SQLite database (`prisma/dev.db`)
- Database schema defined in `prisma/schema.prisma`
- Database utility layer in `lib/db.ts` provides type-safe CRUD operations
- Initial seed data in `scripts/migrate-data.ts` (10 employee records) - loaded via `npm run migrate-data`
- CRUD operations handled via API routes (`app/api/employees/`) using Prisma client
- **Auto-incrementing IDs**: SQLite handles ID generation automatically
- **Data integrity**: Unique email constraint enforced at database level
- **Date serialization**: Dates stored as DateTime type, serialized to YYYY-MM-DD for API responses
- **Prisma singleton pattern**: Uses global singleton in development to prevent multiple client instances

**Database Helper Functions (lib/db.ts):**
- `getAllEmployees()`: Returns all employees ordered by ID
- `getEmployeeById(id)`: Returns single employee or null
- `createEmployee(data)`: Creates new employee (auto-generates ID)
- `updateEmployee(id, data)`: Updates employee or returns null if not found
- `deleteEmployee(id)`: Deletes employee or returns null if not found
- `emailExists(email, excludeId?)`: Checks if email is already used (useful for validation)

### Component Architecture

**Client vs Server Components**:
- Pages that need interactivity are marked with `'use client'` directive
- API routes run on the server only
- Components in `/components` directory are client components for forms and tables

```
Dashboard Page (Client Component)
├── Header (add button + logout)
├── Table (employee list with edit/delete)
├── AddEmployee (form for new employee)
└── EditEmployee (form for updating employee)
```

### State Management

Uses **React hooks** (useState, useEffect) for client-side state:
- Dashboard manages view modes (`isAdding`, `isEditing`)
- Employee data fetched from API on mount
- No Redux or Context API needed for this scale

### Advanced Table Component (TanStack Table)

The application includes two table views for displaying employee data:

1. **Classic Table** (`/dashboard`) - Simple HTML table with basic functionality
2. **Advanced Table** (`/employees-table`) - Powered by TanStack Table v8 with advanced features

**Advanced Table Features:**
- **Global Search**: Search across all columns simultaneously
- **Column Sorting**: Click column headers to sort (ascending/descending)
- **Pagination**: Choose between 10, 25, 50, or 100 rows per page
- **Column Visibility**: Show/hide columns via dropdown menu
- **Responsive Design**: Optimized for all screen sizes
- **CRUD Integration**: Full Edit/Delete functionality with SweetAlert2 modals

**Key Files:**
- `components/data-table.tsx` - Main TanStack Table wrapper component
  - Manages table state (sorting, filtering, pagination, column visibility)
  - Provides UI for search, column controls, and pagination
  - Reusable for any data type via TypeScript generics

- `components/employee-columns.tsx` - Column definitions for Employee data
  - Defines sortable columns with custom sort functions
  - Includes cell formatters (salary formatting, status badges)
  - Integrates Edit/Delete action buttons
  - Export `createEmployeeColumns()` function that accepts handlers

- `components/ui/` - shadcn/ui base components
  - `button.tsx` - Variants: default, destructive, outline, ghost, link
  - `input.tsx` - Styled input with focus states
  - `table.tsx` - Table primitives (Table, TableHeader, TableBody, TableRow, TableCell)
  - `dropdown-menu.tsx` - Dropdown menu for column visibility

**Adding TanStack Table to New Pages:**
```typescript
import { DataTable } from '@/components/data-table';
import { createEmployeeColumns } from '@/components/employee-columns';

const columns = createEmployeeColumns(handleEdit, handleDelete);
return <DataTable columns={columns} data={employees} />;
```

**Creating New Column Definitions:**
```typescript
import { ColumnDef } from "@tanstack/react-table"

export const myColumns: ColumnDef<MyType>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
  },
  // ... more columns
]
```

### Styling

**Tailwind CSS** for modern, utility-first styling:
- Configuration in `tailwind.config.ts`
- Global styles in `app/globals.css`
- Responsive design with gradient backgrounds and hover effects
- shadcn/ui components use Tailwind utility classes
- `lib/utils.ts` provides `cn()` helper for conditional class merging

### TypeScript

Fully typed with TypeScript:
- Type definitions in `lib/types.ts`
- Strict mode enabled in `tsconfig.json`
- Interface for Employee and AuthState

## Common Development Patterns

### Adding New Employee Fields

When adding or renaming employee fields, follow this checklist:

1. **Update database schema**: Modify `Employee` model in `prisma/schema.prisma`
   ```prisma
   model Employee {
     // ... existing fields
     newField String  // Add your new field
   }
   ```

2. **Apply schema changes**: Run `npm run db:push` to update the database

3. **Update TypeScript types**: Modify `Employee` interface in `lib/types.ts`
   ```typescript
   export interface Employee {
     // ... existing fields
     newField: string;
   }
   ```

4. **Update database utilities** (if needed): Modify `serializeEmployee()` and CRUD functions in `lib/db.ts`

5. **Update seed data**: Add the new field to `lib/data.ts` and `scripts/migrate-data.ts`

6. **Update UI components**:
   - Add form inputs in `components/AddEmployee.tsx` and `components/EditEmployee.tsx`
   - Add table column in `components/Table.tsx`

7. **Test**: Run `npm run dev` and verify CRUD operations work with the new field

### Modifying API Routes

All API routes follow Next.js App Router conventions:
- **GET/POST**: Export from `route.ts` (e.g., `/api/employees/route.ts`)
- **PUT/DELETE**: Use dynamic routes with `[id]` (e.g., `/api/employees/[id]/route.ts`)
- Authentication checked via `isAuthenticated()` helper from `lib/auth.ts`
- Use `NextRequest` and `NextResponse` for typed request/response handling
- Database operations use functions from `lib/db.ts` (getAllEmployees, createEmployee, updateEmployee, deleteEmployee, emailExists)

**Authentication Pattern:**
```typescript
const authToken = request.cookies.get('auth_token');
if (!authToken) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Request Validation Pattern (POST `/api/employees`):**
```typescript
const { firstName, lastName, email, salary, date } = await request.json();

// Validate required fields
if (!firstName || !lastName || !email || !salary || !date) {
  return NextResponse.json(
    { error: 'Missing required fields' },
    { status: 400 }
  );
}
```

**Prisma Error Handling:**
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

**Common Status Codes:**
- `200`: Success (GET, PUT, DELETE)
- `201`: Created (POST)
- `400`: Bad Request (missing/invalid fields)
- `401`: Unauthorized (missing auth token)
- `404`: Not Found (employee doesn't exist)
- `409`: Conflict (duplicate email)
- `500`: Internal Server Error

### Adding New Pages

1. Create `page.tsx` in appropriate `app/` subdirectory
2. Add `'use client'` directive at the top if page needs client-side interactivity (forms, state, event handlers)
3. Update `middleware.ts` matcher if page requires authentication
4. Import types from `lib/types.ts` for type safety

**Example**: To add a new authenticated page at `/reports`:
- Create `app/reports/page.tsx`
- Add `'use client'` if needed
- Update middleware config: `matcher: ['/dashboard/:path*', '/reports', '/login']`

## Key Differences from Old React Version

- **No react-scripts**: Uses Next.js build system with Turbopack
- **Server-side rendering**: Pages can be server components by default
- **API routes**: Backend logic in `/api` routes instead of frontend-only
- **File-based routing**: Directory structure defines routes
- **HTTP-only cookies**: More secure than localStorage for auth
- **SQLite database**: Embedded database instead of file-based JSON storage
- **Prisma ORM**: Type-safe database queries with auto-generated types
- **Auto-incrementing IDs**: Database-managed IDs instead of manual calculation
- **Data constraints**: Unique email enforced at database level
- **Tailwind CSS**: Modern utility-first CSS instead of Primitive UI
- **TypeScript**: Full type safety throughout the codebase

## Project Structure

```
crud-app/
├── app/                      # Next.js App Router
│   ├── api/                 # API route handlers
│   ├── dashboard/           # Classic table view page
│   ├── employees-table/     # Advanced TanStack Table page
│   ├── login/              # Login page
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home (redirects)
│   └── globals.css         # Global styles
├── components/              # Reusable React components
│   ├── ui/                 # shadcn/ui base components
│   │   ├── button.tsx      # Button component
│   │   ├── input.tsx       # Input component
│   │   ├── table.tsx       # Table primitives
│   │   └── dropdown-menu.tsx # Dropdown menu
│   ├── data-table.tsx      # TanStack Table wrapper
│   ├── employee-columns.tsx # Employee column definitions
│   ├── Table.tsx           # Classic table component
│   ├── Header.tsx          # Dashboard header
│   ├── AddEmployee.tsx     # Add employee form
│   └── EditEmployee.tsx    # Edit employee form
├── lib/                     # Shared utilities and types
│   ├── auth.ts             # Authentication helpers
│   ├── data.ts             # Seed data (for migration script)
│   ├── db.ts               # Prisma client singleton & database utilities
│   ├── types.ts            # TypeScript types
│   └── utils.ts            # Utility functions (cn helper)
├── prisma/                  # Prisma ORM configuration
│   └── schema.prisma       # Database schema definition
├── scripts/                 # Utility scripts
│   └── migrate-data.ts     # Database seeding script
├── middleware.ts            # Next.js middleware for auth
├── next.config.ts           # Next.js configuration
├── tailwind.config.ts       # Tailwind CSS config
└── tsconfig.json            # TypeScript config
```

## Database Setup

### First-Time Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Push database schema:**
   ```bash
   npm run db:push
   ```
   This creates the SQLite database file (`prisma/dev.db`) and applies the schema.

3. **Seed initial data:**
   ```bash
   npm run migrate-data
   ```
   This populates the database with 10 sample employee records.

4. **Start Next.js development server:**
   ```bash
   npm run dev
   ```
   App runs on [http://localhost:3000](http://localhost:3000). Default login: `admin@example.com` / `qwerty`

### Viewing Database Contents

```bash
npm run db:studio
```
This opens Prisma Studio in your browser - a GUI to view and edit database records.

### Database File

- The SQLite database is stored at `prisma/dev.db`
- This file is gitignored and should not be committed to version control
- The database schema is in `prisma/schema.prisma` using SQLite provider

## Security Notes

- **Mock authentication**: Uses hardcoded credentials (`admin@example.com` / `qwerty` in `lib/auth.ts`)
- **Development database**: SQLite is suitable for development but consider PostgreSQL/MySQL for production
- **No password hashing**: Plain text password comparison for authentication
- **HTTP-only cookies**: Auth token stored in `auth_token` cookie (more secure than localStorage)

**For Production Deployment:**
1. Migrate to production database (PostgreSQL, MySQL, etc.):
   - Update `provider` in `prisma/schema.prisma`
   - Set `DATABASE_URL` environment variable
2. Implement proper password hashing (bcrypt, argon2)
3. Use secure session management (JWT or session tokens with proper expiration)
4. Enable HTTPS only for cookies
5. Add rate limiting for API routes
6. Implement proper CSRF protection

## Pre-Deployment Checklist

Before running `npm run build`:
- [ ] Run `npm run lint` and fix all issues
- [ ] Run `npm run db:push` if schema changed
- [ ] Test all CRUD operations locally with `npm run dev`
- [ ] Verify authentication flow (login, logout, protected routes)
- [ ] Check that unique email constraint works (try creating duplicate)
- [ ] Ensure database is seeded with `npm run migrate-data` (if needed)
