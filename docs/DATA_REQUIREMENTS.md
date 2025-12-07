# Barkbase Data Requirements

> **Generated:** 2025-12-06
> **Updated:** 2025-12-06 (with mandatory changes)
> **Purpose:** Document all entities, relationships, and data requirements discovered from frontend analysis
> **Status:** APPROVED - Ready for schema implementation

---

## Executive Summary

Based on comprehensive analysis of the frontend codebase and mandatory architectural requirements, **32 tables** are needed for a production-ready kennel management system.

### Final Table Count: 32 tables

| Category | Tables | Purpose |
|----------|--------|---------|
| Core/Auth | 6 | Tenant, User, UserSession, Role, Permission, RolePermission, UserRole |
| Customers | 4 | Owner, Pet, PetOwner (junction), Veterinarian |
| Health | 1 | Vaccination |
| Operations | 9 | Booking, BookingPet, Service, Kennel, Run, RunAssignment, Task, Incident |
| Financial | 5 | Invoice, InvoiceLine, Payment, Package, PackageService |
| Communication | 2 | Notification, Note |
| Configuration | 3 | TenantSettings, EmailTemplate, CustomProperty |
| Audit | 2 | AuditLog, DeletedRecord |
| **TOTAL** | **32** | |

### Key Design Decisions

1. **Proper RBAC** - Role/Permission tables instead of ENUM on User
2. **Veterinarian table** - Normalized vet info, not duplicated on Pet
3. **Kennel vs Run separation** - Housing vs Exercise/Play areas
4. **TenantSettings consolidation** - ONE table instead of 12+ settings tables
5. **DeletedRecord archive pattern** - Instead of deleted_at on every table
6. **RLS on all tenant tables** - Row-Level Security mandatory
7. **Composite indexes** - tenant_id as LEADING column on all indexes
8. **Money in BIGINT cents** - All prices stored in cents
9. **TIMESTAMPTZ everywhere** - Never TIMESTAMP without timezone
10. **UUID primary keys** - Using gen_random_uuid()

---

## Part 1: Core Entities (MUST HAVE)

### 1.1 Tenant (Multi-Tenancy Root)

**Purpose:** Root entity for multi-tenant isolation. Every other entity references this.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| slug | VARCHAR(50) | Yes | URL-friendly identifier (unique) |
| name | VARCHAR(200) | Yes | Business display name |
| plan | VARCHAR(20) | Yes | FREE, PRO, ENTERPRISE |
| feature_flags | JSONB | No | Feature toggles |
| created_at | TIMESTAMPTZ | Yes | Account creation |
| updated_at | TIMESTAMPTZ | Yes | Last modification |

**Frontend Usage:**
- `useTenantStore` - loaded at app init
- Header display, branding
- Feature gating based on plan
- URL routing via slug

**Relationships:**
- One-to-Many with ALL other tenant-scoped tables

**RLS Policy:** N/A (root table)

---

### 1.2 User (Authentication & Staff)

**Purpose:** Users who log into the system (staff, admins, owners).

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| cognito_sub | VARCHAR(100) | Yes | AWS Cognito link (unique) |
| email | VARCHAR(255) | Yes | Login identifier |
| first_name | VARCHAR(100) | Yes | Display name |
| last_name | VARCHAR(100) | Yes | Display name |
| phone | VARCHAR(20) | No | Contact |
| avatar_url | TEXT | No | Profile picture |
| is_active | BOOLEAN | Yes | Account status |
| last_login_at | TIMESTAMPTZ | No | Security tracking |
| created_at | TIMESTAMPTZ | Yes | Account creation |
| updated_at | TIMESTAMPTZ | Yes | Last modification |

**Note:** Role is NOT stored on User table - use UserRole junction table instead.

**Frontend Usage:**
- `useAuthStore` - authentication state
- Profile settings page
- Staff management
- Task assignment
- Audit trail (created_by, updated_by)

**Relationships:**
- Many-to-One with Tenant
- Many-to-Many with Role (via UserRole)
- One-to-Many with Task (assigned_to)
- One-to-Many with UserSession

**Indexes:**
- `idx_user_tenant_email ON "User" (tenant_id, email)`
- `idx_user_cognito ON "User" (cognito_sub)`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

### 1.3 UserSession (Security)

**Purpose:** Track active sessions for security and auto-logout.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| user_id | UUID | Yes | Session owner |
| tenant_id | UUID | Yes | Tenant isolation |
| session_token | VARCHAR(500) | Yes | JWT or session ID |
| ip_address | VARCHAR(45) | No | Security audit |
| user_agent | TEXT | No | Device tracking |
| is_active | BOOLEAN | Yes | Active session flag |
| session_start | TIMESTAMPTZ | Yes | Login time |
| last_activity | TIMESTAMPTZ | Yes | Last action |
| logged_out_at | TIMESTAMPTZ | No | Logout time |

**Frontend Usage:**
- Account security page - session list
- "Revoke all sessions" feature
- Auto-logout implementation

**Relationships:**
- Many-to-One with User
- Many-to-One with Tenant

**Indexes:**
- `idx_usersession_tenant_user ON "UserSession" (tenant_id, user_id)`
- `idx_usersession_active ON "UserSession" (tenant_id, is_active) WHERE is_active = true`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

### 1.4 Role (RBAC)

**Purpose:** Define roles that can be assigned to users.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| name | VARCHAR(50) | Yes | Role name (Admin, Manager, Staff, etc.) |
| description | TEXT | No | Role description |
| is_system | BOOLEAN | Yes | System roles can't be deleted |
| created_at | TIMESTAMPTZ | Yes | Creation date |
| updated_at | TIMESTAMPTZ | Yes | Last modification |

**Constraints:**
- UNIQUE(tenant_id, name)

**Frontend Usage:**
- Role management settings
- User role assignment
- Permission checks

**Relationships:**
- Many-to-One with Tenant
- Many-to-Many with Permission (via RolePermission)
- Many-to-Many with User (via UserRole)

**Indexes:**
- `idx_role_tenant_name ON "Role" (tenant_id, name)`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

### 1.5 Permission (RBAC)

**Purpose:** Define granular permissions that can be assigned to roles.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| code | VARCHAR(100) | Yes | Permission code (e.g., 'booking.create') |
| name | VARCHAR(100) | Yes | Display name |
| description | TEXT | No | What this permission allows |
| category | VARCHAR(50) | No | Grouping (bookings, customers, settings) |

**Note:** This is a GLOBAL table (not tenant-scoped). Permissions are system-defined.

**Constraints:**
- UNIQUE(code)

**Frontend Usage:**
- Permission display in role editor
- Authorization checks

**Relationships:**
- Many-to-Many with Role (via RolePermission)

**RLS Policy:** N/A (global table)

---

### 1.6 RolePermission (Junction)

**Purpose:** Links permissions to roles.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| role_id | UUID | Yes | FK to Role |
| permission_id | UUID | Yes | FK to Permission |

**Constraints:**
- PRIMARY KEY (role_id, permission_id)

**Frontend Usage:**
- Role editor - assign permissions

**Relationships:**
- Many-to-One with Role
- Many-to-One with Permission

**RLS Policy:** Via Role's tenant_id

---

### 1.7 UserRole (Junction)

**Purpose:** Links users to roles.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| user_id | UUID | Yes | FK to User |
| role_id | UUID | Yes | FK to Role |
| tenant_id | UUID | Yes | Tenant isolation |
| assigned_at | TIMESTAMPTZ | Yes | When assigned |
| assigned_by | UUID | No | Who assigned |

**Constraints:**
- PRIMARY KEY (user_id, role_id)

**Frontend Usage:**
- User management - role assignment
- Auth context - user roles

**Relationships:**
- Many-to-One with User
- Many-to-One with Role
- Many-to-One with Tenant

**Indexes:**
- `idx_userrole_tenant ON "UserRole" (tenant_id)`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

## Part 2: Customer Entities

### 2.1 Owner (Pet Parents/Customers)

**Purpose:** Customers who own pets and make bookings.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| first_name | VARCHAR(100) | Yes | Display name |
| last_name | VARCHAR(100) | Yes | Display name |
| email | VARCHAR(255) | No | Communication |
| phone | VARCHAR(20) | No | Communication |
| address_street | VARCHAR(255) | No | Location |
| address_city | VARCHAR(100) | No | Location |
| address_state | VARCHAR(50) | No | Location |
| address_zip | VARCHAR(20) | No | Location |
| address_country | CHAR(2) | No | Country code (US, CA, etc.) |
| emergency_contact_name | VARCHAR(200) | No | Emergency |
| emergency_contact_phone | VARCHAR(20) | No | Emergency |
| notes | TEXT | No | Internal notes |
| tags | TEXT[] | No | Categorization |
| stripe_customer_id | VARCHAR(100) | No | Stripe integration |
| is_active | BOOLEAN | Yes | Account status |
| created_at | TIMESTAMPTZ | Yes | Registration date |
| updated_at | TIMESTAMPTZ | Yes | Last modification |
| created_by | UUID | No | Staff who created |
| updated_by | UUID | No | Staff who modified |

**Frontend Usage:**
- Owner list/search (`/owners`)
- Owner detail page
- Booking wizard - owner selection
- Invoice generation
- Communication timeline

**Relationships:**
- Many-to-One with Tenant
- Many-to-Many with Pet (via PetOwner)
- One-to-Many with Booking
- One-to-Many with Invoice
- One-to-Many with Payment

**Indexes:**
- `idx_owner_tenant_name ON "Owner" (tenant_id, last_name, first_name)`
- `idx_owner_tenant_email ON "Owner" (tenant_id, email)`
- `idx_owner_tenant_phone ON "Owner" (tenant_id, phone)`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

### 2.2 Veterinarian

**Purpose:** Veterinary clinics/vets that provide care for pets.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| clinic_name | VARCHAR(200) | Yes | Clinic/practice name |
| vet_name | VARCHAR(100) | No | Primary vet name |
| phone | VARCHAR(20) | No | Contact phone |
| email | VARCHAR(255) | No | Contact email |
| address_street | VARCHAR(255) | No | Street address |
| address_city | VARCHAR(100) | No | City |
| address_state | VARCHAR(50) | No | State |
| address_zip | VARCHAR(20) | No | ZIP code |
| notes | TEXT | No | Internal notes |
| is_active | BOOLEAN | Yes | Still in use |
| created_at | TIMESTAMPTZ | Yes | Creation date |
| updated_at | TIMESTAMPTZ | Yes | Last modification |

**Frontend Usage:**
- Veterinarian dropdown in pet form
- Veterinarian management (settings)
- Pet detail - vet info display

**Relationships:**
- Many-to-One with Tenant
- One-to-Many with Pet

**Indexes:**
- `idx_vet_tenant_name ON "Veterinarian" (tenant_id, clinic_name)`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

### 2.3 Pet

**Purpose:** Animals that are booked for services.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| vet_id | UUID | No | FK to Veterinarian |
| name | VARCHAR(100) | Yes | Display name |
| species | VARCHAR(20) | Yes | DOG, CAT, OTHER |
| breed | VARCHAR(100) | No | Breed info |
| gender | VARCHAR(10) | No | MALE, FEMALE, UNKNOWN |
| color | VARCHAR(50) | No | Physical description |
| weight | DECIMAL(5,1) | No | Weight in lbs |
| date_of_birth | DATE | No | Age calculation |
| microchip_number | VARCHAR(50) | No | Identification |
| photo_url | TEXT | No | Pet photo |
| medical_notes | TEXT | No | Health info |
| dietary_notes | TEXT | No | Feeding instructions |
| behavior_notes | TEXT | No | Behavior observations |
| behavior_flags | TEXT[] | No | Flags: aggressive, anxious, etc. |
| status | VARCHAR(20) | Yes | ACTIVE, INACTIVE, DECEASED |
| is_active | BOOLEAN | Yes | Can be booked |
| created_at | TIMESTAMPTZ | Yes | Registration date |
| updated_at | TIMESTAMPTZ | Yes | Last modification |
| created_by | UUID | No | Staff who created |
| updated_by | UUID | No | Staff who modified |

**Note:** Vet info is now via vet_id FK to Veterinarian table, not duplicated columns.

**Frontend Usage:**
- Pet list/search (`/pets`)
- Pet detail drawer
- Pet form modal (create/edit)
- Booking wizard - pet selection
- Vaccination tracking
- Check-in/check-out forms

**Relationships:**
- Many-to-One with Tenant
- Many-to-One with Veterinarian
- Many-to-Many with Owner (via PetOwner)
- One-to-Many with Vaccination
- Many-to-Many with Booking (via BookingPet)
- One-to-Many with Task
- One-to-Many with Incident

**Indexes:**
- `idx_pet_tenant_name ON "Pet" (tenant_id, name)`
- `idx_pet_tenant_species ON "Pet" (tenant_id, species)`
- `idx_pet_vet ON "Pet" (vet_id)`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

### 2.4 PetOwner (Junction Table)

**Purpose:** Links pets to owners with relationship metadata.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| pet_id | UUID | Yes | FK to Pet |
| owner_id | UUID | Yes | FK to Owner |
| tenant_id | UUID | Yes | Tenant isolation |
| is_primary | BOOLEAN | Yes | Primary owner flag |
| relationship | VARCHAR(50) | No | Owner, Guardian, etc. |
| created_at | TIMESTAMPTZ | Yes | Link creation |

**Frontend Usage:**
- Owner detail - pets section
- Pet detail - owners section
- "Add pet to owner" mutation
- "Remove pet from owner" mutation

**Constraints:**
- PRIMARY KEY (pet_id, owner_id)
- One pet must have exactly one is_primary=true owner

**Indexes:**
- `idx_petowner_tenant ON "PetOwner" (tenant_id)`
- `idx_petowner_owner ON "PetOwner" (owner_id)`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

### 2.5 Vaccination

**Purpose:** Track pet vaccination records for compliance.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| pet_id | UUID | Yes | FK to Pet |
| type | VARCHAR(50) | Yes | Rabies, DHPP, Bordetella, etc. |
| administered_at | DATE | Yes | When given |
| expires_at | DATE | No | Expiration date |
| provider | VARCHAR(200) | No | Vet/clinic |
| lot_number | VARCHAR(50) | No | Batch tracking |
| document_url | TEXT | No | Certificate link |
| notes | TEXT | No | Additional info |
| created_at | TIMESTAMPTZ | Yes | Record creation |
| updated_at | TIMESTAMPTZ | Yes | Last modification |
| created_by | UUID | No | Staff who created |

**Frontend Usage:**
- Pet detail - vaccinations tab
- Vaccination form modal
- Expiring vaccinations report
- Booking validation (require vaccinations)
- Check-in verification

**Relationships:**
- Many-to-One with Pet
- Many-to-One with Tenant

**Indexes:**
- `idx_vaccination_tenant_pet ON "Vaccination" (tenant_id, pet_id)`
- `idx_vaccination_expires ON "Vaccination" (tenant_id, expires_at)`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

## Part 3: Operations Entities

### 3.1 Service

**Purpose:** Services offered by the facility (boarding, daycare, grooming).

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| name | VARCHAR(100) | Yes | Service name |
| description | TEXT | No | Service details |
| category | VARCHAR(30) | Yes | BOARDING, DAYCARE, GROOMING, TRAINING, ADD_ON |
| price_in_cents | BIGINT | Yes | Base price |
| duration_minutes | INTEGER | No | Service duration |
| is_active | BOOLEAN | Yes | Available for booking |
| sort_order | INTEGER | No | Display order |
| created_at | TIMESTAMPTZ | Yes | Creation date |
| updated_at | TIMESTAMPTZ | Yes | Last modification |

**Frontend Usage:**
- Services management (`/settings/services`)
- Booking wizard - service selection
- Price calculation
- Invoice line items

**Relationships:**
- Many-to-One with Tenant
- One-to-Many with Booking
- Many-to-Many with Package (via PackageService)

**Indexes:**
- `idx_service_tenant_category ON "Service" (tenant_id, category)`
- `idx_service_tenant_active ON "Service" (tenant_id, is_active) WHERE is_active = true`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

### 3.2 Kennel (Housing Unit)

**Purpose:** Physical enclosures where pets are HOUSED (sleep, rest).

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| name | VARCHAR(100) | Yes | Kennel name/number |
| size | VARCHAR(20) | No | SMALL, MEDIUM, LARGE, XLARGE |
| location | VARCHAR(100) | No | Building/zone location |
| max_occupancy | INTEGER | Yes | Max pets (usually 1) |
| is_active | BOOLEAN | Yes | Available for booking |
| created_at | TIMESTAMPTZ | Yes | Creation date |
| updated_at | TIMESTAMPTZ | Yes | Last modification |

**Note:** Kennel is for HOUSING only. Exercise/play areas are in Run table.

**Frontend Usage:**
- Kennels management (`/kennels`)
- Kennel form (create/edit)
- Booking wizard - kennel selection
- Calendar view - kennel rows
- Occupancy tracking

**Relationships:**
- Many-to-One with Tenant
- One-to-Many with Booking

**Indexes:**
- `idx_kennel_tenant_name ON "Kennel" (tenant_id, name)`
- `idx_kennel_tenant_active ON "Kennel" (tenant_id, is_active) WHERE is_active = true`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

### 3.3 Run (Exercise/Play Area)

**Purpose:** Exercise and play areas where pets go during daycare/playtime (separate from housing).

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| name | VARCHAR(100) | Yes | Run name ("Morning Play Group", etc.) |
| description | TEXT | No | Run details |
| capacity | INTEGER | Yes | Max pets |
| run_type | VARCHAR(50) | No | SOCIAL, INDIVIDUAL, TRAINING |
| is_active | BOOLEAN | Yes | Available for use |
| created_at | TIMESTAMPTZ | Yes | Creation date |
| updated_at | TIMESTAMPTZ | Yes | Last modification |

**Frontend Usage:**
- Run management
- Daycare scheduling
- Play group assignment

**Relationships:**
- Many-to-One with Tenant
- One-to-Many with RunAssignment

**Indexes:**
- `idx_run_tenant_name ON "Run" (tenant_id, name)`
- `idx_run_tenant_type ON "Run" (tenant_id, run_type)`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

### 3.4 RunAssignment

**Purpose:** Schedule pets into runs for exercise/play during their stay.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| run_id | UUID | Yes | FK to Run |
| booking_id | UUID | Yes | FK to Booking |
| pet_id | UUID | Yes | FK to Pet |
| assigned_date | DATE | Yes | Which day |
| start_time | TIME | No | Start time |
| end_time | TIME | No | End time |
| is_individual | BOOLEAN | No | Pet needs run alone |
| notes | TEXT | No | Assignment notes |
| created_at | TIMESTAMPTZ | Yes | Creation date |
| created_by | UUID | No | Staff who assigned |

**Frontend Usage:**
- Daycare scheduling view
- Run capacity planning
- Pet daily schedule

**Relationships:**
- Many-to-One with Tenant
- Many-to-One with Run
- Many-to-One with Booking
- Many-to-One with Pet

**Indexes:**
- `idx_runassignment_tenant_date ON "RunAssignment" (tenant_id, assigned_date)`
- `idx_runassignment_run_date ON "RunAssignment" (run_id, assigned_date)`
- `idx_runassignment_booking ON "RunAssignment" (booking_id)`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

### 3.5 Booking

**Purpose:** Reservations for pet services.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| owner_id | UUID | Yes | FK to Owner |
| service_id | UUID | Yes | FK to Service |
| kennel_id | UUID | No | FK to Kennel (for boarding) |
| check_in | TIMESTAMPTZ | Yes | Start date/time |
| check_out | TIMESTAMPTZ | Yes | End date/time |
| status | VARCHAR(20) | Yes | PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED, NO_SHOW |
| total_price_cents | BIGINT | Yes | Total charge |
| deposit_cents | BIGINT | No | Deposit collected |
| notes | TEXT | No | Booking notes |
| special_instructions | TEXT | No | Care instructions |
| checked_in_at | TIMESTAMPTZ | No | Actual check-in time |
| checked_out_at | TIMESTAMPTZ | No | Actual check-out time |
| checked_in_by | UUID | No | Staff who checked in |
| checked_out_by | UUID | No | Staff who checked out |
| cancelled_at | TIMESTAMPTZ | No | Cancellation time |
| cancellation_reason | TEXT | No | Why cancelled |
| created_at | TIMESTAMPTZ | Yes | Booking creation |
| updated_at | TIMESTAMPTZ | Yes | Last modification |
| created_by | UUID | No | Staff who created |
| updated_by | UUID | No | Staff who modified |

**Frontend Usage:**
- Bookings calendar (`/bookings`)
- Booking detail modal
- Booking wizard
- Check-in modal
- Check-out modal
- Today command center

**Relationships:**
- Many-to-One with Tenant
- Many-to-One with Owner
- Many-to-One with Service
- Many-to-One with Kennel
- Many-to-Many with Pet (via BookingPet)
- One-to-Many with Task
- One-to-Many with Incident
- One-to-Many with RunAssignment
- One-to-One with Invoice

**Indexes:**
- `idx_booking_tenant_checkin ON "Booking" (tenant_id, check_in)`
- `idx_booking_tenant_status ON "Booking" (tenant_id, status)`
- `idx_booking_tenant_owner ON "Booking" (tenant_id, owner_id)`
- `idx_booking_kennel ON "Booking" (kennel_id)`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

### 3.6 BookingPet (Junction Table)

**Purpose:** Links multiple pets to a single booking.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| booking_id | UUID | Yes | FK to Booking |
| pet_id | UUID | Yes | FK to Pet |
| tenant_id | UUID | Yes | Tenant isolation |
| created_at | TIMESTAMPTZ | Yes | Link creation |

**Frontend Usage:**
- Booking wizard - multi-pet selection
- Booking detail - pets list
- Calendar display

**Constraints:**
- PRIMARY KEY (booking_id, pet_id)

**Indexes:**
- `idx_bookingpet_tenant ON "BookingPet" (tenant_id)`
- `idx_bookingpet_pet ON "BookingPet" (pet_id)`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

### 3.7 Task

**Purpose:** Staff tasks related to pet care.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| title | VARCHAR(200) | Yes | Task description |
| description | TEXT | No | Details |
| task_type | VARCHAR(30) | Yes | FEEDING, MEDICATION, GROOMING, EXERCISE, CLEANING, ADMIN, OTHER |
| status | VARCHAR(20) | Yes | PENDING, IN_PROGRESS, COMPLETED, CANCELLED |
| priority | INTEGER | No | 1-5 (1=urgent) |
| due_at | TIMESTAMPTZ | No | Deadline |
| assigned_to | UUID | No | FK to User |
| booking_id | UUID | No | FK to Booking |
| pet_id | UUID | No | FK to Pet |
| completed_at | TIMESTAMPTZ | No | Completion time |
| completed_by | UUID | No | Staff who completed |
| notes | TEXT | No | Completion notes |
| created_at | TIMESTAMPTZ | Yes | Creation date |
| updated_at | TIMESTAMPTZ | Yes | Last modification |
| created_by | UUID | No | Staff who created |

**Frontend Usage:**
- Tasks page (`/tasks`)
- Task slideout form
- Today command center
- Booking detail - tasks section

**Relationships:**
- Many-to-One with Tenant
- Many-to-One with User (assigned_to)
- Many-to-One with Booking (optional)
- Many-to-One with Pet (optional)

**Indexes:**
- `idx_task_tenant_due ON "Task" (tenant_id, due_at)`
- `idx_task_tenant_status ON "Task" (tenant_id, status)`
- `idx_task_assigned ON "Task" (assigned_to)`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

### 3.8 Incident

**Purpose:** Record safety incidents and behavioral issues.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| title | VARCHAR(200) | Yes | Brief description |
| description | TEXT | Yes | Full details |
| incident_type | VARCHAR(30) | Yes | INJURY, ILLNESS, ESCAPE, BITE, FIGHT, PROPERTY_DAMAGE, BEHAVIOR, OTHER |
| severity | VARCHAR(20) | Yes | LOW, MEDIUM, HIGH, CRITICAL |
| status | VARCHAR(20) | Yes | OPEN, INVESTIGATING, RESOLVED, CLOSED |
| incident_date | TIMESTAMPTZ | Yes | When it happened |
| location | VARCHAR(100) | No | Where it happened |
| pet_id | UUID | No | FK to Pet |
| booking_id | UUID | No | FK to Booking |
| reported_by | UUID | Yes | FK to User |
| witnesses | TEXT | No | Witness names |
| immediate_actions | TEXT | No | Steps taken |
| vet_contacted | BOOLEAN | No | Was vet called |
| medical_treatment | TEXT | No | Treatment given |
| resolution_notes | TEXT | No | How resolved |
| resolved_at | TIMESTAMPTZ | No | Resolution time |
| resolved_by | UUID | No | FK to User |
| attachments | TEXT[] | No | Photo/document URLs |
| created_at | TIMESTAMPTZ | Yes | Report creation |
| updated_at | TIMESTAMPTZ | Yes | Last modification |

**Frontend Usage:**
- Incident form
- Incident list
- Pet detail - incident history
- Check-out - incident review

**Relationships:**
- Many-to-One with Tenant
- Many-to-One with Pet (optional)
- Many-to-One with Booking (optional)
- Many-to-One with User (reported_by)

**Indexes:**
- `idx_incident_tenant_date ON "Incident" (tenant_id, incident_date)`
- `idx_incident_tenant_status ON "Incident" (tenant_id, status)`
- `idx_incident_pet ON "Incident" (pet_id)`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

## Part 4: Financial Entities

### 4.1 Invoice

**Purpose:** Bills sent to customers.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| invoice_number | VARCHAR(50) | Yes | Display number (e.g., INV-001) |
| owner_id | UUID | Yes | FK to Owner |
| booking_id | UUID | No | FK to Booking |
| status | VARCHAR(20) | Yes | DRAFT, SENT, PAID, PARTIAL, OVERDUE, VOID |
| subtotal_cents | BIGINT | Yes | Before tax |
| tax_cents | BIGINT | No | Tax amount |
| discount_cents | BIGINT | No | Discount amount |
| total_cents | BIGINT | Yes | Final amount |
| paid_cents | BIGINT | No | Amount paid |
| due_date | DATE | No | Payment deadline |
| issued_at | TIMESTAMPTZ | No | When sent |
| paid_at | TIMESTAMPTZ | No | When fully paid |
| notes | TEXT | No | Invoice notes |
| created_at | TIMESTAMPTZ | Yes | Creation date |
| updated_at | TIMESTAMPTZ | Yes | Last modification |
| created_by | UUID | No | Staff who created |

**Frontend Usage:**
- Invoices page (`/invoices`)
- Invoice detail
- Check-out - invoice generation
- Owner detail - billing tab

**Relationships:**
- Many-to-One with Tenant
- Many-to-One with Owner
- Many-to-One with Booking (optional)
- One-to-Many with InvoiceLine
- One-to-Many with Payment

**Indexes:**
- `idx_invoice_tenant_date ON "Invoice" (tenant_id, created_at)`
- `idx_invoice_tenant_status ON "Invoice" (tenant_id, status)`
- `idx_invoice_owner ON "Invoice" (owner_id)`
- `idx_invoice_number ON "Invoice" (tenant_id, invoice_number)`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

### 4.2 InvoiceLine

**Purpose:** Individual line items on an invoice.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| invoice_id | UUID | Yes | FK to Invoice |
| description | VARCHAR(255) | Yes | Line item description |
| quantity | DECIMAL(10,2) | Yes | Quantity |
| unit_price_cents | BIGINT | Yes | Per-unit price |
| total_cents | BIGINT | Yes | Line total |
| taxable | BOOLEAN | No | Subject to tax |
| sort_order | INTEGER | No | Display order |

**Frontend Usage:**
- Invoice detail - line items
- Invoice creation

**Relationships:**
- Many-to-One with Invoice
- Many-to-One with Tenant

**Indexes:**
- `idx_invoiceline_invoice ON "InvoiceLine" (invoice_id)`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

### 4.3 Payment

**Purpose:** Payments received from customers.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| invoice_id | UUID | No | FK to Invoice |
| owner_id | UUID | Yes | FK to Owner |
| amount_cents | BIGINT | Yes | Payment amount |
| method | VARCHAR(30) | Yes | CARD, CASH, CHECK, BANK_TRANSFER, OTHER |
| status | VARCHAR(20) | Yes | PENDING, SUCCEEDED, FAILED, REFUNDED |
| stripe_payment_intent_id | VARCHAR(100) | No | Stripe reference |
| notes | TEXT | No | Payment notes |
| processed_at | TIMESTAMPTZ | No | When processed |
| processed_by | UUID | No | Staff who processed |
| created_at | TIMESTAMPTZ | Yes | Creation date |
| updated_at | TIMESTAMPTZ | Yes | Last modification |

**Frontend Usage:**
- Payments page (`/payments`)
- Payment transactions list
- Invoice - mark as paid
- Check-out - collect payment

**Relationships:**
- Many-to-One with Tenant
- Many-to-One with Invoice (optional)
- Many-to-One with Owner

**Indexes:**
- `idx_payment_tenant_date ON "Payment" (tenant_id, created_at)`
- `idx_payment_tenant_status ON "Payment" (tenant_id, status)`
- `idx_payment_invoice ON "Payment" (invoice_id)`
- `idx_payment_owner ON "Payment" (owner_id)`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

### 4.4 Package (Service Bundles)

**Purpose:** Bundled services at reduced price (e.g., "2 weeks boarding + training = 10% off").

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| name | VARCHAR(100) | Yes | Package name |
| description | TEXT | No | Package details |
| price_in_cents | BIGINT | Yes | Package price |
| discount_percent | INTEGER | No | Discount percentage |
| is_active | BOOLEAN | Yes | Available for purchase |
| created_at | TIMESTAMPTZ | Yes | Creation date |
| updated_at | TIMESTAMPTZ | Yes | Last modification |

**Frontend Usage:**
- Package management
- Booking - select package
- Package purchase

**Relationships:**
- Many-to-One with Tenant
- Many-to-Many with Service (via PackageService)

**Indexes:**
- `idx_package_tenant_active ON "Package" (tenant_id, is_active) WHERE is_active = true`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

### 4.5 PackageService (Junction)

**Purpose:** Links services to packages with quantities.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| package_id | UUID | Yes | FK to Package |
| service_id | UUID | Yes | FK to Service |
| quantity | INTEGER | Yes | How many of this service |

**Constraints:**
- PRIMARY KEY (package_id, service_id)

**Frontend Usage:**
- Package builder
- Package details display

**Relationships:**
- Many-to-One with Package
- Many-to-One with Service

**RLS Policy:** Via Package's tenant_id

---

## Part 5: Communication Entities

### 5.1 Notification

**Purpose:** In-app notifications for users.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| user_id | UUID | Yes | FK to User |
| type | VARCHAR(50) | Yes | booking_reminder, task_assigned, etc. |
| title | VARCHAR(200) | Yes | Notification title |
| message | TEXT | Yes | Notification body |
| is_read | BOOLEAN | Yes | Read status |
| read_at | TIMESTAMPTZ | No | When read |
| related_entity_type | VARCHAR(50) | No | booking, pet, task |
| related_entity_id | UUID | No | Entity reference |
| created_at | TIMESTAMPTZ | Yes | Creation date |

**Frontend Usage:**
- Notification bell/dropdown
- Notification center
- Unread count badge

**Relationships:**
- Many-to-One with Tenant
- Many-to-One with User

**Indexes:**
- `idx_notification_tenant_user ON "Notification" (tenant_id, user_id)`
- `idx_notification_unread ON "Notification" (tenant_id, user_id, is_read) WHERE is_read = false`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

### 5.2 Note (Internal Notes)

**Purpose:** Internal staff notes on entities.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| entity_type | VARCHAR(50) | Yes | owner, pet, booking |
| entity_id | UUID | Yes | Entity reference |
| content | TEXT | Yes | Note content |
| note_type | VARCHAR(20) | No | GENERAL, IMPORTANT, INFO, HIGHLIGHT |
| is_pinned | BOOLEAN | No | Pin to top |
| created_at | TIMESTAMPTZ | Yes | Creation date |
| updated_at | TIMESTAMPTZ | Yes | Last modification |
| created_by | UUID | Yes | Staff who created |

**Frontend Usage:**
- Owner detail - notes tab
- Pet detail - notes
- Note slideout form

**Relationships:**
- Many-to-One with Tenant
- Many-to-One with User (created_by)
- Polymorphic to Owner, Pet, Booking

**Indexes:**
- `idx_note_tenant_entity ON "Note" (tenant_id, entity_type, entity_id)`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

## Part 6: Configuration Entities

### 6.1 TenantSettings (Consolidated Settings)

**Purpose:** ALL tenant-specific settings in ONE table.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| tenant_id | UUID | Yes | PK, FK to Tenant |
| timezone | VARCHAR(50) | Yes | IANA timezone |
| currency | CHAR(3) | Yes | USD, EUR, GBP |
| date_format | VARCHAR(20) | Yes | MM/DD/YYYY, etc. |
| time_format | VARCHAR(10) | Yes | 12h or 24h |
| language | VARCHAR(10) | Yes | en, es, fr |
| business_name | VARCHAR(200) | No | Display name |
| business_phone | VARCHAR(20) | No | Contact |
| business_email | VARCHAR(255) | No | Contact |
| business_address | TEXT | No | Full address |
| default_check_in_time | TIME | No | Default: 09:00 |
| default_check_out_time | TIME | No | Default: 17:00 |
| booking_buffer_minutes | INTEGER | No | Between bookings |
| max_advance_booking_days | INTEGER | No | How far ahead |
| min_advance_booking_hours | INTEGER | No | Minimum notice |
| allow_online_booking | BOOLEAN | No | Public booking |
| require_deposit | BOOLEAN | No | Deposit required |
| deposit_percent | INTEGER | No | Deposit percentage |
| require_vaccinations | BOOLEAN | No | Block unvaccinated |
| cancellation_window_hours | INTEGER | No | Free cancellation |
| tax_rate | DECIMAL(5,4) | No | Tax percentage |
| tax_name | VARCHAR(50) | No | "Sales Tax" |
| invoice_prefix | VARCHAR(10) | No | INV- |
| invoice_footer | TEXT | No | Footer text |
| notification_prefs | JSONB | No | Email/SMS toggles |
| email_templates | JSONB | No | Template overrides |
| business_hours | JSONB | No | Weekly hours |
| branding | JSONB | No | Colors, logo |
| integrations | JSONB | No | Stripe, Twilio keys |
| custom_fields | JSONB | No | Custom property defs |
| created_at | TIMESTAMPTZ | Yes | Creation |
| updated_at | TIMESTAMPTZ | Yes | Last change |

**Frontend Usage:**
- Settings pages (all of them)
- Booking validation
- Invoice generation
- Email sending

**Relationships:**
- One-to-One with Tenant

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

### 6.2 EmailTemplate

**Purpose:** Customizable email templates.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| type | VARCHAR(50) | Yes | booking_confirmation, etc. |
| name | VARCHAR(100) | Yes | Template name |
| subject | VARCHAR(255) | Yes | Email subject |
| body | TEXT | Yes | HTML body |
| variables | JSONB | No | Available variables |
| is_active | BOOLEAN | Yes | Enabled |
| created_at | TIMESTAMPTZ | Yes | Creation |
| updated_at | TIMESTAMPTZ | Yes | Last change |

**Frontend Usage:**
- Email settings - templates
- Template preview

**Relationships:**
- Many-to-One with Tenant

**Indexes:**
- `idx_emailtemplate_tenant_type ON "EmailTemplate" (tenant_id, type)`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

### 6.3 CustomProperty (Enterprise Feature)

**Purpose:** Custom field definitions for entities.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| entity_type | VARCHAR(50) | Yes | pet, owner, booking |
| field_name | VARCHAR(100) | Yes | Internal name |
| display_label | VARCHAR(100) | Yes | UI label |
| field_type | VARCHAR(30) | Yes | TEXT, NUMBER, DATE, SELECT, etc. |
| options | JSONB | No | Select options |
| is_required | BOOLEAN | No | Required field |
| default_value | TEXT | No | Default |
| sort_order | INTEGER | No | Display order |
| is_active | BOOLEAN | Yes | Enabled |
| created_at | TIMESTAMPTZ | Yes | Creation |
| updated_at | TIMESTAMPTZ | Yes | Last change |

**Frontend Usage:**
- Custom fields settings (Enterprise)
- Dynamic forms

**Relationships:**
- Many-to-One with Tenant

**Indexes:**
- `idx_customproperty_tenant_entity ON "CustomProperty" (tenant_id, entity_type)`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

## Part 7: Audit Entities

### 7.1 AuditLog

**Purpose:** Track all data changes for compliance.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| user_id | UUID | No | Who made change |
| action | VARCHAR(20) | Yes | CREATE, UPDATE, DELETE, LOGIN |
| entity_type | VARCHAR(50) | Yes | Table name |
| entity_id | UUID | Yes | Record ID |
| changes | JSONB | No | Before/after values |
| ip_address | VARCHAR(45) | No | User IP |
| user_agent | TEXT | No | Browser/device |
| created_at | TIMESTAMPTZ | Yes | When it happened |

**Frontend Usage:**
- Audit log viewer (Admin)
- Security monitoring

**Notes:**
- Append-only table (no updates/deletes)
- Consider partitioning by date

**Indexes:**
- `idx_auditlog_tenant_date ON "AuditLog" (tenant_id, created_at)`
- `idx_auditlog_tenant_entity ON "AuditLog" (tenant_id, entity_type, entity_id)`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

### 7.2 DeletedRecord (Soft Delete Archive)

**Purpose:** Archive deleted records instead of deleted_at columns.

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| original_table | VARCHAR(100) | Yes | Source table |
| original_id | UUID | Yes | Original PK |
| data | JSONB | Yes | Full record JSON |
| deleted_at | TIMESTAMPTZ | Yes | Deletion time |
| deleted_by | UUID | No | Who deleted |

**Frontend Usage:**
- Data recovery (Admin)
- Compliance retention

**Notes:**
- Centralizes soft delete pattern
- Removes need for deleted_at on every table

**Indexes:**
- `idx_deletedrecord_tenant ON "DeletedRecord" (tenant_id)`
- `idx_deletedrecord_table ON "DeletedRecord" (original_table, original_id)`

**RLS Policy:** `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

## Part 8: Complete Relationships Summary

### Entity Relationship Map

```
Tenant (1) ────────────────────────────────────────────────────────────────┐
    │                                                                       │
    ├── (1:1) TenantSettings                                                │
    │                                                                       │
    ├── (1:N) User ─────────────────────────────────────────────────────────┤
    │       ├── (1:N) UserSession                                           │
    │       ├── (M:N) Role ─── via UserRole junction                        │
    │       ├── (1:N) Task (assigned_to)                                    │
    │       └── (1:N) Notification                                          │
    │                                                                       │
    ├── (1:N) Role ─────────────────────────────────────────────────────────┤
    │       └── (M:N) Permission ─── via RolePermission junction            │
    │                                                                       │
    ├── (1:N) Permission (global, no tenant_id)                             │
    │                                                                       │
    ├── (1:N) Veterinarian ─────────────────────────────────────────────────┤
    │       └── (1:N) Pet                                                   │
    │                                                                       │
    ├── (1:N) Owner ────────────────────────────────────────────────────────┤
    │       ├── (M:N) Pet ─── via PetOwner junction                         │
    │       ├── (1:N) Booking                                               │
    │       ├── (1:N) Invoice                                               │
    │       └── (1:N) Payment                                               │
    │                                                                       │
    ├── (1:N) Pet ──────────────────────────────────────────────────────────┤
    │       ├── (M:N) Owner ─── via PetOwner junction                       │
    │       ├── (M:1) Veterinarian                                          │
    │       ├── (1:N) Vaccination                                           │
    │       ├── (M:N) Booking ─── via BookingPet junction                   │
    │       ├── (1:N) Task                                                  │
    │       ├── (1:N) Incident                                              │
    │       └── (1:N) RunAssignment                                         │
    │                                                                       │
    ├── (1:N) Service ──────────────────────────────────────────────────────┤
    │       ├── (1:N) Booking                                               │
    │       └── (M:N) Package ─── via PackageService junction               │
    │                                                                       │
    ├── (1:N) Kennel (HOUSING) ─────────────────────────────────────────────┤
    │       └── (1:N) Booking                                               │
    │                                                                       │
    ├── (1:N) Run (EXERCISE/PLAY) ──────────────────────────────────────────┤
    │       └── (1:N) RunAssignment                                         │
    │                                                                       │
    ├── (1:N) Booking ──────────────────────────────────────────────────────┤
    │       ├── (M:N) Pet ─── via BookingPet junction                       │
    │       ├── (1:N) Task                                                  │
    │       ├── (1:N) Incident                                              │
    │       ├── (1:N) RunAssignment                                         │
    │       └── (1:1) Invoice                                               │
    │                                                                       │
    ├── (1:N) Package ──────────────────────────────────────────────────────┤
    │       └── (M:N) Service ─── via PackageService junction               │
    │                                                                       │
    ├── (1:N) Invoice ──────────────────────────────────────────────────────┤
    │       ├── (1:N) InvoiceLine                                           │
    │       └── (1:N) Payment                                               │
    │                                                                       │
    ├── (1:N) EmailTemplate                                                 │
    ├── (1:N) CustomProperty                                                │
    ├── (1:N) Note (polymorphic)                                            │
    ├── (1:N) AuditLog                                                      │
    └── (1:N) DeletedRecord                                                 │
```

### Junction Tables Summary

| Junction | Left Entity | Right Entity | Extra Fields |
|----------|-------------|--------------|--------------|
| PetOwner | Pet | Owner | is_primary, relationship |
| BookingPet | Booking | Pet | (none) |
| RolePermission | Role | Permission | (none) |
| UserRole | User | Role | assigned_at, assigned_by |
| PackageService | Package | Service | quantity |
| RunAssignment | Run + Booking | Pet | assigned_date, times, notes |

---

## Part 9: Mandatory Requirements Checklist

All of the following MUST be implemented in the schema:

- [x] **Veterinarian table** - Normalized vet info, Pet.vet_id FK
- [x] **Run + RunAssignment tables** - Separate from Kennel for exercise/play
- [x] **Role + Permission + RolePermission + UserRole** - Proper RBAC
- [x] **Package + PackageService** - Service bundles with quantities
- [x] **RLS policies on ALL tenant-scoped tables** - `tenant_id = current_setting('app.current_tenant_id')::uuid`
- [x] **Composite indexes with tenant_id LEADING** - On all frequently queried tables
- [x] **BIGINT for all money fields** - price_in_cents, amount_cents, etc.
- [x] **TIMESTAMPTZ for all timestamps** - Never TIMESTAMP without timezone
- [x] **UUID primary keys** - Using gen_random_uuid()

---

## Next Steps

1. Create SCHEMA_ERD.md with Mermaid diagram
2. Create NEW_SCHEMA.sql with all DDL, indexes, RLS policies
3. Create SEED_DATA.sql with demo data
4. Create environment templates

**Ready to proceed with schema implementation.**
