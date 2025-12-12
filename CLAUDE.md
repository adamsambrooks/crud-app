# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a modern employee management CRUD (Create, Read, Update, Delete) application built with **Next.js 15** using the **App Router**. It demonstrates full-stack CRUD operations with server-side authentication, API routes, and **SQLite database** persistence via Prisma ORM.

## Development Commands

```bash
# Install dependencies
npm install

# Database Commands
npm run db:push          # Push Prisma schema to database (creates prisma/dev.db if needed)
npm run db:studio        # Open Prisma Studio (database GUI at http://localhost:5555)
npm run migrate-data     # Seed database with 10 sample employee records

# Development
npm run dev              # Start Next.js dev server with Turbopack (http://localhost:3000)

# Production
npm run build            # Create production build
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
```

### Default Login Credentials

- **Email**: admin@example.com
- **Password**: qwerty

## Architecture

### Next.js App Router Structure

This application uses the modern **Next.js App Router** (not Pages Router) with a clear separation between server and client components:

```
app/
├── layout.tsx           # Root layout with global styles
├── page.tsx             # Home page (redirects to /login)
├── globals.css          # Tailwind CSS styles
├── login/
│   └── page.tsx         # Client component: Login page
├── dashboard/
│   └── page.tsx         # Client component: Main dashboard with CRUD UI
└── api/
    ├── auth/
    │   ├── login/route.ts    # POST: Login authentication
    │   ├── logout/route.ts   # POST: Logout
    │   └── check/route.ts    # GET: Check auth status
    └── employees/
        ├── route.ts          # GET: List all | POST: Create
        └── [id]/route.ts     # PUT: Update | DELETE: Delete
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
- Database schema defined in `prisma/schema.prisma` (provider = "sqlite", url = "file:./dev.db")
- Database utility layer in `lib/db.ts` provides type-safe CRUD operations
- Initial seed data in `scripts/migrate-data.ts` (10 employee records) - loaded via `npm run migrate-data`
- CRUD operations handled via API routes (`app/api/employees/`) using Prisma client
- **Auto-incrementing IDs**: SQLite handles ID generation automatically (do not manually specify IDs)
- **Data integrity**: Unique email constraint enforced at database level with indexes on `email` and `lastName`
- **Date serialization**: Dates stored as `DateTime` type in Prisma, serialized to `YYYY-MM-DD` format in API responses via `serializeEmployee()` helper in `lib/db.ts`
- **Prisma singleton pattern**: Uses global singleton in development to prevent multiple client instances (see `globalForPrisma` pattern in `lib/db.ts`)
- **Field mappings**: Database uses snake_case (`first_name`, `last_name`, `created_at`, `updated_at`) while TypeScript uses camelCase via Prisma `@map()` directive
- **Timestamps**: `createdAt` and `updatedAt` are automatically managed by Prisma

### Component Architecture

**Client vs Server Components**:
- Pages that need interactivity are marked with `'use client'` directive (e.g., `app/dashboard/page.tsx`, `app/login/page.tsx`)
- API routes run on the server only
- Components in `/components` directory are client components for forms and tables
- UI primitives in `/components/ui` (button, table, input, dropdown-menu) - shadcn/ui style components

```
Dashboard Page (Client Component)
├── Header (add button + logout)
├── Table (employee list with edit/delete actions)
├── AddEmployee (form for creating new employee)
└── EditEmployee (form for updating existing employee)

Alternative: employees-table/page.tsx
├── Uses data-table.tsx (reusable table component)
└── Uses employee-columns.tsx (column definitions)
```

**Component Patterns**:
- Forms use controlled components with `useState` for form data
- SweetAlert2 used for confirmation dialogs and success/error messages
- API calls made with `fetch()` to `/api/employees` endpoints
- Table components handle inline edit/delete actions

### State Management

Uses **React hooks** (useState, useEffect) for client-side state:
- Dashboard manages view modes (`isAdding`, `isEditing`)
- Employee data fetched from API on mount
- No Redux or Context API needed for this scale

### Styling

**Tailwind CSS** for modern, utility-first styling:
- Configuration in `tailwind.config.ts`
- Global styles in `app/globals.css`
- Responsive design with gradient backgrounds and hover effects

### TypeScript

Fully typed with TypeScript:
- Type definitions in `lib/types.ts`
- Strict mode enabled in `tsconfig.json`
- Interface for Employee and AuthState

## Common Development Patterns

### Adding New Employee Fields

When adding a new field to the Employee model, follow these steps in order:

1. Update `Employee` model in `prisma/schema.prisma`:
   ```prisma
   model Employee {
     // ... existing fields
     department String @default("Engineering")
   }
   ```
2. Run `npm run db:push` to update database schema (regenerates Prisma client types)
3. Update `Employee` interface in `lib/types.ts`:
   ```typescript
   export interface Employee {
     // ... existing fields
     department: string;
   }
   ```
4. Update `serializeEmployee()` function in `lib/db.ts` to include the new field
5. Update seed data in `lib/data.ts` and `scripts/migrate-data.ts` with sample values
6. Add form inputs in `components/AddEmployee.tsx` and `components/EditEmployee.tsx`
7. Add table column in `components/Table.tsx` or update `employee-columns.tsx`
8. Update API route validation in `app/api/employees/route.ts` and `app/api/employees/[id]/route.ts` if field is required

### Modifying API Routes

All API routes follow Next.js App Router conventions:
- **GET/POST**: Export from `route.ts` (e.g., `/api/employees/route.ts`)
- **PUT/DELETE**: Use dynamic routes with `[id]` (e.g., `/api/employees/[id]/route.ts`)
- **IMPORTANT - Next.js 15**: Dynamic route params are now async. Must await params:
  ```typescript
  export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;  // Must await!
    const employeeId = parseInt(id);
    // ... rest of handler
  }
  ```
- Authentication checked via `isAuthenticated()` helper (checks for `auth_token` cookie)
- Use `NextRequest` and `NextResponse` for typed request/response handling
- Database operations use functions from `lib/db.ts` (getAllEmployees, createEmployee, etc.)
- **Prisma error codes handled**:
  - `P2002`: Unique constraint violation (duplicate email) → 409 Conflict with `{ error: 'Email already exists.' }`
  - `P2025`: Record not found → 404 Not Found with `{ error: 'Employee not found' }`
- **Required field validation**: All employee fields (firstName, lastName, email, salary, date) are required → 400 Bad Request if missing
- **Example API route pattern**:
  ```typescript
  export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const data = await request.json();

      // Validate required fields
      if (!data.firstName || !data.lastName || !data.email || !data.salary || !data.date) {
        return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
      }

      const employee = await createEmployee(data);
      return NextResponse.json(employee, { status: 201 });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Email already exists.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
    }
  }
  ```

### Adding New Pages

1. Create `page.tsx` in appropriate `app/` subdirectory
2. Add `'use client'` if page needs client-side interactivity
3. Update middleware matcher if page requires authentication
4. Import types from `lib/types.ts`

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
├── app/                    # Next.js App Router
│   ├── api/               # API route handlers
│   ├── dashboard/         # Dashboard page
│   ├── login/            # Login page
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home (redirects)
│   └── globals.css       # Global styles
├── components/            # Reusable React components
├── lib/                   # Shared utilities and types
│   ├── auth.ts           # Authentication helpers
│   ├── data.ts           # Seed data (for migration script)
│   ├── db.ts             # Prisma client singleton & database utilities
│   └── types.ts          # TypeScript types
├── prisma/                # Prisma ORM configuration
│   └── schema.prisma     # Database schema definition
├── scripts/               # Utility scripts
│   └── migrate-data.ts   # Database seeding script
├── middleware.ts          # Next.js middleware for auth
├── next.config.ts         # Next.js configuration
├── tailwind.config.ts     # Tailwind CSS config
└── tsconfig.json          # TypeScript config
```

## Database Setup

### First-Time Setup

1. **Push database schema:**
   ```bash
   npm run db:push
   ```
   This creates the SQLite database file (`prisma/dev.db`) and applies the schema.

2. **Seed initial data:**
   ```bash
   npm run migrate-data
   ```
   This populates the database with 10 sample employee records.

3. **Start Next.js development server:**
   ```bash
   npm run dev
   ```

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

- **Mock authentication**: Uses hardcoded credentials (admin@example.com / qwerty) defined in `lib/auth.ts`
- **Development database**: SQLite is suitable for development but consider PostgreSQL/MySQL for production
- **No password hashing**: Plain text password comparison in `validateCredentials()`
- **HTTP-only cookies**: `auth_token` cookie used for session management (more secure than localStorage)
- For production:
  - Migrate to production database (PostgreSQL, MySQL, etc.) by updating `prisma/schema.prisma` provider
  - Use `DATABASE_URL` environment variable in deployment platform
  - Implement proper password hashing (bcrypt)
  - Consider JWT/sessions for authentication tokens
  - Add CSRF protection
  - Enable secure cookie flags in production
  - Update database connection in deployment settings

## Key Technical Constraints

- **Database file location**: `prisma/dev.db` is gitignored - must run `npm run db:push` and `npm run migrate-data` on fresh clones
- **Unique email enforcement**: Email field has unique constraint at database level - duplicate emails will trigger `P2002` Prisma error
- **Date format**: Frontend expects dates in `YYYY-MM-DD` format (ISO date string split on 'T'), not full ISO timestamps
- **ID generation**: Do not manually specify IDs when creating employees - SQLite auto-increments
- **Prisma client regeneration**: Run `npm run db:push` after any `schema.prisma` changes to regenerate Prisma client types

## Troubleshooting

### "PrismaClient is unable to run in this browser environment"
- This error occurs when Prisma client is imported in client components
- Solution: Only import Prisma client in API routes or server components
- Use API routes as the bridge between client components and database

### "Cannot find module '@prisma/client'"
- Run `npm install` to install dependencies
- Run `npm run db:push` to generate Prisma client
- Check that `node_modules/.prisma/client` exists

### "Table 'employees' does not exist"
- Database file doesn't exist or schema not applied
- Run `npm run db:push` to create database and apply schema
- Run `npm run migrate-data` to seed initial data

### Authentication not working / Always redirected to login
- Check that `auth_token` cookie is being set in `/api/auth/login/route.ts`
- Verify middleware is not blocking authenticated routes incorrectly
- Check browser dev tools → Application → Cookies for `auth_token`
- Ensure credentials match `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `lib/auth.ts`

### "P2002: Unique constraint failed on email"
- Email already exists in database
- Use Prisma Studio (`npm run db:studio`) to check existing records
- Implement duplicate email check before insert, or handle 409 error gracefully

### Changes to schema.prisma not reflecting in code
- Run `npm run db:push` to regenerate Prisma client
- Restart TypeScript server in IDE (VS Code: Cmd/Ctrl + Shift + P → "Restart TypeScript Server")
- Check that types are imported from `@prisma/client` and `lib/types.ts`
