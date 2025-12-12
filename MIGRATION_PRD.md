# Product Requirements Document (PRD)
## SQL Server LocalDB to Supabase PostgreSQL Migration

**Project**: Database Migration for Good Therapy San Diego Employee Management System
**Author**: Claude Code
**Date**: October 13, 2025
**Status**: Draft - Pending Approval

---

## 1. Executive Summary

### 1.1 Purpose
Migrate the existing employee management database from SQL Server LocalDB to Supabase PostgreSQL to enable cloud-based access, improved scalability, and integration with the existing Next.js CRUD application.

### 1.2 Scope
This migration includes **7 core business tables** containing **164,664 total records**:
- Employee (83 rows)
- Rate (1,912 rows)
- Client (9,289 rows)
- Appointment (134,179 rows)
- AppointmentType (30 rows)
- TimePeriod (444 rows)
- Logs (18,767 rows)

### 1.3 Success Criteria
- ✅ 100% of data migrated with referential integrity maintained
- ✅ All foreign key relationships preserved
- ✅ Zero data loss or corruption
- ✅ Application fully functional with Supabase backend
- ✅ Migration completed with minimal downtime

---

## 2. Current State Analysis

### 2.1 Source Database
- **Platform**: Microsoft SQL Server LocalDB (v15.0.4382.1)
- **Instance**: `(localdb)\MSSQLLocalDB`
- **Database**: `DEV`
- **Total Records**: 164,664 across 7 tables
- **Connection String**: `Data Source=(localdb)\MSSQLLocalDB;Integrated Security=SSPI;Initial Catalog=DEV;Encrypt=false;app=LINQPad`

### 2.2 Target Database
- **Platform**: Supabase (PostgreSQL 15+)
- **Project**: supabase-yellow-car
- **URL**: https://tonguppnhjbummxwuvqf.supabase.co
- **Current Schema**: Single `employees` table (prototype)
- **ORM**: Prisma

### 2.3 Current Application State
The Next.js application currently uses:
- SQLite for local development (prototype)
- Prisma ORM for database access
- A simplified Employee model (10 fields)
- CRUD operations for employee management only

---

## 3. Database Schema Analysis

### 3.1 Table Overview

| Table | Columns | Rows | Dependencies | Purpose |
|-------|---------|------|--------------|---------|
| **AppointmentType** | 5 | 30 | None | Lookup table for appointment types |
| **Employee** | 10 | 83 | None | Clinician/staff information |
| **TimePeriod** | 5 | 444 | None | Payroll periods (bi-weekly) |
| **Client** | 17 | 9,289 | Employee, AppointmentType | Patient/client records |
| **Rate** | 9 | 1,912 | Employee, AppointmentType | Compensation rates |
| **Appointment** | 23 | 134,179 | Client, Employee, Rate, AppointmentType | Session records |
| **Logs** | 4 | 18,767 | None | Application audit trail |

### 3.2 Detailed Schema Definitions

#### 3.2.1 Employee Table
**Purpose**: Clinician and staff member records with payroll integration

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| ID | int | NO | - | Primary Key |
| Name | varchar(255) | YES | NULL | Full name (legacy) |
| Email | varchar(255) | YES | NULL | Contact email |
| Active | smallint | YES | NULL | Employment status |
| Start_Date | date | YES | NULL | Hire date |
| EmployeeSP_ID | int | NO | 0 | SimplePractice integration ID |
| LastName | varchar(255) | YES | NULL | Surname |
| FirstName | varchar(255) | YES | NULL | Given name |
| PayType | varchar(100) | YES | NULL | "Salary" or "Hourly" |
| GustoId | varchar(100) | YES | NULL | Gusto payroll system ID |

**Foreign Keys**: None
**Indexes**: Primary key on ID
**Row Count**: 83

#### 3.2.2 AppointmentType Table
**Purpose**: Defines session types and billing codes

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| ID | int | NO | - | Primary Key |
| Code | varchar(50) | YES | NULL | Internal billing code |
| Appt_Type | varchar(100) | YES | NULL | Display name |
| Description | varchar(MAX) | YES | NULL | Detailed description |
| TypeIdForRate | int | YES | NULL | Rate lookup reference |

**Foreign Keys**: None
**Indexes**: Primary key on ID
**Row Count**: 30
**Sample Data**:
- Code "00": Flagged - needs review
- Code "01": Free/Pay - Free session, clinician paid
- Code "90*": GTSD Session - Regular session

#### 3.2.3 Client Table
**Purpose**: Patient/client demographic and case management data

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| ID | int | NO | - | Primary Key |
| EmployeeID | int | YES | NULL | Assigned clinician (FK) |
| Client_Name | varchar(255) | YES | NULL | Full name |
| TxPlan | bit | YES | NULL | Treatment plan on file |
| NPP | bit | YES | NULL | Notice of Privacy Practices |
| Consent | bit | YES | NULL | Consent forms signed |
| Loaded | varchar(255) | YES | NULL | Data import status |
| Email | varchar(255) | YES | NULL | Contact email |
| Created | datetime2 | YES | NULL | Record creation timestamp |
| Updated | datetime2 | YES | NULL | Last modified timestamp |
| Next_Appt | date | YES | NULL | Scheduled appointment |
| Active | bit | YES | NULL | Active status |
| ClientSP_ID | int | NO | 0 | SimplePractice integration ID |
| HashedID | varchar(50) | NO | '' | Anonymized identifier |
| EmployeeSP_ID | int | YES | 0 | SimplePractice employee reference |
| Appt_TypeID | int | NO | - | Default appointment type (FK) |
| Type | varchar(100) | YES | 'Individual' | Session type |

**Foreign Keys**:
- EmployeeID → Employee.ID
- Appt_TypeID → AppointmentType.ID

**Indexes**: Primary key on ID
**Row Count**: 9,289

#### 3.2.4 Rate Table
**Purpose**: Compensation rates for employees by appointment type and date range

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| ID | int | NO | - | Primary Key |
| Rate | float | YES | NULL | Compensation amount |
| EmployeeID | int | YES | NULL | Clinician (FK) |
| Start_Date | date | NO | NULL | Effective start date |
| Active | smallint | YES | NULL | Active status |
| RateType | varchar(255) | YES | NULL | "dollar" or "percent" |
| End_Date | date | YES | NULL | Effective end date |
| Appt_TypeID | int | YES | NULL | Appointment type (FK) |
| GustoID | bigint | YES | NULL | Gusto payroll reference |

**Foreign Keys**:
- EmployeeID → Employee.ID
- Appt_TypeID → AppointmentType.ID

**Indexes**: Primary key on ID
**Row Count**: 1,912

#### 3.2.5 Appointment Table
**Purpose**: Individual therapy session records with billing and payment tracking

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| ID | int | NO | - | Primary Key |
| ClientID | int | NO | - | Client (FK) |
| EmployeeID | int | NO | - | Clinician (FK) |
| RateID | int | YES | NULL | Compensation rate (FK) |
| ApptSP_ID | bigint | YES | NULL | SimplePractice ID |
| Appt_TypeID | int | YES | NULL | Session type (FK) |
| Appt_Date | datetime2 | NO | - | Session date/time |
| Units | float | YES | NULL | Billable units |
| Clinician_Amount | float | YES | NULL | Clinician compensation |
| Client_Payment_Status | varchar(255) | YES | NULL | Payment status code |
| Duration | float | NO | - | Session length (minutes) |
| HasProgressNote | bit | NO | - | Documentation complete |
| Created | datetime2 | NO | - | Record creation |
| Updated | datetime2 | NO | - | Last modified |
| Client_Charge | float | YES | NULL | Amount billed to client |
| Flagged | bit | YES | NULL | Needs review |
| Client_Payment_Status_Desc | varchar(255) | YES | NULL | Payment description |
| Vacation_Hours | float | YES | NULL | PTO hours |
| Bonus | float | YES | NULL | Bonus amount |
| Correction_Payment | float | YES | NULL | Payment adjustment |
| Personal_Note | varchar(255) | YES | NULL | Private notes |
| Reimbursement | float | YES | NULL | Expense reimbursement |
| Comments | varchar(255) | YES | NULL | General comments |

**Foreign Keys**:
- ClientID → Client.ID
- EmployeeID → Employee.ID
- RateID → Rate.ID
- Appt_TypeID → AppointmentType.ID

**Indexes**:
- Primary key on ID
- Composite index: IDX_Appointment_ClientID (ClientID, EmployeeID, Appt_TypeID, Appt_Date, Units, Clinician_Amount, Client_Payment_Status, Duration, Client_Charge)
- Composite index: IDX_Appointment_EmployeeID (EmployeeID, ClientID, Appt_TypeID, Appt_Date, Units, Clinician_Amount, Client_Payment_Status, Duration, Client_Charge)

**Row Count**: 134,179 (largest table)

#### 3.2.6 TimePeriod Table
**Purpose**: Payroll period definitions for bi-weekly payroll processing

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| ID | bigint | NO | - | Primary Key |
| Year | int | NO | - | Calendar year |
| PayPeriod | int | NO | - | Period number (1-26) |
| StartDate | datetime2 | NO | - | Period start |
| EndDate | datetime2 | NO | - | Period end |

**Foreign Keys**: None
**Indexes**: Primary key on ID
**Row Count**: 444
**Date Range**: 2014 - Present (bi-weekly periods)

#### 3.2.7 Logs Table
**Purpose**: Application audit trail and error logging

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| ID | bigint | NO | - | Primary Key |
| LogTime | datetime2 | NO | - | Timestamp |
| Type | nvarchar(100) | NO | - | Log category |
| Description | nvarchar(MAX) | NO | - | Log message |

**Foreign Keys**: None
**Indexes**: Primary key on ID
**Row Count**: 18,767
**Common Log Types**: GetRateId(), data sync errors, missing rate errors

### 3.3 Entity Relationship Diagram

```
AppointmentType (30)
       ↓
       ├─→ Client (9,289)
       │      ↓
       │      └─→ Appointment (134,179)
       │             ↑
       └─→ Rate (1,912) ──┘
              ↑
Employee (83) ┴─→ Client
       │
       └─→ Rate

TimePeriod (444) [Independent]
Logs (18,767) [Independent]
```

---

## 4. Technical Requirements

### 4.1 Migration Technology Stack
- **Source Database Driver**: `mssql` (npm package)
- **Target Database Driver**: `@prisma/client`
- **ORM**: Prisma v5+
- **Runtime**: Node.js v18+
- **Language**: TypeScript

### 4.2 Prisma Schema Requirements

#### 4.2.1 Provider Configuration
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

#### 4.2.2 Connection String Format
```
DATABASE_URL="postgresql://postgres:[password]@db.tonguppnhjbummxwuvqf.supabase.co:5432/postgres"
```

### 4.3 Data Type Mapping

| SQL Server | PostgreSQL | Prisma | Notes |
|------------|------------|--------|-------|
| int | INTEGER | Int | No changes needed |
| bigint | BIGINT | BigInt | Large integers |
| varchar(n) | VARCHAR(n) | String | Character data |
| nvarchar(n) | VARCHAR(n) | String | Unicode support in PG |
| varchar(MAX) | TEXT | String | Unlimited text |
| float | DOUBLE PRECISION | Float | 64-bit float |
| bit | BOOLEAN | Boolean | True/false |
| smallint | SMALLINT | Int | Small integers |
| date | DATE | DateTime @db.Date | Date only |
| datetime2 | TIMESTAMP | DateTime | Date + time |

### 4.4 Naming Conventions
- **Tables**: snake_case, plural (e.g., `employees`, `appointments`)
- **Columns**: snake_case (e.g., `first_name`, `client_id`)
- **Foreign Keys**: `[table]_id` format
- **Indexes**: `idx_[table]_[column(s)]` format

### 4.5 Constraint Requirements
- All primary keys must use `SERIAL` or `BIGSERIAL` (auto-increment)
- Foreign key constraints must use `ON DELETE RESTRICT` (prevent orphans)
- Unique constraints where applicable (e.g., Employee.email)
- Check constraints for data validation (e.g., Active status)

---

## 5. Migration Strategy

### 5.1 Migration Phases

#### Phase 1: Schema Migration (2 hours)
1. **Backup current database** (SQL Server export)
2. **Update Prisma schema** with all 7 table definitions
3. **Generate migration files** (`prisma migrate dev`)
4. **Apply schema to Supabase** (push migration)
5. **Verify schema structure** in Supabase Studio

#### Phase 2: Data Migration (3-4 hours)
1. **Create migration script** (`scripts/migrate-from-sqlserver.ts`)
2. **Establish dual database connections** (SQL Server + Supabase)
3. **Migrate tables in dependency order**:
   - Step 1: AppointmentType (30 rows)
   - Step 2: Employee (83 rows)
   - Step 3: TimePeriod (444 rows)
   - Step 4: Client (9,289 rows) - **batched with invalid date conversion**
     - Convert 6,976 `0001-01-01` dates to NULL
     - Preserve 1,740 existing NULL values
     - Maintain 573 valid scheduled appointments
   - Step 5: Rate (1,912 rows) - batched
   - Step 6: Appointment (134,179 rows) - batched with progress tracking
   - Step 7: Logs (18,767 rows) - batched
4. **Handle data transformations**:
   - Convert SQL Server datetime2 to PostgreSQL timestamp
   - Map bit fields to boolean
   - **Convert invalid `0001-01-01` placeholder dates to NULL (Client.Next_Appt)**
   - Handle NULL values appropriately
   - Preserve varchar(MAX) → TEXT conversion
5. **Batch processing strategy**:
   - Small tables (<1000 rows): Single batch
   - Medium tables (1000-10000 rows): 1000 row batches
   - Large tables (>10000 rows): 1000 row batches with progress logging

#### Phase 3: Validation (1 hour)
1. **Row count verification** (compare source vs. target)
2. **Foreign key integrity checks** (verify all FKs resolve)
3. **Sample data comparison** (random record spot-checks)
4. **Query performance testing** (baseline queries)
5. **Edge case validation** (NULL values, special characters, date ranges)

#### Phase 4: Application Migration (2 hours)
1. **Update database connection** (switch from SQLite to Supabase)
2. **Refactor data access layer** (`lib/db.ts`)
3. **Update API routes** (handle new schema)
4. **Add new CRUD operations** (Client, Appointment, Rate, etc.)
5. **Update UI components** (if needed)

#### Phase 5: Testing & Deployment (2 hours)
1. **Integration testing** (full CRUD flows)
2. **Performance testing** (query optimization)
3. **User acceptance testing** (stakeholder review)
4. **Production deployment** (cutover plan)
5. **Monitoring setup** (error tracking, performance metrics)

### 5.2 Rollback Strategy
- **Backup**: Full SQL Server database backup before migration
- **Checkpoints**: Snapshot after each phase
- **Validation gates**: No progression without validation success
- **Rollback triggers**: >1% data loss, integrity violations, critical errors
- **Recovery time**: <1 hour to revert to SQL Server

### 5.3 Downtime Management
- **Estimated downtime**: 15-30 minutes (cutover only)
- **Maintenance window**: Recommend off-hours (weekend/evening)
- **Read-only mode**: Enable during final data sync
- **Communication plan**: User notification 48 hours in advance

---

## 6. Data Integrity & Quality

### 6.1 Validation Checks

#### Pre-Migration Validation
- ✅ Verify all foreign key relationships are valid
- ✅ Check for orphaned records
- ✅ Identify NULL values in NOT NULL columns
- ✅ Validate data type compatibility
- ✅ Check for duplicate primary keys

#### Post-Migration Validation
- ✅ Row count matches (exact)
- ✅ Primary key sequences correct
- ✅ Foreign key constraints enforced
- ✅ Sample data matches (spot checks)
- ✅ Index performance acceptable
- ✅ Query results identical

### 6.2 Data Quality Issues

#### Identified Issues
1. **Employee.Name vs FirstName/LastName**: Redundant full name field exists
2. **Client.HashedID**: Anonymization field requires generation logic
3. **Appointment.Comments**: Contains migration notes ("RATE MIGRATION FAILED")
4. **Client.Next_Appt Invalid Dates**: **75.1% of clients (6,976/9,289) have '0001-01-01' placeholder dates** - Critical data quality issue
5. **Nullable foreign keys**: Some FKs allow NULL (design decision needed)

#### Remediation Plan
- **Issue 1**: Deprecate Name field, use computed column in application
- **Issue 2**: Generate HashedID if missing during migration
- **Issue 3**: Flag records with migration comments for review
- **Issue 4**: **RESOLVED** - Convert all `0001-01-01` dates to NULL (see Section 6.2.6)
- **Issue 5**: Document nullable FK logic, add application-level validation

#### 6.2.6 Client.Next_Appt Invalid Date Handling (CRITICAL)

**Problem Description**:
The `Client.Next_Appt` field contains **6,976 invalid placeholder dates** (`0001-01-01`) representing **75.1% of all client records**. This is the most significant data quality issue in the source database.

**Data Breakdown**:
| Client Status | Total Records | Invalid Dates (0001-01-01) | Valid/NULL Dates | % Invalid |
|---------------|---------------|---------------------------|-----------------|-----------|
| Inactive (0) | 5,731 | 4,878 | 853 | 85.1% |
| Active (1) | 3,558 | 2,098 | 1,460 | 59.0% |
| **Total** | **9,289** | **6,976** | **2,313** | **75.1%** |

**Root Cause Analysis**:
- Legacy .NET application pattern using `DateTime.MinValue` (`0001-01-01`) as placeholder instead of NULL
- Common anti-pattern in older .NET code that didn't use nullable `DateTime?` types
- Field appears to be **set once on creation but never maintained**
- Evidence: Active clients with appointments as recent as October 31, 2025 still show `0001-01-01`
- Example: Client "ABIGAIL CAIN" has 309 appointments with last appointment on 10/31/2025, but `Next_Appt = 0001-01-01`

**Impact Assessment**:
- **Severity**: High (affects 75% of records)
- **Scope**: Limited to `Client.Next_Appt` field only (all other date fields are clean)
- **Business Impact**: Field appears unused for actual scheduling logic
- **Migration Impact**: Must handle transformation to prevent date calculation errors in PostgreSQL

**Chosen Solution: NULL Conversion Approach**

Convert all `0001-01-01` values to `NULL` during migration.

**Rationale**:
1. ✅ **Semantically Correct**: NULL properly represents "no scheduled appointment"
2. ✅ **PostgreSQL Best Practice**: Avoids ambiguous/invalid dates in queries
3. ✅ **Prevents Errors**: Eliminates date math errors (e.g., date differences, comparisons)
4. ✅ **Data Quality**: Improves overall data quality by removing invalid placeholders
5. ✅ **Simple Implementation**: Low-risk, straightforward transformation logic
6. ✅ **Future-Proof**: Prevents propagation of anti-pattern to new system

**Implementation Details**:
```typescript
// During Client table migration
if (client.Next_Appt === '0001-01-01') {
  client.Next_Appt = null;  // Convert to NULL
} else if (client.Next_Appt !== null) {
  client.Next_Appt = new Date(client.Next_Appt);  // Preserve valid dates
}
```

**Expected Outcome**:
- **Before Migration**: 6,976 invalid dates + 1,740 NULLs + 573 valid dates = 9,289 total
- **After Migration**: 0 invalid dates + 8,716 NULLs + 573 valid dates = 9,289 total
- **Records Converted**: 6,976 (`0001-01-01` → NULL)
- **Records Preserved**: 2,313 (1,740 existing NULLs + 573 valid dates)

**Validation Criteria**:
```sql
-- Post-migration validation queries
-- Should return 0 (no invalid dates remaining)
SELECT COUNT(*) FROM clients WHERE next_appt = '0001-01-01';

-- Should return approximately 8,716 (1,740 + 6,976)
SELECT COUNT(*) FROM clients WHERE next_appt IS NULL;

-- Should return 573 (valid future appointments preserved)
SELECT COUNT(*) FROM clients WHERE next_appt > '2020-01-01';
```

**Pre-Migration Action Required**:
- [ ] Review application code for dependencies on `0001-01-01` pattern
- [ ] Search codebase for `DateTime.MinValue` references
- [ ] Test application with NULL `Next_Appt` values
- [ ] Consider deprecating field entirely (appears unused)

**Related Documentation**: See `DATA_QUALITY_ANALYSIS.md` for comprehensive analysis

### 6.3 Data Transformation Rules

| Transformation | Rule | Example |
|----------------|------|---------|
| Date conversion | SQL Server datetime2 → PostgreSQL timestamp | 2020-09-04 18:00:00 → 2020-09-04 18:00:00+00 |
| Boolean conversion | bit (0/1) → boolean | 1 → true, 0 → false |
| NULL preservation | NULL → NULL | Maintain all NULL values |
| Empty string | '' → NULL (for optional fields) | HashedID: '' → NULL |
| **Invalid placeholder dates** | **'0001-01-01' → NULL (Client.Next_Appt only)** | **6,976 records converted. Preserves semantic "no appointment scheduled"** |
| MAX values | varchar(MAX) → TEXT | No size limit |
| Decimal precision | float → DOUBLE PRECISION | Preserve precision |

---

## 7. Implementation Deliverables

### 7.1 Code Deliverables

#### 7.1.1 Prisma Schema (`prisma/schema.prisma`)
- Complete schema definition with all 7 tables
- Proper relationships and foreign keys
- Indexes for query optimization
- Database provider configuration

#### 7.1.2 Migration Script (`scripts/migrate-from-sqlserver.ts`)
```typescript
// Key components:
- SQL Server connection setup
- Supabase connection via Prisma
- Table migration functions (7 functions)
- Batch processing logic
- Progress tracking
- Error handling and logging
- Transaction management
- Invalid date conversion logic (Client.Next_Appt)

// Example: Client migration with date handling
async function migrateClients(clients: any[]) {
  let convertedDates = 0;

  for (const client of clients) {
    // Handle invalid 0001-01-01 placeholder dates
    let nextAppt = null;
    if (client.Next_Appt === '0001-01-01') {
      nextAppt = null;  // Convert invalid date to NULL
      convertedDates++;
    } else if (client.Next_Appt !== null) {
      nextAppt = new Date(client.Next_Appt);  // Preserve valid dates
    }

    const data = {
      // ... other fields
      nextAppt: nextAppt,
      // ... other fields
    };

    await prisma.client.create({ data });
  }

  console.log(`Converted ${convertedDates} invalid dates to NULL`);
  // Expected: ~6,976 conversions
}
```

#### 7.1.3 Validation Script (`scripts/verify-migration.ts`)
```typescript
// Key components:
- Row count comparison
- Foreign key integrity checks
- Sample data validation
- Data type verification
- Performance baseline tests
```

#### 7.1.4 Database Utility Layer (`lib/db.ts`)
- CRUD operations for all 7 tables
- Type-safe query functions
- Error handling
- Connection pooling configuration

#### 7.1.5 API Routes
- `/api/employees/*` - Employee management (existing)
- `/api/clients/*` - Client management (new)
- `/api/appointments/*` - Appointment management (new)
- `/api/rates/*` - Rate management (new)
- `/api/appointment-types/*` - Appointment type lookup (new)
- `/api/time-periods/*` - Pay period lookup (new)
- `/api/logs/*` - Audit log access (new)

### 7.2 Documentation Deliverables

#### 7.2.1 Updated CLAUDE.md
- Supabase configuration instructions
- New table descriptions
- Database helper function documentation
- Migration procedure reference

#### 7.2.2 Migration Runbook
- Step-by-step migration procedure
- Rollback instructions
- Troubleshooting guide
- Validation checklist

#### 7.2.3 API Documentation
- Endpoint specifications
- Request/response schemas
- Authentication requirements
- Rate limiting policies

### 7.3 Testing Deliverables

#### 7.3.1 Unit Tests
- Database utility functions
- Data transformation logic
- Validation functions

#### 7.3.2 Integration Tests
- API route tests
- End-to-end CRUD flows
- Foreign key constraint tests

#### 7.3.3 Performance Tests
- Query performance benchmarks
- Load testing results
- Index optimization results

---

## 8. Risk Assessment

### 8.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss during migration | Low | Critical | Full backup, validation gates, transaction rollback |
| Foreign key violations | Medium | High | Pre-migration validation, referential integrity checks |
| Performance degradation | Medium | Medium | Index optimization, query tuning, connection pooling |
| Data type incompatibility | Low | Medium | Comprehensive type mapping, test migrations |
| Large data volume timeout | Medium | Medium | Batch processing, progress tracking, resume capability |
| Concurrent access during migration | Low | High | Read-only mode, maintenance window, user notification |

### 8.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Extended downtime | Low | High | Thorough testing, staged rollout, quick rollback plan |
| User resistance to changes | Low | Low | Minimal UI changes, training if needed |
| Data integrity issues | Low | Critical | Extensive validation, audit trails, verification scripts |
| Cost overruns | Medium | Low | Supabase free tier sufficient, monitor usage |

### 8.3 Mitigation Strategies

#### Technical Mitigation
1. **Backup Strategy**: Full SQL Server backup + Supabase point-in-time recovery
2. **Validation Gates**: No phase progression without successful validation
3. **Batch Processing**: Prevent memory issues with large datasets
4. **Progress Tracking**: Resume capability for interrupted migrations
5. **Error Logging**: Comprehensive logging for troubleshooting

#### Business Mitigation
1. **Stakeholder Communication**: Clear timeline and expectations
2. **Maintenance Window**: Off-hours migration to minimize impact
3. **Rollback Plan**: Quick reversion to SQL Server if critical issues
4. **Testing Environment**: Dry-run migrations before production

---

## 9. Timeline & Milestones

### 9.1 Project Timeline

**Total Duration**: 2-3 days (16-20 hours)

#### Day 1: Schema & Infrastructure (6-8 hours)
- ☐ Project kickoff and environment setup (1 hour)
- ☐ Prisma schema definition (2 hours)
- ☐ Schema migration to Supabase (1 hour)
- ☐ Migration script development (2-3 hours)
- ☐ Validation script development (1 hour)

#### Day 2: Data Migration & Validation (6-8 hours)
- ☐ Dry-run migration (test environment) (2 hours)
- ☐ Issue resolution and refinement (1-2 hours)
- ☐ Production data migration (2-3 hours)
- ☐ Data validation and integrity checks (1-2 hours)

#### Day 3: Application Migration & Testing (4-6 hours)
- ☐ Update application code (2 hours)
- ☐ Integration testing (1-2 hours)
- ☐ User acceptance testing (1 hour)
- ☐ Production deployment (1 hour)
- ☐ Post-deployment monitoring (ongoing)

### 9.2 Key Milestones

| Milestone | Target Date | Success Criteria |
|-----------|-------------|------------------|
| Schema Migration Complete | Day 1, EOD | All tables created in Supabase |
| Data Migration Complete | Day 2, Midday | All 164,664 rows migrated |
| Validation Complete | Day 2, EOD | 100% validation pass rate |
| Application Updated | Day 3, Midday | All CRUD operations functional |
| Production Deployment | Day 3, EOD | Application live on Supabase |
| Post-Launch Review | Day 4 | Performance metrics acceptable |

---

## 10. Success Metrics

### 10.1 Migration Success Criteria

#### Data Integrity Metrics
- ✅ **100% row count match**: All 164,664 rows migrated successfully
- ✅ **0 orphaned records**: All foreign keys resolve correctly
- ✅ **0 data corruption**: Sample validation 100% match
- ✅ **0 data loss**: No records dropped or truncated
- ✅ **0 invalid dates**: All 6,976 `0001-01-01` placeholder dates converted to NULL
- ✅ **Valid date preservation**: All 573 valid `Next_Appt` dates preserved accurately

#### Performance Metrics
- ✅ **Query latency**: <100ms for simple queries, <500ms for complex queries
- ✅ **API response time**: <200ms for CRUD operations
- ✅ **Concurrent users**: Support 10+ simultaneous users
- ✅ **Database size**: <500MB total storage

#### Operational Metrics
- ✅ **Downtime**: <30 minutes maintenance window
- ✅ **Rollback time**: <1 hour if needed
- ✅ **Migration duration**: <4 hours total
- ✅ **Error rate**: <0.1% during migration

### 10.2 Post-Migration KPIs

#### Week 1 KPIs
- System uptime: >99.9%
- Query performance: Within 10% of baseline
- User error reports: <5 issues
- Data integrity checks: Daily validation passes

#### Month 1 KPIs
- Application stability: Zero critical bugs
- Performance optimization: Query time reduced by 20%
- User satisfaction: Positive feedback from stakeholders
- Cost efficiency: Within Supabase free tier limits

---

## 11. Dependencies & Assumptions

### 11.1 Dependencies

#### External Dependencies
- Supabase account active and accessible
- SQL Server LocalDB instance available
- Network connectivity for migration duration
- Development environment configured

#### Technical Dependencies
- Node.js v18+ installed
- Prisma CLI v5+ installed
- mssql npm package installed
- Supabase credentials configured

#### Resource Dependencies
- Database administrator access to SQL Server
- Supabase admin access
- Developer time allocation (16-20 hours)
- Testing environment availability

### 11.2 Assumptions

#### Technical Assumptions
- SQL Server LocalDB data is consistent and valid
- No concurrent writes during migration
- Supabase free tier sufficient for data volume
- PostgreSQL compatibility with application code

#### Business Assumptions
- Maintenance window approval obtained
- Stakeholders informed of migration timeline
- No critical business operations during migration
- Rollback acceptable if critical issues arise

#### Data Assumptions
- Historical data integrity is acceptable
- Foreign key relationships are valid
- No sensitive data requiring special handling (HIPAA compliance assumed handled)
- Data volume will not exceed Supabase limits
- **Client.Next_Appt field is not actively used for scheduling** (75% invalid data indicates deprecated field)
- Application can handle NULL values in Client.Next_Appt field (no dependencies on `0001-01-01` pattern)

---

## 12. Open Questions & Decisions Needed

### 12.1 Business Decisions
1. **Maintenance Window**: Preferred date/time for migration?
2. **Data Retention**: Should historical logs be archived or all migrated?
3. **Access Control**: Who needs database access post-migration?
4. **Backup Strategy**: How long to maintain SQL Server backup?

### 12.2 Technical Decisions
1. **Nullable Foreign Keys**: Keep nullable FKs or enforce NOT NULL?
2. **Index Strategy**: Which additional indexes needed for performance?
3. **Data Archival**: Archive old appointment data (>5 years)?
4. **Soft Deletes**: Implement soft delete pattern for records?

### 12.3 Design Decisions
1. **Employee.Name Field**: Deprecate or keep synchronized?
2. **Client.HashedID**: Generation algorithm for missing values?
3. ~~**Invalid Dates**: Convert '0001-01-01' to NULL or omit records?~~ **RESOLVED**: Convert all `0001-01-01` to NULL (6,976 records in Client.Next_Appt) - See Section 6.2.6
4. **Logs Retention**: Implement log rotation or keep all?

---

## 13. Appendices

### Appendix A: SQL Server Connection String
```
Data Source=(localdb)\MSSQLLocalDB;Integrated Security=SSPI;Initial Catalog=DEV;Encrypt=false;app=LINQPad
```

### Appendix B: Supabase Connection Details
- **Project**: supabase-yellow-car
- **URL**: https://tonguppnhjbummxwuvqf.supabase.co
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbmd1cHBuaGpidW1teHd1dnFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNTA0NDIsImV4cCI6MjA3NTYyNjQ0Mn0.LsppR-gu0nfej4hYhRoaXW3v6hJTHzyuaMdNL0RmEPA

### Appendix C: Sample Migration Script Outline
```typescript
import { PrismaClient } from '@prisma/client';
import sql from 'mssql';

const prisma = new PrismaClient();

async function main() {
  // 1. Connect to SQL Server
  // 2. Migrate AppointmentType
  // 3. Migrate Employee
  // 4. Migrate TimePeriod
  // 5. Migrate Client (batched)
  // 6. Migrate Rate (batched)
  // 7. Migrate Appointment (batched with progress)
  // 8. Migrate Logs (batched)
  // 9. Validate migration
}

main();
```

### Appendix D: Validation Queries

```sql
-- Row count verification
SELECT 'Employee' AS table, COUNT(*) FROM employees
UNION ALL
SELECT 'Client', COUNT(*) FROM clients
-- ... (repeat for all tables)

-- Foreign key integrity
SELECT c.id FROM clients c
LEFT JOIN employees e ON c.employee_id = e.id
WHERE c.employee_id IS NOT NULL AND e.id IS NULL;
-- (should return 0 rows)

-- Date range validation
SELECT MIN(appt_date), MAX(appt_date) FROM appointments;
```

### Appendix E: Client.Next_Appt Invalid Date Conversion Details

**Summary Statistics** (Source Database):
- **Total Client Records**: 9,289
- **Invalid Dates (`0001-01-01`)**: 6,976 (75.1%)
- **NULL Values**: 1,740 (18.7%)
- **Valid Dates (>2020)**: 573 (6.2%)

**Breakdown by Client Status**:
| Active Status | Total | Invalid (`0001-01-01`) | NULL | Valid | % Invalid |
|--------------|-------|----------------------|------|-------|-----------|
| Inactive (0) | 5,731 | 4,878 | 853 | 0 | 85.1% |
| Active (1) | 3,558 | 2,098 | 887 | 573 | 59.0% |

**Real-World Examples** (Active clients with invalid dates but recent appointments):
```
Client ID: 7593, Name: Jasper Chen
  Next_Appt: 0001-01-01 (invalid)
  Last Actual Appointment: 2025-10-31 18:00
  Total Appointments: 79

Client ID: 7839, Name: ABIGAIL CAIN
  Next_Appt: 0001-01-01 (invalid)
  Last Actual Appointment: 2025-10-31 13:00
  Total Appointments: 309
```

**Conversion Logic**:
```typescript
if (client.Next_Appt === '0001-01-01') {
  client.Next_Appt = null;  // Convert invalid placeholder to NULL
} else if (client.Next_Appt !== null) {
  client.Next_Appt = new Date(client.Next_Appt);  // Preserve valid dates
}
// NULL values remain NULL
```

**Expected Post-Migration State**:
- **Invalid Dates (`0001-01-01`)**: 0 (all converted)
- **NULL Values**: 8,716 (1,740 original + 6,976 converted)
- **Valid Dates**: 573 (preserved)
- **Total**: 9,289 (no data loss)

**Validation Queries** (PostgreSQL):
```sql
-- Should return 0 (no invalid dates remaining)
SELECT COUNT(*) FROM clients WHERE next_appt = '0001-01-01';

-- Should return approximately 8,716
SELECT COUNT(*) FROM clients WHERE next_appt IS NULL;

-- Should return 573 (valid dates preserved)
SELECT COUNT(*) FROM clients
WHERE next_appt > '2020-01-01' AND next_appt IS NOT NULL;

-- Verify total count unchanged
SELECT COUNT(*) FROM clients;  -- Should be 9,289

-- Sample check: View distribution of next_appt values
SELECT
  CASE
    WHEN next_appt IS NULL THEN 'NULL'
    WHEN next_appt > '2020-01-01' THEN 'Valid Date'
    ELSE 'Other'
  END AS date_category,
  COUNT(*) as count
FROM clients
GROUP BY date_category;
```

**Most Common Valid Dates** (to verify preservation):
- 2024-02-28: 80 clients
- 2024-02-27: 78 clients
- 2024-02-26: 76 clients
- 2024-02-29: 72 clients

**Related Documentation**:
- Full analysis: `DATA_QUALITY_ANALYSIS.md`
- Root cause details: Section 6.2.6
- Transformation rules: Section 6.3

---

## 14. Approval & Sign-Off

**Document Status**: Draft - Awaiting Approval

### Stakeholder Review
- [ ] Technical Lead: _______________________  Date: _______
- [ ] Database Administrator: _______________  Date: _______
- [ ] Product Owner: _______________________  Date: _______
- [ ] Business Stakeholder: ________________  Date: _______

### Approval
- [ ] Approved to proceed with implementation
- [ ] Approved with modifications (see comments)
- [ ] Not approved (see reasons)

**Comments**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

**Document Version**: 1.1
**Last Updated**: October 13, 2025
**Changelog**:
- v1.1 (2025-10-13): Added comprehensive Client.Next_Appt invalid date analysis and NULL conversion approach (Section 6.2.6, Appendix E). Resolved design decision #3.
- v1.0 (2025-10-13): Initial PRD created with complete schema analysis and migration strategy

**Next Review**: Upon stakeholder feedback
