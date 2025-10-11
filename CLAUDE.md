# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a modern employee management CRUD (Create, Read, Update, Delete) application built with **Next.js 15** using the **App Router**. It demonstrates full-stack CRUD operations with server-side authentication, API routes, and **SQLite database** persistence via Prisma ORM.

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
- Database schema defined in `prisma/schema.prisma`
- Database utility layer in `lib/db.ts` provides type-safe CRUD operations
- Initial seed data in `scripts/migrate-data.ts` (10 employee records) - loaded via `npm run migrate-data`
- CRUD operations handled via API routes (`app/api/employees/`) using Prisma client
- **Auto-incrementing IDs**: SQLite handles ID generation automatically
- **Data integrity**: Unique email constraint enforced at database level
- **Date serialization**: Dates stored as DateTime type, serialized to YYYY-MM-DD for API responses
- **Prisma singleton pattern**: Uses global singleton in development to prevent multiple client instances

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

1. Update `Employee` model in `prisma/schema.prisma`
2. Run `npm run db:push` to update database schema
3. Update `Employee` interface in `lib/types.ts`
4. Update database utility functions in `lib/db.ts` (if needed)
5. Update seed data in `lib/data.ts` and `scripts/migrate-data.ts`
6. Add form inputs in `components/AddEmployee.tsx` and `components/EditEmployee.tsx`
7. Add table column in `components/Table.tsx`

### Modifying API Routes

All API routes follow Next.js App Router conventions:
- **GET/POST**: Export from `route.ts` (e.g., `/api/employees/route.ts`)
- **PUT/DELETE**: Use dynamic routes with `[id]` (e.g., `/api/employees/[id]/route.ts`)
- Authentication checked via `isAuthenticated()` helper
- Use `NextRequest` and `NextResponse` for typed request/response handling
- Database operations use functions from `lib/db.ts` (getAllEmployees, createEmployee, etc.)
- Prisma error codes handled:
  - `P2002`: Unique constraint violation (duplicate email) → 409 Conflict
  - `P2025`: Record not found → 404 Not Found

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

- **Mock authentication**: Still uses hardcoded credentials (admin@example.com / qwerty)
- **Development database**: SQLite is suitable for development but consider PostgreSQL/MySQL for production
- **No password hashing**: Plain text password comparison for auth
- For production:
  - Migrate to production database (PostgreSQL, MySQL, etc.) by updating `prisma/schema.prisma` provider
  - Use `DATABASE_URL` environment variable in deployment platform
  - Implement proper password hashing (bcrypt)
  - Consider JWT/sessions for authentication tokens
  - Update database connection in deployment settings
