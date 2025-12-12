# PRD: Remove Legacy Fields from Employee CRUD Interface

## Document Information
- **Created**: October 13, 2025
- **Status**: Draft
- **Priority**: High
- **Type**: Bug Fix / Schema Synchronization

## Problem Statement

The Next.js application frontend code is out of sync with the PostgreSQL database schema. The TypeScript interface, forms, API routes, and database utilities reference two fields (`salary` and `date`) that **do not exist** in the actual `employees` table in Supabase PostgreSQL.

### Current Database Schema
The `employees` table (as defined in [prisma/schema.prisma:61-82](prisma/schema.prisma#L61-L82)) contains:
```prisma
model Employee {
  id           Int       @id @default(autoincrement())
  name         String?   @db.VarChar(255) // Legacy field
  email        String?   @db.VarChar(255)
  active       Int?      @db.SmallInt
  startDate    DateTime? @map("start_date") @db.Date
  employeeSpId Int       @default(0) @map("employee_sp_id")
  lastName     String?   @map("last_name") @db.VarChar(255)
  firstName    String?   @map("first_name") @db.VarChar(255)
  payType      String?   @map("pay_type") @db.VarChar(100)
  gustoId      String?   @map("gusto_id") @db.VarChar(100)

  // Relationships omitted for brevity
}
```

**Key Observations**:
- ❌ No `salary` field exists
- ❌ No `date` field exists
- ✅ `startDate` field exists (mapped to `start_date` in database)
- ✅ Production table has 83 employee records

### Current Application Code
The application code incorrectly references these non-existent fields in 12+ files:

| **File** | **Issue** | **Lines** |
|----------|-----------|-----------|
| [lib/types.ts:6-7](lib/types.ts#L6-L7) | TypeScript interface defines `salary` and `date` | 6-7 |
| [lib/db.ts:20-23](lib/db.ts#L20-L23) | `serializeEmployee()` returns `salary` and `date` | 20-23 |
| [lib/db.ts:54-55](lib/db.ts#L54-L55) | `createEmployee()` attempts to write `salary`/`date` to DB | 54-55 |
| [lib/db.ts:75-76](lib/db.ts#L75-L76) | `updateEmployee()` attempts to write `salary`/`date` to DB | 75-76 |
| [components/AddEmployee.tsx:15-16](components/AddEmployee.tsx#L15-L16) | Form state for `salary` and `date` | 15-16 |
| [components/AddEmployee.tsx:40-41](components/AddEmployee.tsx#L40-L41) | Sends `salary`/`date` in API request | 40-41 |
| [components/AddEmployee.tsx:121-144](components/AddEmployee.tsx#L121-L144) | Form inputs for `salary` ($) and `date` | 121-144 |
| [components/EditEmployee.tsx:17-18](components/EditEmployee.tsx#L17-L18) | Form state initialized from `employee.salary`/`date` | 17-18 |
| [components/EditEmployee.tsx:42-43](components/EditEmployee.tsx#L42-L43) | Sends `salary`/`date` in API request | 42-43 |
| [components/EditEmployee.tsx:123-146](components/EditEmployee.tsx#L123-L146) | Form inputs for `salary` ($) and `date` | 123-146 |
| [components/Table.tsx:22-23](components/Table.tsx#L22-L23) | Table columns for "Salary" and "Date" | 22-23 |
| [components/Table.tsx:37-38](components/Table.tsx#L37-L38) | Table cells display `employee.salary`/`date` | 37-38 |
| [components/employee-columns.tsx:81-124](components/employee-columns.tsx#L81-L124) | TanStack Table column definitions with sorting | 81-124 |
| [app/api/employees/route.ts:41-42](app/api/employees/route.ts#L41-L42) | POST route validates `salary` and `date` | 41-42 |
| [app/api/employees/[id]/route.ts:28-29](app/api/employees/[id]/route.ts#L28-L29) | PUT route validates `salary` and `date` | 28-29 |

### Impact
1. **Runtime Errors**: Prisma will throw errors when attempting to read/write non-existent fields
2. **Data Loss**: Form submissions fail silently or cause 500 errors
3. **Validation Failures**: API routes reject valid requests due to incorrect validation
4. **UI Errors**: Tables attempt to display undefined fields
5. **Type Safety Broken**: TypeScript provides false sense of correctness

## Goals

### Primary Goals
1. ✅ Remove all references to `salary` field from application code
2. ✅ Remove all references to `date` field from application code
3. ✅ Ensure CRUD operations work correctly with actual database schema
4. ✅ Maintain application functionality for existing 83 employee records

### Secondary Goals
1. ✅ Update CLAUDE.md documentation to reflect correct schema
2. ✅ Verify no TypeScript compilation errors
3. ✅ Test all CRUD operations (Create, Read, Update, Delete)
4. ✅ Ensure UI displays correctly without missing fields

### Non-Goals
- Adding new fields to replace `salary`/`date` (separate feature request)
- Migrating data from another system
- Changing database schema (schema is correct, code is wrong)

## Solution Design

### Approach
**Remove fields entirely** from all application layers. This is a pure cleanup task—no replacement fields needed since they don't exist in the production database.

### Affected Components

#### 1. TypeScript Type Definitions
**File**: [lib/types.ts](lib/types.ts)

**Before**:
```typescript
export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  salary: string;      // ❌ Remove
  date: string;        // ❌ Remove
  active: boolean;
  payType: 'Hourly' | 'Salary' | 'Pct';
}
```

**After**:
```typescript
export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  active: boolean;
  payType: 'Hourly' | 'Salary' | 'Pct';
}
```

#### 2. Database Utilities
**File**: [lib/db.ts](lib/db.ts)

**Changes Required**:
- Remove `salary` and `date` from `serializeEmployee()` (lines 20-23)
- Remove from `createEmployee()` data object (lines 54-55)
- Remove from `updateEmployee()` data object (lines 75-76)

**Before** (serializeEmployee):
```typescript
function serializeEmployee(employee: any): Employee {
  return {
    id: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    salary: employee.salary,  // ❌ Remove
    date: employee.date instanceof Date
      ? employee.date.toISOString().split('T')[0]
      : employee.date,        // ❌ Remove
    active: employee.active,
    payType: employee.payType,
  };
}
```

**After**:
```typescript
function serializeEmployee(employee: any): Employee {
  return {
    id: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    active: employee.active,
    payType: employee.payType,
  };
}
```

#### 3. API Routes
**Files**:
- [app/api/employees/route.ts](app/api/employees/route.ts) (POST handler)
- [app/api/employees/[id]/route.ts](app/api/employees/[id]/route.ts) (PUT handler)

**Changes Required**:
- Remove `salary` and `date` from validation checks
- Remove from field requirement error messages

**Before** (POST validation):
```typescript
if (
  !newEmployee.firstName ||
  !newEmployee.lastName ||
  !newEmployee.email ||
  !newEmployee.salary ||      // ❌ Remove
  !newEmployee.date ||        // ❌ Remove
  typeof newEmployee.active !== 'boolean' ||
  !newEmployee.payType
) {
  return NextResponse.json(
    { error: 'All fields are required.' },
    { status: 400 }
  );
}
```

**After**:
```typescript
if (
  !newEmployee.firstName ||
  !newEmployee.lastName ||
  !newEmployee.email ||
  typeof newEmployee.active !== 'boolean' ||
  !newEmployee.payType
) {
  return NextResponse.json(
    { error: 'All fields are required.' },
    { status: 400 }
  );
}
```

#### 4. UI Components - Add Form
**File**: [components/AddEmployee.tsx](components/AddEmployee.tsx)

**Changes Required**:
- Remove `salary` and `date` state variables (lines 15-16)
- Remove from validation check (line 23)
- Remove from API request body (lines 40-41)
- Remove form input sections (lines 120-144)

**Before** (state):
```typescript
const [salary, setSalary] = useState('');  // ❌ Remove
const [date, setDate] = useState('');      // ❌ Remove
```

**After**:
```typescript
// Remove both state variables
```

#### 5. UI Components - Edit Form
**File**: [components/EditEmployee.tsx](components/EditEmployee.tsx)

**Changes Required**:
- Remove `salary` and `date` state initialization (lines 17-18)
- Remove from validation check (line 25)
- Remove from API request body (lines 42-43)
- Remove form input sections (lines 122-146)

#### 6. UI Components - Simple Table
**File**: [components/Table.tsx](components/Table.tsx)

**Changes Required**:
- Remove "Salary" table header (line 22)
- Remove "Date" table header (line 23)
- Remove salary display cell (line 37)
- Remove date display cell (line 38)
- Update `colSpan` from 9 to 7 in empty state message (line 75)

#### 7. UI Components - Advanced Table
**File**: [components/employee-columns.tsx](components/employee-columns.tsx)

**Changes Required**:
- Remove entire "salary" column definition (lines 80-103)
- Remove entire "date" column definition (lines 104-124)

### Data Flow Verification

#### Create Employee Flow
1. User fills form → `AddEmployee.tsx` (no salary/date fields)
2. Submit → POST `/api/employees` (no salary/date in body)
3. API validates → `createEmployee()` (no salary/date to Prisma)
4. Prisma inserts → PostgreSQL `employees` table ✅

#### Update Employee Flow
1. User edits form → `EditEmployee.tsx` (no salary/date fields)
2. Submit → PUT `/api/employees/[id]` (no salary/date in body)
3. API validates → `updateEmployee()` (no salary/date to Prisma)
4. Prisma updates → PostgreSQL `employees` table ✅

#### Read Employee Flow
1. Page loads → GET `/api/employees`
2. `getAllEmployees()` → Prisma query
3. `serializeEmployee()` maps fields (no salary/date) ✅
4. Table displays → `Table.tsx` or `employee-columns.tsx` ✅

## Implementation Plan

### Phase 1: Core Data Layer (Priority: Critical)
**Estimated Time**: 15 minutes

1. ✅ Update TypeScript interface in [lib/types.ts:6-7](lib/types.ts#L6-L7)
2. ✅ Update `serializeEmployee()` in [lib/db.ts:14-27](lib/db.ts#L14-L27)
3. ✅ Update `createEmployee()` in [lib/db.ts:46-61](lib/db.ts#L46-L61)
4. ✅ Update `updateEmployee()` in [lib/db.ts:64-89](lib/db.ts#L64-L89)
5. ✅ Run TypeScript check: `npx tsc --noEmit`

### Phase 2: API Layer (Priority: Critical)
**Estimated Time**: 10 minutes

1. ✅ Update POST validation in [app/api/employees/route.ts:37-50](app/api/employees/route.ts#L37-L50)
2. ✅ Update PUT validation in [app/api/employees/[id]/route.ts:24-37](app/api/employees/[id]/route.ts#L24-L37)
3. ✅ Run linter: `npm run lint`

### Phase 3: UI Components (Priority: High)
**Estimated Time**: 20 minutes

1. ✅ Update [components/AddEmployee.tsx](components/AddEmployee.tsx):
   - Remove state variables (lines 15-16)
   - Remove validation (line 23)
   - Remove from request body (lines 40-41)
   - Remove form inputs (lines 120-144)

2. ✅ Update [components/EditEmployee.tsx](components/EditEmployee.tsx):
   - Remove state variables (lines 17-18)
   - Remove validation (line 25)
   - Remove from request body (lines 42-43)
   - Remove form inputs (lines 122-146)

3. ✅ Update [components/Table.tsx](components/Table.tsx):
   - Remove table headers (lines 22-23)
   - Remove table cells (lines 37-38)
   - Fix colSpan (line 75: change 9 → 7)

4. ✅ Update [components/employee-columns.tsx](components/employee-columns.tsx):
   - Remove salary column definition (lines 80-103)
   - Remove date column definition (lines 104-124)

### Phase 4: Testing (Priority: Critical)
**Estimated Time**: 30 minutes

1. ✅ **Compilation Tests**:
   - Run `npm run build` (verify no TypeScript errors)
   - Run `npm run lint` (verify no ESLint warnings)

2. ✅ **Manual CRUD Tests** (via `npm run dev`):
   - Login with `admin@example.com` / `qwerty`
   - Navigate to `/dashboard` (simple table view)
   - Navigate to `/employees-table` (advanced table view)

   **Test Cases**:

   | Test Case | Steps | Expected Result |
   |-----------|-------|-----------------|
   | **Read All** | View employee list | All 83 employees display without errors |
   | **Create** | Click Add → Fill firstName, lastName, email, payType, active → Submit | Employee created successfully, appears in table |
   | **Update** | Click Edit on employee → Modify fields → Submit | Employee updated, changes reflected in table |
   | **Delete** | Click Delete on employee → Confirm | Employee deleted, removed from table |
   | **Table Sorting** | Click column headers in `/employees-table` | Sorting works on remaining columns |
   | **Table Search** | Use global search in `/employees-table` | Search filters employees correctly |
   | **Validation** | Try creating employee with missing fields | Form validation prevents submission |

3. ✅ **Database Verification**:
   - Run `npm run db:studio`
   - Verify employees table has expected columns
   - Verify new/updated records don't have orphaned data

### Phase 5: Documentation (Priority: Medium)
**Estimated Time**: 10 minutes

1. ✅ Update [CLAUDE.md](CLAUDE.md):
   - Remove references to `salary` field in example code
   - Remove references to `date` field in example code
   - Update Employee interface documentation
   - Update API route examples

## Acceptance Criteria

### Functional Requirements
- ✅ User can view all 83 existing employees in both table views
- ✅ User can create new employee with: firstName, lastName, email, payType, active
- ✅ User can edit existing employee (all valid fields)
- ✅ User can delete employee
- ✅ Form validation works correctly (no references to removed fields)
- ✅ No console errors related to undefined fields
- ✅ No API errors (400, 500) when performing CRUD operations

### Technical Requirements
- ✅ `npm run build` completes without errors
- ✅ `npm run lint` shows no errors or warnings
- ✅ `npx tsc --noEmit` shows no type errors
- ✅ No references to `salary` or `date` in Employee-related code
- ✅ All Prisma operations use only existing database columns
- ✅ TypeScript interface matches actual database schema

### Quality Requirements
- ✅ Code follows existing patterns and conventions
- ✅ No breaking changes to existing employee records
- ✅ UI remains visually consistent (no layout issues from removed columns)
- ✅ Documentation updated to reflect changes

## Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Breaking existing code** | Medium | High | Run comprehensive test suite; verify production data unchanged |
| **Missed references to removed fields** | Low | Medium | Use grep to search entire codebase for `salary` and `date` references |
| **TypeScript errors in other files** | Low | Low | Run `npx tsc --noEmit` after each change |
| **UI layout breaks** | Low | Medium | Test both `/dashboard` and `/employees-table` views thoroughly |
| **Production data corruption** | Very Low | Critical | Use `npm run db:push` carefully; verify schema before deployment |

## Rollback Plan

If issues arise post-deployment:

1. **Immediate**: Revert git commit
   ```bash
   git revert HEAD
   git push
   ```

2. **If database affected**:
   - Database schema is **unchanged** (no rollback needed)
   - Only code changes were made

3. **Verification**:
   - Run `npm run build && npm run start`
   - Verify CRUD operations work

## Dependencies

### Technical Dependencies
- Next.js 15 App Router (installed)
- Prisma ORM (installed)
- Supabase PostgreSQL database (connected)
- TypeScript 5.x (installed)

### Environmental Dependencies
- `.env` file with valid `DATABASE_URL`
- Supabase project accessible
- Local development environment: `npm run dev`

## Open Questions

1. ❓ **Should we add `startDate` field to UI?**
   - Database has `start_date` field (DateTime @db.Date)
   - Currently not exposed in frontend forms/tables
   - **Recommendation**: Separate PRD for feature addition

2. ❓ **Are there other legacy fields to remove?**
   - Database has `name` field (legacy, line 63 in schema)
   - Should investigate if `name` is used anywhere
   - **Recommendation**: Audit in separate task

3. ❓ **Should we add field for employee type/role?**
   - Database has `employeeSpId` and `gustoId` (integrations)
   - Could add UI for these fields
   - **Recommendation**: Separate PRD for integration features

## Success Metrics

### Immediate (Post-Implementation)
- ✅ Zero TypeScript compilation errors
- ✅ Zero runtime errors in browser console
- ✅ All 4 CRUD operations complete successfully
- ✅ 83 existing employee records display correctly

### Short-term (1 Week)
- ✅ No user-reported issues with employee management
- ✅ No API error logs related to employee endpoints
- ✅ Development team can extend employee features without confusion

## Related Documentation

- [prisma/schema.prisma:61-82](prisma/schema.prisma#L61-L82) — Employee model definition
- [CLAUDE.md](CLAUDE.md) — Project documentation (needs update)
- [MIGRATION_PRD.md](MIGRATION_PRD.md) — Database migration context
- [README.md](README.md) — User-facing documentation

## Appendix A: Complete File Change List

### Files to Modify (8 files)
1. `lib/types.ts` — Remove 2 lines
2. `lib/db.ts` — Remove 6 lines across 3 functions
3. `app/api/employees/route.ts` — Remove 2 lines from validation
4. `app/api/employees/[id]/route.ts` — Remove 2 lines from validation
5. `components/AddEmployee.tsx` — Remove ~32 lines (state, validation, inputs)
6. `components/EditEmployee.tsx` — Remove ~32 lines (state, validation, inputs)
7. `components/Table.tsx` — Remove 4 lines, update 1 line
8. `components/employee-columns.tsx` — Remove ~44 lines (2 column definitions)

### Files to Update (Documentation)
1. `CLAUDE.md` — Update examples and field references

### Files NOT Modified (Reference Only)
- `prisma/schema.prisma` — Database schema is correct
- `lib/data.ts` — Legacy seed data (not used in production)
- `scripts/migrate-data.ts` — Legacy migration script

## Appendix B: Search Commands for Verification

To verify all references removed:

```bash
# Search for salary references (should only find in comments/docs)
grep -r "salary" --include="*.ts" --include="*.tsx" --exclude-dir="node_modules" .

# Search for date field references (exclude startDate)
grep -r "\bdate\b" --include="*.ts" --include="*.tsx" --exclude-dir="node_modules" . | grep -v "startDate"

# Check TypeScript compilation
npx tsc --noEmit

# Run linter
npm run lint

# Build for production
npm run build
```

---

**Document Version**: 1.0
**Last Updated**: October 13, 2025
**Next Review**: After implementation and testing
