# Database Schema Documentation

## Database Configuration
- **Type:** PostgreSQL
- **Host:** barkbase-dev-public.ctuea6sg4d0d.us-east-2.rds.amazonaws.com
- **Port:** 5432
- **Database:** barkbase
- **Connection:** SSL Required
- **Multi-Tenant:** Yes (tenant isolation via tenantId column)

## Core Tables

### User
Primary user authentication and profile table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| recordId | UUID | PRIMARY KEY | Unique user identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| password | VARCHAR(255) | | Hashed password (bcrypt) |
| cognitoSub | VARCHAR(255) | UNIQUE | AWS Cognito user ID |
| firstName | VARCHAR(100) | | User's first name |
| lastName | VARCHAR(100) | | User's last name |
| phoneNumber | VARCHAR(20) | | Contact phone |
| role | ENUM | DEFAULT 'USER' | USER, ADMIN, STAFF |
| isActive | BOOLEAN | DEFAULT true | Account status |
| lastLoginAt | TIMESTAMP | | Last login timestamp |
| createdAt | TIMESTAMP | DEFAULT NOW() | Record creation |
| updatedAt | TIMESTAMP | DEFAULT NOW() | Last update |
| deletedAt | TIMESTAMP | | Soft delete timestamp |

### Tenant
Multi-tenant organization/business entity.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| recordId | UUID | PRIMARY KEY | Unique tenant identifier |
| name | VARCHAR(255) | NOT NULL | Business name |
| subdomain | VARCHAR(100) | UNIQUE | Custom subdomain |
| plan | VARCHAR(50) | DEFAULT 'BASIC' | Subscription plan |
| maxUsers | INTEGER | DEFAULT 5 | User limit |
| maxPets | INTEGER | DEFAULT 100 | Pet limit |
| settings | JSONB | | Tenant-specific settings |
| createdAt | TIMESTAMP | DEFAULT NOW() | Record creation |
| updatedAt | TIMESTAMP | DEFAULT NOW() | Last update |
| deletedAt | TIMESTAMP | | Soft delete timestamp |

### Membership
Links users to tenants (many-to-many relationship).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| recordId | UUID | PRIMARY KEY | Unique membership ID |
| userId | UUID | FOREIGN KEY (User) | User reference |
| tenantId | UUID | FOREIGN KEY (Tenant) | Tenant reference |
| role | VARCHAR(50) | DEFAULT 'MEMBER' | Role within tenant |
| permissions | JSONB | | Custom permissions |
| joinedAt | TIMESTAMP | DEFAULT NOW() | Join date |
| updatedAt | TIMESTAMP | DEFAULT NOW() | Last update |
| deletedAt | TIMESTAMP | | Soft delete timestamp |

**Indexes:**
- UNIQUE INDEX ON (userId, tenantId) WHERE deletedAt IS NULL

---

## Entity Tables

### Pet
Pet records with owner associations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| recordId | UUID | PRIMARY KEY | Unique pet identifier |
| tenantId | UUID | FOREIGN KEY (Tenant) | Tenant isolation |
| ownerId | UUID | FOREIGN KEY (Owner) | Pet owner |
| name | VARCHAR(100) | NOT NULL | Pet name |
| species | VARCHAR(50) | NOT NULL | DOG, CAT, etc. |
| breed | VARCHAR(100) | | Breed specification |
| color | VARCHAR(50) | | Color/markings |
| birthDate | DATE | | Date of birth |
| weight | DECIMAL(5,2) | | Weight in kg |
| microchipId | VARCHAR(50) | UNIQUE | Microchip number |
| medicalNotes | TEXT | | Medical history |
| behaviorNotes | TEXT | | Behavior notes |
| photoUrl | VARCHAR(500) | | Profile photo |
| isActive | BOOLEAN | DEFAULT true | Active status |
| createdAt | TIMESTAMP | DEFAULT NOW() | Record creation |
| updatedAt | TIMESTAMP | DEFAULT NOW() | Last update |
| deletedAt | TIMESTAMP | | Soft delete timestamp |

### Owner
Pet owner information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| recordId | UUID | PRIMARY KEY | Unique owner identifier |
| tenantId | UUID | FOREIGN KEY (Tenant) | Tenant isolation |
| firstName | VARCHAR(100) | NOT NULL | First name |
| lastName | VARCHAR(100) | NOT NULL | Last name |
| email | VARCHAR(255) | | Email address |
| phoneNumber | VARCHAR(20) | NOT NULL | Primary phone |
| alternatePhone | VARCHAR(20) | | Secondary phone |
| address | TEXT | | Street address |
| city | VARCHAR(100) | | City |
| state | VARCHAR(50) | | State/Province |
| zipCode | VARCHAR(20) | | Postal code |
| emergencyContact | JSONB | | Emergency contact info |
| notes | TEXT | | General notes |
| createdAt | TIMESTAMP | DEFAULT NOW() | Record creation |
| updatedAt | TIMESTAMP | DEFAULT NOW() | Last update |
| deletedAt | TIMESTAMP | | Soft delete timestamp |

### Staff
Staff member records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| recordId | UUID | PRIMARY KEY | Unique staff identifier |
| tenantId | UUID | FOREIGN KEY (Tenant) | Tenant isolation |
| userId | UUID | FOREIGN KEY (User) | Linked user account |
| employeeId | VARCHAR(50) | UNIQUE | Employee number |
| position | VARCHAR(100) | | Job title |
| department | VARCHAR(100) | | Department |
| startDate | DATE | NOT NULL | Employment start |
| endDate | DATE | | Employment end |
| hourlyRate | DECIMAL(10,2) | | Pay rate |
| permissions | JSONB | | Staff permissions |
| createdAt | TIMESTAMP | DEFAULT NOW() | Record creation |
| updatedAt | TIMESTAMP | DEFAULT NOW() | Last update |
| deletedAt | TIMESTAMP | | Soft delete timestamp |

---

## Medical Tables

### Vaccination
Pet vaccination records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| recordId | UUID | PRIMARY KEY | Unique vaccination ID |
| tenantId | UUID | FOREIGN KEY (Tenant) | Tenant isolation |
| petId | UUID | FOREIGN KEY (Pet) | Pet reference |
| vaccineName | VARCHAR(100) | NOT NULL | Vaccine name |
| manufacturer | VARCHAR(100) | | Vaccine manufacturer |
| batchNumber | VARCHAR(50) | | Batch/lot number |
| administeredDate | DATE | NOT NULL | Date given |
| expiryDate | DATE | | Expiration date |
| veterinarianName | VARCHAR(200) | | Administering vet |
| clinicName | VARCHAR(200) | | Clinic name |
| notes | TEXT | | Additional notes |
| createdAt | TIMESTAMP | DEFAULT NOW() | Record creation |
| updatedAt | TIMESTAMP | DEFAULT NOW() | Last update |
| deletedAt | TIMESTAMP | | Soft delete timestamp |

**Indexes:**
- INDEX ON (tenantId, expiryDate)
- INDEX ON (petId, expiryDate)

---

## Operations Tables

### Reservation
Booking/reservation records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| recordId | UUID | PRIMARY KEY | Unique reservation ID |
| tenantId | UUID | FOREIGN KEY (Tenant) | Tenant isolation |
| petId | UUID | FOREIGN KEY (Pet) | Pet being boarded |
| ownerId | UUID | FOREIGN KEY (Owner) | Pet owner |
| checkInDate | DATE | NOT NULL | Arrival date |
| checkOutDate | DATE | NOT NULL | Departure date |
| actualCheckIn | TIMESTAMP | | Actual check-in time |
| actualCheckOut | TIMESTAMP | | Actual check-out time |
| roomId | UUID | FOREIGN KEY (Room) | Assigned room |
| status | VARCHAR(50) | DEFAULT 'PENDING' | PENDING, CONFIRMED, etc. |
| services | JSONB | | Additional services |
| specialInstructions | TEXT | | Special care notes |
| totalAmount | DECIMAL(10,2) | | Total cost |
| depositAmount | DECIMAL(10,2) | | Deposit paid |
| createdAt | TIMESTAMP | DEFAULT NOW() | Record creation |
| updatedAt | TIMESTAMP | DEFAULT NOW() | Last update |
| deletedAt | TIMESTAMP | | Soft delete timestamp |

### Room
Facility room/kennel information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| recordId | UUID | PRIMARY KEY | Unique room ID |
| tenantId | UUID | FOREIGN KEY (Tenant) | Tenant isolation |
| roomNumber | VARCHAR(20) | NOT NULL | Room identifier |
| building | VARCHAR(50) | | Building/section |
| type | VARCHAR(50) | | STANDARD, SUITE, etc. |
| capacity | INTEGER | DEFAULT 1 | Pet capacity |
| size | VARCHAR(50) | | SMALL, MEDIUM, LARGE |
| dailyRate | DECIMAL(10,2) | | Daily rate |
| amenities | JSONB | | Room features |
| status | VARCHAR(50) | DEFAULT 'AVAILABLE' | Current status |
| createdAt | TIMESTAMP | DEFAULT NOW() | Record creation |
| updatedAt | TIMESTAMP | DEFAULT NOW() | Last update |
| deletedAt | TIMESTAMP | | Soft delete timestamp |

---

## Financial Tables

### Payment
Payment transaction records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| recordId | UUID | PRIMARY KEY | Unique payment ID |
| tenantId | UUID | FOREIGN KEY (Tenant) | Tenant isolation |
| reservationId | UUID | FOREIGN KEY (Reservation) | Related booking |
| ownerId | UUID | FOREIGN KEY (Owner) | Payer |
| amount | DECIMAL(10,2) | NOT NULL | Payment amount |
| method | VARCHAR(50) | | CASH, CARD, CHECK |
| status | VARCHAR(50) | DEFAULT 'PENDING' | Payment status |
| transactionId | VARCHAR(100) | | External transaction ID |
| processedAt | TIMESTAMP | | Processing timestamp |
| notes | TEXT | | Payment notes |
| createdAt | TIMESTAMP | DEFAULT NOW() | Record creation |
| updatedAt | TIMESTAMP | DEFAULT NOW() | Last update |

### Invoice
Invoice/billing records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| recordId | UUID | PRIMARY KEY | Unique invoice ID |
| tenantId | UUID | FOREIGN KEY (Tenant) | Tenant isolation |
| invoiceNumber | VARCHAR(50) | UNIQUE | Invoice number |
| ownerId | UUID | FOREIGN KEY (Owner) | Bill to |
| reservationId | UUID | FOREIGN KEY (Reservation) | Related booking |
| issueDate | DATE | NOT NULL | Issue date |
| dueDate | DATE | NOT NULL | Due date |
| subtotal | DECIMAL(10,2) | | Subtotal amount |
| taxAmount | DECIMAL(10,2) | | Tax amount |
| totalAmount | DECIMAL(10,2) | NOT NULL | Total due |
| paidAmount | DECIMAL(10,2) | DEFAULT 0 | Amount paid |
| status | VARCHAR(50) | DEFAULT 'DRAFT' | DRAFT, SENT, PAID |
| lineItems | JSONB | | Invoice line items |
| createdAt | TIMESTAMP | DEFAULT NOW() | Record creation |
| updatedAt | TIMESTAMP | DEFAULT NOW() | Last update |

---

## Multi-Tenant Isolation Strategy

### Implementation
1. **Every table** (except User and system tables) has a `tenantId` column
2. **All queries** must include `WHERE tenantId = $1` filter
3. **Row-Level Security (RLS)** can be enabled for additional protection

### Example Query Pattern
```sql
-- Bad: No tenant isolation
SELECT * FROM pets WHERE "ownerId" = $1;

-- Good: With tenant isolation
SELECT * FROM pets
WHERE "tenantId" = $1 AND "ownerId" = $2
AND "deletedAt" IS NULL;
```

### Tenant Context
- Extracted from JWT claims
- Passed to all database queries
- Validated on every request

---

## Soft Delete Pattern

All major tables implement soft delete:
- `deletedAt` column (NULL = active, timestamp = deleted)
- All queries include `AND "deletedAt" IS NULL`
- Deleted records retained for audit trail

---

## Audit Trail

Key tables for compliance:
- All tables have `createdAt` and `updatedAt` timestamps
- Critical operations logged in separate audit table
- User actions tracked via JWT sub claim

---

## Database Indexes

### Performance Indexes
```sql
-- Tenant isolation
CREATE INDEX idx_pets_tenant ON pets(tenantId) WHERE deletedAt IS NULL;
CREATE INDEX idx_owners_tenant ON owners(tenantId) WHERE deletedAt IS NULL;

-- Vaccination expiry lookup
CREATE INDEX idx_vaccination_expiry ON vaccinations(tenantId, expiryDate)
WHERE deletedAt IS NULL;

-- Reservation lookups
CREATE INDEX idx_reservation_dates ON reservations(tenantId, checkInDate, checkOutDate)
WHERE deletedAt IS NULL;

-- User membership lookup
CREATE UNIQUE INDEX idx_membership_unique ON membership(userId, tenantId)
WHERE deletedAt IS NULL;
```

---

## Migration History

### Recent Schema Changes
1. **Consolidated Lambda Architecture** - No schema changes, just access patterns
2. **Added Vaccination Expiry Index** - For efficient expiry queries
3. **Multi-tenant isolation** - Added tenantId to all tables

### Pending Migrations
- Add audit_log table for compliance
- Add appointment scheduling tables
- Add inventory management tables