# Properties System Mapping

This document maps ALL database columns to system properties that will be displayed in the Properties management interface at `/settings/properties`.

## Property Metadata Structure

Each property has:
- `name`: Internal API name (matches DB column)
- `label`: Display name in UI
- `description`: Help text explaining the property
- `type`: Field type (string, number, date, enum, boolean, etc.)
- `objectType`: Which object it belongs to (pets, owners, bookings, etc.)
- `isSystem`: true = BarkBase system property (read-only), false = custom property
- `isRequired`: Whether the field is required
- `isVisible`: Whether shown in UI by default
- `group`: Grouping category for organization
- `options`: For enum/select fields

---

## 1. PETS Properties

### Basic Information Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `recordId` | Record ID | string | Yes | Unique identifier (system) |
| `name` | Pet Name | string | Yes | The pet's name |
| `species` | Species | enum | No | Type of animal (Dog, Cat, etc.) |
| `breed` | Breed | string | No | Pet breed or mix |
| `birthdate` | Date of Birth | date | No | Pet's birthdate |
| `weight` | Weight | number | No | Current weight in pounds |
| `photoUrl` | Photo | file | No | Pet profile photo URL |
| `status` | Status | enum | Yes | Active, Inactive, Deceased |
| `primaryOwnerId` | Primary Owner | user | No | Link to primary owner |

### Medical Information Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `medicalNotes` | Medical Notes | text | No | General medical information |
| `allergies` | Allergies | text | No | Known allergies |
| `dietaryNotes` | Dietary Notes | text | No | Feeding instructions and restrictions |
| `lastVetVisit` | Last Vet Visit | date | No | Date of last veterinary visit |
| `nextAppointment` | Next Appointment | datetime | No | Upcoming vet appointment |

### Behavior Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `behaviorFlags` | Behavior Flags | multi_enum | No | Behavioral traits (friendly, anxious, aggressive, etc.) |

### System Fields Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `tenantId` | Tenant | string | Yes | Organization identifier (system) |
| `createdAt` | Created Date | datetime | Yes | Record creation timestamp (system) |
| `updatedAt` | Last Modified | datetime | Yes | Last update timestamp (system) |

---

## 2. OWNERS Properties

### Contact Information Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `recordId` | Record ID | string | Yes | Unique identifier (system) |
| `firstName` | First Name | string | Yes | Owner's first name |
| `lastName` | Last Name | string | Yes | Owner's last name |
| `email` | Email Address | email | No | Primary email address |
| `phone` | Phone Number | phone | No | Primary phone number |

### Address Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `address` | Address | json | Yes | Full address (street, city, state, zip, country) |
| `address.street` | Street Address | string | No | Street address line 1 |
| `address.street2` | Address Line 2 | string | No | Apartment, suite, etc. |
| `address.city` | City | string | No | City |
| `address.state` | State/Province | string | No | State or province |
| `address.zip` | ZIP/Postal Code | string | No | Postal code |
| `address.country` | Country | string | No | Country |

### System Fields Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `tenantId` | Tenant | string | Yes | Organization identifier (system) |
| `createdAt` | Created Date | datetime | Yes | Record creation timestamp (system) |
| `updatedAt` | Last Modified | datetime | Yes | Last update timestamp (system) |

---

## 3. BOOKINGS Properties

### Booking Details Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `recordId` | Record ID | string | Yes | Unique identifier (system) |
| `petId` | Pet | user | Yes | Associated pet |
| `ownerId` | Owner | user | Yes | Associated owner |
| `status` | Booking Status | enum | Yes | PENDING, CONFIRMED, CHECKED_IN, IN_PROGRESS, CHECKED_OUT, COMPLETED, CANCELLED |
| `checkIn` | Check-In Date | datetime | Yes | Scheduled check-in date and time |
| `checkOut` | Check-Out Date | datetime | Yes | Scheduled check-out date and time |
| `source` | Booking Source | enum | No | portal, phone, email, walk-in |

### Financial Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `depositCents` | Deposit Amount | currency | No | Deposit paid in cents |
| `totalCents` | Total Amount | currency | No | Total booking cost in cents |
| `balanceDueCents` | Balance Due | currency | No | Remaining balance in cents |

### Notes Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `notes` | Internal Notes | text | No | Staff notes about the booking |
| `specialInstructions` | Special Instructions | text | No | Owner's special instructions |

### System Fields Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `tenantId` | Tenant | string | Yes | Organization identifier (system) |
| `createdAt` | Created Date | datetime | Yes | Record creation timestamp (system) |
| `updatedAt` | Last Modified | datetime | Yes | Last update timestamp (system) |

---

## 4. KENNELS Properties

### Kennel Details Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `recordId` | Record ID | string | Yes | Unique identifier (system) |
| `name` | Kennel Name | string | Yes | Identifier name/number |
| `type` | Accommodation Type | enum | Yes | SUITE, KENNEL, CABIN, DAYCARE, MEDICAL |
| `size` | Size | enum | No | Small, Medium, Large, XL |
| `capacity` | Capacity | number | Yes | Maximum number of pets |
| `isActive` | Active | boolean | Yes | Whether kennel is available for booking |

### Location Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `location` | General Location | string | No | Building or area description |
| `building` | Building | string | No | Building identifier |
| `zone` | Zone/Area | string | No | Specific zone or section |

### Pricing Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `hourlyRate` | Hourly Rate | currency | No | Rate per hour in cents |
| `dailyRate` | Daily Rate | currency | No | Rate per day in cents |
| `weeklyRate` | Weekly Rate | currency | No | Rate per week in cents |

### Features Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `amenities` | Amenities | multi_enum | No | Features (climate control, webcam, etc.) |
| `notes` | Notes | text | No | Additional information |

### System Fields Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `tenantId` | Tenant | string | Yes | Organization identifier (system) |
| `createdAt` | Created Date | datetime | Yes | Record creation timestamp (system) |
| `updatedAt` | Last Modified | datetime | Yes | Last update timestamp (system) |

---

## 5. SERVICES Properties

### Service Details Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `recordId` | Record ID | string | Yes | Unique identifier (system) |
| `name` | Service Name | string | Yes | Name of the service |
| `description` | Description | text | No | Detailed description |
| `category` | Category | enum | Yes | BOARDING, DAYCARE, GROOMING, TRAINING, OTHER |
| `priceCents` | Price | currency | Yes | Service price in cents |
| `isActive` | Active | boolean | Yes | Whether service is available |

### System Fields Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `tenantId` | Tenant | string | Yes | Organization identifier (system) |
| `createdAt` | Created Date | datetime | Yes | Record creation timestamp (system) |
| `updatedAt` | Last Modified | datetime | Yes | Last update timestamp (system) |

---

## 6. STAFF Properties

### Staff Details Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `recordId` | Record ID | string | Yes | Unique identifier (system) |
| `membershipId` | Membership | user | Yes | Link to user membership |
| `title` | Job Title | string | No | Staff position/title |
| `phone` | Phone Number | phone | No | Contact phone number |
| `schedule` | Schedule | json | Yes | Work schedule configuration |

### System Fields Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `tenantId` | Tenant | string | Yes | Organization identifier (system) |
| `createdAt` | Created Date | datetime | Yes | Record creation timestamp (system) |
| `updatedAt` | Last Modified | datetime | Yes | Last update timestamp (system) |

---

## 7. VACCINATIONS Properties

### Vaccination Details Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `recordId` | Record ID | string | Yes | Unique identifier (system) |
| `petId` | Pet | user | Yes | Associated pet |
| `type` | Vaccination Type | enum | Yes | Rabies, DHPP, Bordetella, etc. |
| `administeredAt` | Date Administered | date | Yes | When vaccine was given |
| `expiresAt` | Expiration Date | date | Yes | When vaccine expires |
| `documentUrl` | Document | file | No | Upload of vaccination certificate |
| `reminderSentAt` | Reminder Sent | datetime | No | When reminder was sent |
| `notes` | Notes | text | No | Additional information |

### System Fields Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `tenantId` | Tenant | string | Yes | Organization identifier (system) |
| `createdAt` | Created Date | datetime | Yes | Record creation timestamp (system) |
| `updatedAt` | Last Modified | datetime | Yes | Last update timestamp (system) |

---

## 8. PAYMENTS Properties

### Payment Details Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `recordId` | Record ID | string | Yes | Unique identifier (system) |
| `bookingId` | Booking | user | No | Associated booking |
| `ownerId` | Owner | user | Yes | Customer who made payment |
| `amountCents` | Amount | currency | Yes | Payment amount in cents |
| `currency` | Currency | enum | Yes | USD, CAD, EUR, etc. |
| `status` | Payment Status | enum | Yes | PENDING, AUTHORIZED, CAPTURED, SUCCESSFUL, REFUNDED, FAILED |
| `method` | Payment Method | enum | No | card, cash, check, bank_transfer |
| `externalId` | External ID | string | No | Payment processor transaction ID |
| `intentId` | Intent ID | string | No | Payment intent ID |
| `capturedAt` | Captured At | datetime | No | When payment was captured |
| `metadata` | Metadata | json | Yes | Additional payment data |

### System Fields Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `tenantId` | Tenant | string | Yes | Organization identifier (system) |
| `createdAt` | Created Date | datetime | Yes | Record creation timestamp (system) |
| `updatedAt` | Last Modified | datetime | Yes | Last update timestamp (system) |

---

## 9. CHECK-INS Properties

### Check-In Details Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `recordId` | Record ID | string | Yes | Unique identifier (system) |
| `bookingId` | Booking | user | Yes | Associated booking |
| `staffId` | Staff Member | user | No | Staff who performed check-in |
| `time` | Check-In Time | datetime | Yes | Actual check-in timestamp |
| `weight` | Weight | number | No | Pet weight at check-in |
| `conditionRating` | Condition Rating | score | No | Pet condition score (1-5) |
| `photos` | Photos | file | No | Check-in photos |
| `notes` | Notes | text | No | Check-in observations |

### System Fields Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `tenantId` | Tenant | string | Yes | Organization identifier (system) |
| `createdAt` | Created Date | datetime | Yes | Record creation timestamp (system) |
| `updatedAt` | Last Modified | datetime | Yes | Last update timestamp (system) |

---

## 10. CHECK-OUTS Properties

### Check-Out Details Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `recordId` | Record ID | string | Yes | Unique identifier (system) |
| `bookingId` | Booking | user | Yes | Associated booking |
| `staffId` | Staff Member | user | No | Staff who performed check-out |
| `time` | Check-Out Time | datetime | Yes | Actual check-out timestamp |
| `incidentReportId` | Incident Report | user | No | Link to any incident report |
| `extraCharges` | Extra Charges | json | No | Additional charges applied |
| `signatureUrl` | Signature | file | No | Customer signature |

### System Fields Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `tenantId` | Tenant | string | Yes | Organization identifier (system) |
| `createdAt` | Created Date | datetime | Yes | Record creation timestamp (system) |
| `updatedAt` | Last Modified | datetime | Yes | Last update timestamp (system) |

---

## 11. INCIDENT REPORTS Properties

### Incident Details Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `recordId` | Record ID | string | Yes | Unique identifier (system) |
| `petId` | Pet | user | Yes | Pet involved in incident |
| `bookingId` | Booking | user | No | Associated booking |
| `occurredAt` | Occurrence Time | datetime | Yes | When incident occurred |
| `severity` | Severity | enum | Yes | MINOR, MODERATE, SEVERE, CRITICAL |
| `narrative` | Description | text | Yes | Detailed incident description |
| `photos` | Photos | file | No | Incident photos |
| `vetContacted` | Vet Contacted | boolean | Yes | Whether veterinarian was contacted |

### System Fields Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `tenantId` | Tenant | string | Yes | Organization identifier (system) |
| `createdAt` | Created Date | datetime | Yes | Record creation timestamp (system) |
| `updatedAt` | Last Modified | datetime | Yes | Last update timestamp (system) |

---

## 12. COMMUNICATIONS Properties

### Communication Details Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `recordId` | Record ID | string | Yes | Unique identifier (system) |
| `ownerId` | Owner | user | Yes | Customer being communicated with |
| `userId` | Staff Member | user | Yes | Staff member handling communication |
| `type` | Type | enum | Yes | EMAIL, SMS, CALL, NOTE, SYSTEM |
| `direction` | Direction | enum | Yes | INBOUND, OUTBOUND, INTERNAL |
| `subject` | Subject | string | No | Communication subject/topic |
| `content` | Content | text | Yes | Communication body/details |
| `metadata` | Metadata | json | No | Additional data (attachments, etc.) |

### System Fields Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `tenantId` | Tenant | string | Yes | Organization identifier (system) |
| `createdAt` | Created Date | datetime | Yes | Record creation timestamp (system) |
| `updatedAt` | Last Modified | datetime | Yes | Last update timestamp (system) |

---

## 13. NOTES Properties

### Note Details Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `recordId` | Record ID | string | Yes | Unique identifier (system) |
| `entityType` | Entity Type | enum | Yes | What object this note is about (Pet, Owner, Booking, etc.) |
| `entityId` | Entity ID | string | Yes | ID of the entity |
| `category` | Category | enum | No | Note categorization |
| `content` | Content | text | Yes | Note text |
| `visibility` | Visibility | enum | Yes | ALL, STAFF, ADMIN, PRIVATE |
| `isPinned` | Pinned | boolean | Yes | Whether note is pinned to top |
| `authorId` | Author | user | Yes | Staff member who created note |

### System Fields Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `tenantId` | Tenant | string | Yes | Organization identifier (system) |
| `createdAt` | Created Date | datetime | Yes | Record creation timestamp (system) |
| `updatedAt` | Last Modified | datetime | Yes | Last update timestamp (system) |

---

## 14. TASKS Properties

### Task Details Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `recordId` | Record ID | string | Yes | Unique identifier (system) |
| `type` | Task Type | enum | Yes | FEEDING, MEDICATION, EXERCISE, CLEANING, HEALTH_CHECK, SPECIAL_CARE |
| `relatedType` | Related To | enum | Yes | Type of related entity (Pet, Booking, etc.) |
| `relatedId` | Related ID | string | Yes | ID of related entity |
| `assignedTo` | Assigned To | user | No | Staff member assigned |
| `scheduledFor` | Scheduled For | datetime | Yes | When task should be completed |
| `completedAt` | Completed At | datetime | No | When task was completed |
| `completedBy` | Completed By | user | No | Staff member who completed task |
| `priority` | Priority | enum | Yes | LOW, NORMAL, HIGH, URGENT |
| `notes` | Notes | text | No | Task details |

### System Fields Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `tenantId` | Tenant | string | Yes | Organization identifier (system) |
| `createdAt` | Created Date | datetime | Yes | Record creation timestamp (system) |
| `updatedAt` | Last Modified | datetime | Yes | Last update timestamp (system) |

---

## 15. RUNS (Daycare) Properties

### Run Details Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `recordId` | Record ID | string | Yes | Unique identifier (system) |
| `templateId` | Template | user | No | Associated run template |
| `name` | Run Name | string | Yes | Name of the run session |
| `date` | Date | date | Yes | Date of the run |
| `scheduleTime` | Scheduled Time | string | Yes | Time slot (HH:MM) |
| `capacity` | Capacity | number | Yes | Maximum number of pets |
| `assignedPets` | Assigned Pets | json | Yes | Array of assigned pet IDs |
| `isActive` | Active | boolean | Yes | Whether run is available |

### System Fields Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `tenantId` | Tenant | string | Yes | Organization identifier (system) |
| `createdAt` | Created Date | datetime | Yes | Record creation timestamp (system) |
| `updatedAt` | Last Modified | datetime | Yes | Last update timestamp (system) |

---

## 16. RUN TEMPLATES Properties

### Template Details Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `recordId` | Record ID | string | Yes | Unique identifier (system) |
| `name` | Template Name | string | Yes | Name of the template |
| `timePeriodMinutes` | Time Period | number | Yes | Duration in minutes |
| `capacityType` | Capacity Type | enum | Yes | total, per_size_group |
| `maxCapacity` | Maximum Capacity | number | Yes | Max number of pets |
| `isActive` | Active | boolean | Yes | Whether template is available |

### System Fields Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `tenantId` | Tenant | string | Yes | Organization identifier (system) |
| `createdAt` | Created Date | datetime | Yes | Record creation timestamp (system) |
| `updatedAt` | Last Modified | datetime | Yes | Last update timestamp (system) |

---

## 17. USERS Properties

### User Profile Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `recordId` | Record ID | string | Yes | Unique identifier (system) |
| `email` | Email Address | email | Yes | Login email |
| `name` | Full Name | string | No | User's full name |
| `phone` | Phone Number | phone | No | Contact phone |
| `avatarUrl` | Avatar | file | No | Profile photo URL |
| `timezone` | Timezone | enum | No | User's timezone |
| `language` | Language | enum | No | Preferred language |
| `preferences` | Preferences | json | No | User preferences |

### Account Status Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `isActive` | Active | boolean | Yes | Account enabled status |
| `emailVerified` | Email Verified | boolean | Yes | Email verification status |
| `lastLoginAt` | Last Login | datetime | No | Most recent login timestamp |

### System Fields Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `createdAt` | Created Date | datetime | Yes | Record creation timestamp (system) |
| `updatedAt` | Last Modified | datetime | Yes | Last update timestamp (system) |

---

## 18. INVOICES (Future) Properties

### Invoice Details Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `recordId` | Record ID | string | Yes | Unique identifier (system) |
| `ownerId` | Customer | user | Yes | Customer being invoiced |
| `invoiceNumber` | Invoice Number | string | Yes | Invoice identifier |
| `issueDate` | Issue Date | date | Yes | When invoice was created |
| `dueDate` | Due Date | date | Yes | Payment due date |
| `status` | Status | enum | Yes | DRAFT, SENT, PAID, OVERDUE, CANCELLED |
| `subtotalCents` | Subtotal | currency | Yes | Subtotal before tax |
| `taxCents` | Tax Amount | currency | Yes | Tax amount |
| `totalCents` | Total | currency | Yes | Total amount due |
| `paidCents` | Amount Paid | currency | Yes | Amount paid |
| `notes` | Notes | text | No | Additional notes |

### System Fields Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `tenantId` | Tenant | string | Yes | Organization identifier (system) |
| `createdAt` | Created Date | datetime | Yes | Record creation timestamp (system) |
| `updatedAt` | Last Modified | datetime | Yes | Last update timestamp (system) |

---

## 19. TENANT Properties

### Organization Details Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `recordId` | Record ID | string | Yes | Unique identifier (system) |
| `slug` | Subdomain | string | Yes | Organization subdomain/slug |
| `name` | Organization Name | string | Yes | Display name |
| `plan` | Plan | enum | Yes | FREE, PRO, ENTERPRISE |
| `customDomain` | Custom Domain | url | No | Custom domain name |
| `themeJson` | Theme | json | No | Branding and theme settings |
| `featureFlags` | Feature Flags | json | No | Enabled features |
| `settings` | Settings | json | No | Organization settings |

### System Fields Group
| Name | Label | Type | Required | Description |
|------|-------|------|----------|-------------|
| `createdAt` | Created Date | datetime | Yes | Record creation timestamp (system) |
| `updatedAt` | Last Modified | datetime | Yes | Last update timestamp (system) |

---

## Object Type Summary

Properties are organized by these object types:
- **pets** - Pet profiles and medical records
- **owners** - Customer contact and billing information
- **bookings** - Reservations and stays
- **kennels** - Accommodation inventory
- **services** - Available services and add-ons
- **staff** - Staff profiles and schedules
- **vaccinations** - Vaccination records
- **payments** - Payment transactions
- **checkins** - Check-in records
- **checkouts** - Check-out records
- **incidents** - Incident reports
- **communications** - Communication history
- **notes** - Notes attached to records
- **tasks** - Staff tasks and assignments
- **runs** - Daycare run sessions
- **run_templates** - Daycare run templates
- **users** - System user accounts
- **tenants** - Organization/tenant settings
- **invoices** - Invoicing (future)

---

## Custom Properties Storage

Custom properties created by users will be stored in one of two ways:

### Option 1: JSONB Column (Recommended)
Add a `customFields` JSONB column to each main table:
```sql
ALTER TABLE "Pet" ADD COLUMN "customFields" JSONB DEFAULT '{}';
ALTER TABLE "Owner" ADD COLUMN "customFields" JSONB DEFAULT '{}';
-- etc.
```

### Option 2: Separate Property Values Table
Create a generic property values table:
```sql
CREATE TABLE "PropertyValue" (
  "recordId" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3)
);
```

---

## Property Definition Table

Store property metadata in a new table:
```sql
CREATE TABLE "Property" (
  "recordId" TEXT PRIMARY KEY,
  "tenantId" TEXT,  -- NULL for system properties
  "objectType" TEXT NOT NULL,  -- pets, owners, bookings, etc.
  "name" TEXT NOT NULL,  -- API/DB field name
  "label" TEXT NOT NULL,  -- Display name
  "description" TEXT,
  "type" TEXT NOT NULL,  -- string, number, date, enum, etc.
  "isSystem" BOOLEAN DEFAULT false,  -- true = BarkBase system property
  "isRequired" BOOLEAN DEFAULT false,
  "isVisible" BOOLEAN DEFAULT true,
  "isSearchable" BOOLEAN DEFAULT true,
  "isEditable" BOOLEAN DEFAULT true,
  "group" TEXT,  -- Grouping category
  "order" INTEGER DEFAULT 0,  -- Display order
  "options" JSONB,  -- For enum fields: {values: ["option1", "option2"]}
  "validation" JSONB,  -- Validation rules
  "defaultValue" JSONB,  -- Default value
  "metadata" JSONB,  -- Additional config
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3),
  "createdBy" TEXT,  -- 'system' or userId
  UNIQUE("tenantId", "objectType", "name")
);
```

