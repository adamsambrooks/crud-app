# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a modern employee management CRUD (Create, Read, Update, Delete) application built with **Next.js 15** using the **App Router**. It demonstrates full-stack CRUD operations with server-side authentication, API routes, and file-based data persistence.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server with Turbopack (runs on http://localhost:3000)
npm run dev

# Create production build
npm run build

# Start production server
npm start

# Run linter
npm run lint
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

**File-based storage** instead of localStorage:
- Employee data stored in `/data/employees.json` (server-side)
- Initial seed data in `lib/data.ts` (10 employee records)
- CRUD operations handled via API routes (`app/api/employees/`)
- **Fixed ID generation**: Uses `Math.max(...employees.map(e => e.id)) + 1` to avoid collisions when employees are deleted

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

1. Update `Employee` interface in `lib/types.ts`
2. Update seed data in `lib/data.ts`
3. Add form inputs in `components/AddEmployee.tsx` and `components/EditEmployee.tsx`
4. Add table column in `components/Table.tsx`

### Modifying API Routes

All API routes follow Next.js App Router conventions:
- **GET/POST**: Export from `route.ts` (e.g., `/api/employees/route.ts`)
- **PUT/DELETE**: Use dynamic routes with `[id]` (e.g., `/api/employees/[id]/route.ts`)
- Authentication checked via `isAuthenticated()` helper
- Use `NextRequest` and `NextResponse` for typed request/response handling

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
- **Fixed ID bug**: Proper max ID calculation prevents collisions
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
│   ├── data.ts           # Seed data
│   └── types.ts          # TypeScript types
├── data/                  # Runtime data storage (gitignored)
├── middleware.ts          # Next.js middleware for auth
├── next.config.ts         # Next.js configuration
├── tailwind.config.ts     # Tailwind CSS config
└── tsconfig.json          # TypeScript config
```

## Security Notes

- **Mock authentication**: Still uses hardcoded credentials (admin@example.com / qwerty)
- **Development only**: File-based storage is not suitable for production
- **No password hashing**: Plain text password comparison
- For production: Use proper database, hash passwords, implement JWT/sessions
