<!-- .github/copilot-instructions.md - guidance for AI coding agents working on this repository -->
# Quick guide for AI coding agents

This repository is a Next.js 15 (App Router) TypeScript CRUD app using Prisma + SQLite and Tailwind. Below are the essential facts and concrete examples that help you be productive immediately.

- Entry points & important files
  - `app/` — Next.js App Router. Server components by default; client components must include `'use client'`.
  - `app/api/` — Backend API routes. See `app/api/employees/route.ts` and `app/api/employees/[id]/route.ts` for patterns.
  - `lib/db.ts` — Prisma client singleton and all DB helpers (getAllEmployees, createEmployee, updateEmployee, deleteEmployee).
  - `lib/auth.ts` — Auth constants and `validateCredentials`. Cookie name: `auth_token`.
  - `prisma/schema.prisma` — Database schema (SQLite provider, `Employee` model).
  - `scripts/migrate-data.ts` — Seed script; run via `npm run migrate-data`.

- How to run & common commands (exact)
  - Install: `npm install`
  - Dev: `npm run dev` (Next.js dev server with Turbopack)
  - Build: `npm run build` and `npm start` for production
  - Prisma: `npm run db:push` (apply schema), `npm run db:studio` (GUI)
  - Seed: `npm run migrate-data`

- API conventions and examples
  - API route handlers return `NextResponse.json(...)` with appropriate status codes.
  - Auth is cookie-based. Every API route checks `request.cookies.get('auth_token')` — return 401 if missing.
  - Prisma error handling: catch error codes `P2002` (unique constraint -> 409) and `P2025` (not found -> 404).
  - Example: POST `/api/employees` validates required fields (`firstName`, `lastName`, `email`, `salary`, `date`) and returns 400 for missing fields.

- Database & types
  - `prisma/schema.prisma` uses `provider = "sqlite"` and file `prisma/dev.db` (gitignored).
  - `lib/types.ts` defines `Employee` shape used throughout; dates are serialized to `YYYY-MM-DD` in `lib/db.ts`.
  - When adding or renaming employee fields: update `schema.prisma` -> `npm run db:push`, update `lib/types.ts`, update `lib/db.ts` serializers, and update `components/AddEmployee.tsx` & `EditEmployee.tsx`.

- Frontend patterns
  - UI components that need client behavior use `'use client'` at the top. See `components/AddEmployee.tsx`, `EditEmployee.tsx`, `Table.tsx` for examples.
  - Fetching: dashboard pages fetch employee lists from `/api/employees` on mount; follow the same shape as `getAllEmployees()`.

- Project-specific conventions
  - Hardcoded dev credentials: `admin@example.com` / `qwerty` (in `lib/auth.ts`). Tests or code changes should preserve or intentionally update this with migration steps.
  - Prisma client uses a global singleton to avoid multiple instances in dev (`lib/db.ts`). Preserve that pattern when adding DB utilities.
  - Dates are stored as `DateTime` in Prisma but returned as `YYYY-MM-DD` strings by DB helpers — frontend expects this format.

- Safety and quick checks for PRs
  - Run `npm run lint` and `npm run dev` locally; ensure `npm run db:push` is run when schema changes.
  - If changing unique fields (email), include a migration plan and handle `P2002` gracefully in API routes.

- Where to look for examples
  - CRUD flow: `app/api/employees/*` + `components/Table.tsx`, `components/AddEmployee.tsx`, `components/EditEmployee.tsx`.
  - Auth flow: `app/api/auth/*`, `middleware.ts`, `lib/auth.ts`.

If anything above is unclear or you want more examples (component-level, end-to-end API examples, or a suggested PR checklist), tell me what to expand and I will iterate.
