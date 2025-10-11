# Product Requirements Document (PRD)
## Employee Management System: Database Migration

**Version:** 1.0
**Date:** October 10, 2025
**Author:** Product Team
**Status:** Draft

---

## 1. Executive Summary

### 1.1 Overview
This PRD outlines the migration of the Employee Management CRUD application from a file-based data persistence layer (`data/employees.json`) to a relational database system. This migration will maintain all existing functionality while providing a production-ready data storage solution with improved reliability, scalability, and data integrity.

### 1.2 Business Objectives
- **Production Readiness**: Transition from prototype file-based storage to production-grade database
- **Data Integrity**: Leverage database constraints and transactions for data consistency
- **Scalability**: Support concurrent users and larger datasets
- **Maintainability**: Simplify data operations with established database patterns
- **Zero Feature Loss**: Maintain exact same user experience and CRUD functionality

### 1.3 Success Criteria
- ✅ All CRUD operations (Create, Read, Update, Delete) work identically to current implementation
- ✅ Existing 10 seed employees migrated successfully
- ✅ No changes required to frontend components or API contracts
- ✅ Authentication and authorization patterns remain unchanged
- ✅ Application startup and response times remain under 500ms for operations
- ✅ Zero data loss during migration
- ✅ Backward compatibility maintained for development workflow

---

## 2. Current State Analysis

### 2.1 Current Architecture
```
┌─────────────────────────────────────────────────────┐
│                  Frontend (Client)                  │
│              Dashboard Components                   │
│       (AddEmployee, EditEmployee, Table)           │
└───────────────────┬─────────────────────────────────┘
                    │ HTTP API Calls
                    ▼
┌─────────────────────────────────────────────────────┐
│              Next.js API Routes                     │
│  /api/employees (GET, POST)                        │
│  /api/employees/[id] (PUT, DELETE)                 │
└───────────────────┬─────────────────────────────────┘
                    │ File I/O (fs.promises)
                    ▼
┌─────────────────────────────────────────────────────┐
│            File-Based Storage                       │
│         data/employees.json                         │
│     (JSON array of employee objects)                │
└─────────────────────────────────────────────────────┘
```

### 2.2 Current Data Model
```typescript
interface Employee {
  id: number;           // Auto-generated: Math.max(...ids) + 1
  firstName: string;    // Required
  lastName: string;     // Required
  email: string;        // Required
  salary: string;       // Required (stored as string)
  date: string;         // Required (hire date, YYYY-MM-DD format)
}
```

### 2.3 Current CRUD Operations

**Location:** `app/api/employees/route.ts` and `app/api/employees/[id]/route.ts`

| Operation | Method | Endpoint | Current Implementation |
|-----------|--------|----------|----------------------|
| List All | GET | `/api/employees` | Read entire JSON file |
| Create | POST | `/api/employees` | Read file → append → write file |
| Update | PUT | `/api/employees/[id]` | Read file → find & update → write file |
| Delete | DELETE | `/api/employees/[id]` | Read file → filter → write file |

### 2.4 Current Limitations
- **Concurrency**: File writes are not atomic; race conditions possible
- **Scalability**: Entire dataset loaded into memory for every operation
- **Data Integrity**: No constraints on duplicate emails or invalid data
- **Backup/Recovery**: Manual file backup only
- **Query Performance**: O(n) linear search for all operations
- **Production Suitability**: Not recommended for multi-user production environments

---

## 3. Proposed Solution

### 3.1 Target Architecture
```
┌─────────────────────────────────────────────────────┐
│                  Frontend (Client)                  │
│              Dashboard Components                   │
│       (AddEmployee, EditEmployee, Table)           │
│                  (NO CHANGES)                       │
└───────────────────┬─────────────────────────────────┘
                    │ HTTP API Calls (same contract)
                    ▼
┌─────────────────────────────────────────────────────┐
│              Next.js API Routes                     │
│  /api/employees (GET, POST)                        │
│  /api/employees/[id] (PUT, DELETE)                 │
│              (REFACTORED)                           │
└───────────────────┬─────────────────────────────────┘
                    │ Database Queries (SQL/ORM)
                    ▼
┌─────────────────────────────────────────────────────┐
│           Database Abstraction Layer                │
│      (Prisma ORM / Drizzle / Raw SQL)              │
└───────────────────┬─────────────────────────────────┘
                    │ Connection Pool
                    ▼
┌─────────────────────────────────────────────────────┐
│         PostgreSQL Database                         │
│         Table: employees                            │
│    (ACID transactions, constraints, indexes)        │
└─────────────────────────────────────────────────────┘
```

### 3.2 Database Technology Options

#### 3.2.1 Recommended: PostgreSQL + Prisma ORM
**Pros:**
- Industry-standard relational database
- Excellent TypeScript support via Prisma
- Built-in migrations and schema management
- Type-safe database queries
- Easy local development (via Docker)
- Free hosting options (Vercel Postgres, Supabase, Neon)

**Cons:**
- Requires external service or Docker for local dev
- Slightly more complex setup than SQLite

#### 3.2.2 Alternative: SQLite + Better-SQLite3
**Pros:**
- Zero-config embedded database
- Perfect for prototypes and small deployments
- File-based like current solution but with SQL benefits
- No external dependencies

**Cons:**
- Limited concurrency support
- Not ideal for production multi-user scenarios
- Harder to scale to cloud environments

#### 3.2.3 Recommendation
**PostgreSQL with Prisma ORM** for the following reasons:
- Clear production migration path
- Excellent Next.js integration
- Type-safe database operations
- Built-in migration tooling
- Industry best practices

---

## 4. Technical Specifications

### 4.1 Database Schema

#### 4.1.1 Employees Table
```sql
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,                    -- Auto-incrementing integer
  first_name VARCHAR(100) NOT NULL,         -- Required, max 100 chars
  last_name VARCHAR(100) NOT NULL,          -- Required, max 100 chars
  email VARCHAR(255) NOT NULL UNIQUE,       -- Required, unique constraint
  salary VARCHAR(20) NOT NULL,              -- Stored as string to match current behavior
  date DATE NOT NULL,                       -- Hire date
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Audit field
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP   -- Audit field
);

-- Indexes for performance
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_last_name ON employees(last_name);
```

#### 4.1.2 Prisma Schema Equivalent
```prisma
model Employee {
  id        Int      @id @default(autoincrement())
  firstName String   @map("first_name") @db.VarChar(100)
  lastName  String   @map("last_name") @db.VarChar(100)
  email     String   @unique @db.VarChar(255)
  salary    String   @db.VarChar(20)
  date      DateTime @db.Date
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at")

  @@index([email])
  @@index([lastName])
  @@map("employees")
}
```

### 4.2 API Route Refactoring

#### 4.2.1 New Database Utility Layer
**File:** `lib/db.ts`
```typescript
import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma client
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Helper functions matching current file-based API
export async function getAllEmployees() {
  return await prisma.employee.findMany({
    orderBy: { id: 'asc' }
  });
}

export async function getEmployeeById(id: number) {
  return await prisma.employee.findUnique({
    where: { id }
  });
}

export async function createEmployee(data: Omit<Employee, 'id'>) {
  return await prisma.employee.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      salary: data.salary,
      date: new Date(data.date)
    }
  });
}

export async function updateEmployee(id: number, data: Omit<Employee, 'id'>) {
  return await prisma.employee.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      salary: data.salary,
      date: new Date(data.date)
    }
  });
}

export async function deleteEmployee(id: number) {
  return await prisma.employee.delete({
    where: { id }
  });
}
```

#### 4.2.2 Refactored API Routes

**Before (File-Based):**
```typescript
// app/api/employees/route.ts
export async function GET(request: NextRequest) {
  const employees = await readEmployees();  // Read JSON file
  return NextResponse.json(employees);
}
```

**After (Database):**
```typescript
// app/api/employees/route.ts
export async function GET(request: NextRequest) {
  const employees = await getAllEmployees();  // Query database
  return NextResponse.json(employees);
}
```

**Key Changes:**
- Replace `readEmployees()` → `getAllEmployees()`
- Replace `writeEmployees()` → Database mutations
- Remove file I/O imports (`fs`, `path`)
- Add database utility imports (`lib/db`)
- Keep all validation logic identical
- Keep all error responses identical
- Keep authentication checks unchanged

### 4.3 Data Serialization

**Challenge:** Database returns `Date` objects, but API should return ISO strings to match current behavior.

**Solution:** Add serialization layer
```typescript
function serializeEmployee(employee: Employee): Employee {
  return {
    ...employee,
    date: employee.date instanceof Date
      ? employee.date.toISOString().split('T')[0]  // YYYY-MM-DD
      : employee.date
  };
}
```

---

## 5. Implementation Plan

### 5.1 Phase 1: Database Setup & Configuration

#### Tasks:
1. **Install Dependencies**
   ```bash
   npm install @prisma/client
   npm install -D prisma
   ```

2. **Initialize Prisma**
   ```bash
   npx prisma init
   ```
   This creates:
   - `prisma/schema.prisma` (schema definition)
   - `.env` file (database connection string)

3. **Configure Database Connection**
   Add to `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/crud_app_dev?schema=public"
   ```

4. **Define Schema**
   Create the Employee model in `prisma/schema.prisma` as specified in §4.1.2

5. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

6. **Create Database & Tables**
   ```bash
   npx prisma db push
   ```

**Deliverables:**
- ✅ Prisma configured
- ✅ Database connection established
- ✅ `employees` table created
- ✅ TypeScript types generated

**Estimated Time:** 2-3 hours

---

### 5.2 Phase 2: Database Utility Layer

#### Tasks:
1. **Create `lib/db.ts`**
   - Implement Prisma singleton (§4.2.1)
   - Create helper functions for all CRUD operations
   - Add proper TypeScript types
   - Include error handling

2. **Create Migration Script**
   Create `scripts/migrate-data.ts`:
   ```typescript
   import { prisma } from '../lib/db';
   import { employeesData } from '../lib/data';

   async function main() {
     console.log('Starting data migration...');

     for (const employee of employeesData) {
       await prisma.employee.create({
         data: {
           firstName: employee.firstName,
           lastName: employee.lastName,
           email: employee.email,
           salary: employee.salary,
           date: new Date(employee.date)
         }
       });
     }

     console.log(`Migrated ${employeesData.length} employees successfully`);
   }

   main()
     .catch(console.error)
     .finally(() => prisma.$disconnect());
   ```

3. **Add Script to package.json**
   ```json
   "scripts": {
     "migrate-data": "tsx scripts/migrate-data.ts",
     "db:push": "prisma db push",
     "db:studio": "prisma studio"
   }
   ```

**Deliverables:**
- ✅ Database utility layer implemented
- ✅ Migration script created
- ✅ Seed data loaded into database
- ✅ Helper functions tested

**Estimated Time:** 3-4 hours

---

### 5.3 Phase 3: API Route Refactoring

#### Tasks:
1. **Refactor `/api/employees/route.ts`**
   - Replace file I/O with database queries
   - Keep validation logic identical
   - Maintain same response structure
   - Add database error handling

2. **Refactor `/api/employees/[id]/route.ts`**
   - Replace file operations with database mutations
   - Handle unique constraint violations (duplicate email)
   - Maintain same error messages
   - Keep authentication checks unchanged

3. **Update Error Handling**
   Map database errors to appropriate HTTP responses:
   - `P2002` (unique constraint) → `409 Conflict`
   - `P2025` (record not found) → `404 Not Found`
   - General errors → `500 Internal Server Error`

**Deliverables:**
- ✅ All API routes refactored
- ✅ Same API contracts maintained
- ✅ Error handling improved
- ✅ No breaking changes to frontend

**Estimated Time:** 4-5 hours

---

### 5.4 Phase 4: Testing & Validation

#### Tasks:
1. **Manual Testing Checklist**
   - [ ] List all employees (GET /api/employees)
   - [ ] Create new employee (POST /api/employees)
   - [ ] Update employee (PUT /api/employees/[id])
   - [ ] Delete employee (DELETE /api/employees/[id])
   - [ ] Test validation errors (missing fields)
   - [ ] Test duplicate email constraint
   - [ ] Test authentication on all routes
   - [ ] Test with empty database
   - [ ] Test ID generation after deletions

2. **Data Integrity Verification**
   - Verify all 10 seed employees present
   - Verify data types match (salary as string)
   - Verify date format (YYYY-MM-DD)
   - Compare API responses with previous file-based responses

3. **Performance Testing**
   - Measure API response times
   - Compare with file-based system
   - Ensure < 500ms for all operations

4. **Frontend Validation**
   - No changes required to components
   - All CRUD operations work from UI
   - Error messages display correctly

**Deliverables:**
- ✅ All manual tests passed
- ✅ Data integrity verified
- ✅ Performance acceptable
- ✅ Frontend unchanged and working

**Estimated Time:** 3-4 hours

---

### 5.5 Phase 5: Documentation & Cleanup

#### Tasks:
1. **Update CLAUDE.md**
   - Document new database architecture
   - Update "Data Persistence" section
   - Add database setup instructions
   - Include migration commands

2. **Update README.md**
   - Add database prerequisites
   - Document environment variables
   - Include setup instructions for new developers

3. **Clean Up**
   - Mark `lib/data.ts` as deprecated (keep for reference)
   - Remove `data/employees.json` from usage (keep file-based code as fallback if needed)
   - Update `.gitignore` to exclude `.env` files

4. **Create Rollback Plan**
   Document how to revert to file-based system if needed

**Deliverables:**
- ✅ Documentation updated
- ✅ Cleanup completed
- ✅ Rollback plan documented

**Estimated Time:** 2-3 hours

---

## 6. Migration Strategy

### 6.1 Development Environment Migration

**Steps:**
1. Set up local PostgreSQL database (Docker or native)
2. Run Prisma migrations to create schema
3. Execute data migration script to seed database
4. Test all CRUD operations locally
5. Verify with Prisma Studio (`npx prisma studio`)

**Timeline:** Day 1-2

### 6.2 Production Migration (if applicable)

**Pre-Migration:**
- Set up production database (e.g., Vercel Postgres, Supabase)
- Configure production environment variables
- Test database connection from deployment environment

**Migration Steps:**
1. Deploy schema to production database
2. Run migration script with production data
3. Deploy updated Next.js application
4. Monitor for errors
5. Keep file-based backup for 7 days

**Rollback Plan:**
- Revert API routes to file-based implementation
- Restore `data/employees.json` from backup
- Redeploy previous version

**Timeline:** Day 3-4 (with monitoring period)

---

## 7. Risk Analysis & Mitigation

### 7.1 Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss during migration | Low | High | Backup JSON file before migration; dry-run migration script |
| API contract breaking changes | Low | High | Thorough testing; maintain same response structure |
| Database connection issues | Medium | Medium | Connection pooling; graceful error handling; fallback to file-based |
| Performance degradation | Low | Medium | Add database indexes; monitor query performance |
| Deployment complexity | Medium | Low | Document setup thoroughly; provide Docker Compose for local dev |
| Cost of hosted database | Low | Medium | Start with free tier (Vercel Postgres 256MB free) |

### 7.2 Rollback Triggers
- Any CRUD operation fails
- Data integrity issues detected
- Performance > 2x slower than file-based
- Database connection stability issues

---

## 8. Dependencies & Prerequisites

### 8.1 Technical Dependencies
- **Node.js**: 18+ (already met)
- **PostgreSQL**: 13+ (new requirement)
- **Prisma**: ^5.0.0 (new dependency)
- **Environment Variables**: DATABASE_URL (new requirement)

### 8.2 Development Environment
- **Local Database**: PostgreSQL via Docker or native installation
- **Docker Compose** (optional): For easy local database setup
- **Prisma Studio**: For database GUI during development

### 8.3 Deployment Environment
- **Database Host**: Vercel Postgres, Supabase, Neon, or similar
- **Environment Variables**: Configured in deployment platform
- **Database Connection Pooling**: Enabled for production

---

## 9. Success Metrics

### 9.1 Functional Requirements
- ✅ All 5 CRUD operations work identically to file-based system
- ✅ Authentication and authorization unchanged
- ✅ Frontend components require zero modifications
- ✅ API response structure identical
- ✅ Error handling matches current behavior

### 9.2 Non-Functional Requirements
- ✅ API response time < 500ms for all operations
- ✅ Support 10+ concurrent users without data corruption
- ✅ Database connection pool handles traffic gracefully
- ✅ Deployment process documented and tested
- ✅ Developer onboarding updated

### 9.3 Data Requirements
- ✅ All 10 seed employees migrated
- ✅ Email uniqueness enforced at database level
- ✅ Data types preserved (salary as string)
- ✅ Date format consistent (YYYY-MM-DD)

---

## 10. Out of Scope

The following items are explicitly **NOT** included in this migration:

- ❌ User authentication database migration (remains cookie-based with hardcoded credentials)
- ❌ Password hashing or JWT implementation
- ❌ Multi-tenancy or organization support
- ❌ Audit logs or change tracking (beyond created_at/updated_at)
- ❌ Database backups and disaster recovery setup
- ❌ GraphQL API layer
- ❌ Real-time updates via WebSockets
- ❌ Data export features
- ❌ Advanced search or filtering
- ❌ Pagination (all employees returned in one request)

---

## 11. Future Enhancements

**Post-Migration Opportunities:**
1. **User Management**: Move auth to database with proper password hashing
2. **Pagination**: Add limit/offset to employee list endpoint
3. **Search & Filter**: Add query parameters for filtering employees
4. **Audit Logs**: Track who modified what and when
5. **Soft Deletes**: Keep deleted records for compliance
6. **Data Export**: CSV/Excel export functionality
7. **Bulk Operations**: Import multiple employees at once
8. **Data Validation**: Add database-level check constraints

---

## 12. Appendix

### 12.1 Example Docker Compose for Local Development
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: crud_user
      POSTGRES_PASSWORD: crud_password
      POSTGRES_DB: crud_app_dev
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Usage:**
```bash
docker-compose up -d      # Start database
npm run db:push           # Create schema
npm run migrate-data      # Seed data
```

### 12.2 Updated Development Commands
```bash
# Database Management
npm run db:push           # Push schema changes to database
npm run db:studio         # Open Prisma Studio (database GUI)
npm run migrate-data      # Run data migration from JSON to DB

# Existing Commands (unchanged)
npm run dev               # Start Next.js dev server
npm run build             # Create production build
npm start                 # Start production server
npm run lint              # Run ESLint
```

### 12.3 Environment Variables Reference
```env
# .env.local (development)
DATABASE_URL="postgresql://crud_user:crud_password@localhost:5432/crud_app_dev?schema=public"

# .env.production (Vercel or similar)
DATABASE_URL="postgresql://user:pass@host:5432/prod_db?schema=public&connection_limit=5"
```

### 12.4 File Changes Summary

**New Files:**
- `prisma/schema.prisma` - Database schema definition
- `lib/db.ts` - Database utility functions
- `scripts/migrate-data.ts` - One-time migration script
- `.env.local` - Local environment variables (gitignored)
- `docker-compose.yml` - Optional local database setup

**Modified Files:**
- `app/api/employees/route.ts` - Replace file I/O with DB queries
- `app/api/employees/[id]/route.ts` - Replace file I/O with DB mutations
- `CLAUDE.md` - Update architecture documentation
- `README.md` - Add database setup instructions
- `package.json` - Add database-related scripts

**Deprecated (Not Deleted):**
- `lib/data.ts` - Keep as reference for seed data
- `data/employees.json` - No longer used at runtime

**Unchanged:**
- All files in `components/` directory
- All files in `app/dashboard/` and `app/login/`
- `lib/types.ts` (Employee interface unchanged)
- `lib/auth.ts` (Authentication unchanged)
- `middleware.ts` (Route protection unchanged)

---

## 13. Questions & Answers

**Q: Why PostgreSQL instead of MySQL?**
A: Better Next.js ecosystem support, excellent Prisma integration, and superior JSON/array handling for future features.

**Q: Do we need to change the frontend?**
A: No. The API contract remains identical, so no frontend changes required.

**Q: What happens if the database connection fails?**
A: API routes will return 500 errors. Consider adding a fallback to file-based storage for development resilience.

**Q: Can we still use the seed data from `lib/data.ts`?**
A: Yes, the migration script will read from that file and populate the database. It remains the single source of truth for seed data.

**Q: How do we handle database schema changes in the future?**
A: Use Prisma migrations: `npx prisma migrate dev --name describe_change`. This creates versioned SQL migration files.

**Q: Is this compatible with serverless deployments (Vercel)?**
A: Yes, Prisma works excellently with Vercel. Use connection pooling and ensure DATABASE_URL is configured in Vercel environment variables.

---

## 14. Sign-Off

**Product Owner:** ___________________ Date: ___________
**Engineering Lead:** ___________________ Date: ___________
**QA Lead:** ___________________ Date: ___________

---

**Document Version History:**
- v1.0 (2025-10-10): Initial draft covering full migration from file-based to PostgreSQL with Prisma
