# BarkBase Workflows Data Reference

This document contains the complete database schema and data definitions needed for the workflow automation system.

---

## Table of Contents

1. [Core Entity Tables](#core-entity-tables)
2. [System Properties by Object Type](#system-properties-by-object-type)
3. [Status Values and Enums](#status-values-and-enums)
4. [Foreign Key Relationships](#foreign-key-relationships)
5. [Variable Tokens for Templates](#variable-tokens-for-templates)

---

## Core Entity Tables

### Pet
Primary object for pet records.

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | YES | uuid_generate_v4() | Primary key |
| tenant_id | uuid | YES | | Tenant reference |
| name | varchar | YES | | Pet's name |
| species | varchar | YES | | Dog, Cat, etc. |
| breed | varchar | NO | | Breed |
| color | varchar | NO | | Color/markings |
| weight | numeric | NO | | Weight in lbs |
| birthdate | date | NO | | Date of birth |
| gender | varchar | NO | | Male/Female/Unknown |
| is_spayed_neutered | boolean | NO | false | Fixed status |
| microchip_number | varchar | NO | | Microchip ID |
| medical_notes | text | NO | | Medical notes |
| dietary_notes | text | NO | | Dietary requirements |
| behavioral_notes | text | NO | | Behavioral notes |
| status | varchar | NO | 'ACTIVE' | Active/Inactive/Deceased |
| profile_image_url | varchar | NO | | Photo URL |
| vet_id | uuid | NO | | Veterinarian FK |
| created_by | uuid | NO | | Creator FK |
| updated_by | uuid | NO | | Last updater FK |
| created_at | timestamp | YES | now() | Created date |
| updated_at | timestamp | YES | now() | Updated date |

**Foreign Keys:**
- `tenant_id` → Tenant(id)
- `vet_id` → Veterinarian(id)
- `created_by` → User(id)
- `updated_by` → User(id)

---

### Owner
Pet owner/customer records.

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | YES | gen_random_uuid() | Primary key |
| tenant_id | uuid | YES | | Tenant reference |
| first_name | varchar | YES | | First name |
| last_name | varchar | YES | | Last name |
| email | varchar | YES | | Email address |
| phone | varchar | NO | | Phone number |
| secondary_phone | varchar | NO | | Alt phone |
| address | varchar | NO | | Street address |
| city | varchar | NO | | City |
| state | varchar | NO | | State |
| zip | varchar | NO | | ZIP code |
| emergency_contact_name | varchar | NO | | Emergency contact |
| emergency_contact_phone | varchar | NO | | Emergency phone |
| notes | text | NO | | General notes |
| status | varchar | NO | 'ACTIVE' | Active/Inactive/VIP/Blocked |
| profile_image_url | varchar | NO | | Photo URL |
| created_by | uuid | NO | | Creator FK |
| updated_by | uuid | NO | | Last updater FK |
| created_at | timestamp | YES | now() | Created date |
| updated_at | timestamp | YES | now() | Updated date |

**Foreign Keys:**
- `tenant_id` → Tenant(id)
- `created_by` → User(id)
- `updated_by` → User(id)

---

### Booking
Reservation/appointment records.

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | YES | gen_random_uuid() | Primary key |
| tenant_id | uuid | YES | | Tenant reference |
| owner_id | uuid | YES | | Owner FK |
| service_id | uuid | YES | | Service FK |
| kennel_id | uuid | NO | | Assigned kennel FK |
| check_in | timestamp | YES | | Check-in datetime |
| check_out | timestamp | YES | | Check-out datetime |
| status | varchar | YES | 'PENDING' | Booking status |
| total_price_cents | bigint | YES | | Total price |
| deposit_cents | bigint | NO | 0 | Deposit amount |
| notes | text | NO | | Staff notes |
| special_instructions | text | NO | | Special care instructions |
| checked_in_at | timestamp | NO | | Actual check-in time |
| checked_out_at | timestamp | NO | | Actual check-out time |
| checked_in_by | uuid | NO | | Staff who checked in |
| checked_out_by | uuid | NO | | Staff who checked out |
| cancelled_at | timestamp | NO | | Cancellation time |
| cancellation_reason | text | NO | | Reason for cancellation |
| created_by | uuid | NO | | Creator FK |
| updated_by | uuid | NO | | Last updater FK |
| created_at | timestamp | YES | now() | Created date |
| updated_at | timestamp | YES | now() | Updated date |

**Foreign Keys:**
- `tenant_id` → Tenant(id)
- `owner_id` → Owner(id)
- `service_id` → Service(id)
- `kennel_id` → Kennel(id)
- `checked_in_by` → User(id)
- `checked_out_by` → User(id)

**Booking Statuses:**
- PENDING
- CONFIRMED
- CHECKED_IN
- CHECKED_OUT
- CANCELLED
- NO_SHOW

---

### Invoice
Billing records.

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | YES | gen_random_uuid() | Primary key |
| tenant_id | uuid | YES | | Tenant reference |
| invoice_number | varchar | YES | | Invoice number |
| owner_id | uuid | YES | | Customer FK |
| booking_id | uuid | NO | | Related booking FK |
| status | varchar | YES | 'DRAFT' | Invoice status |
| subtotal_cents | bigint | YES | | Subtotal |
| tax_cents | bigint | NO | 0 | Tax amount |
| discount_cents | bigint | NO | 0 | Discount |
| total_cents | bigint | YES | | Total |
| paid_cents | bigint | NO | 0 | Amount paid |
| due_date | date | NO | | Due date |
| issued_at | timestamp | NO | | Issue date |
| paid_at | timestamp | NO | | Payment date |
| notes | text | NO | | Notes |
| created_by | uuid | NO | | Creator FK |
| created_at | timestamp | YES | now() | Created date |
| updated_at | timestamp | YES | now() | Updated date |

**Invoice Statuses:**
- DRAFT
- SENT
- VIEWED
- PARTIALLY_PAID
- PAID
- OVERDUE
- VOID
- REFUNDED

---

### Payment
Payment transaction records.

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | YES | gen_random_uuid() | Primary key |
| tenant_id | uuid | YES | | Tenant reference |
| invoice_id | uuid | NO | | Invoice FK |
| owner_id | uuid | YES | | Customer FK |
| amount_cents | bigint | YES | | Payment amount |
| payment_method | varchar | YES | | Payment method |
| payment_date | timestamp | YES | | Payment date |
| reference_number | varchar | NO | | Transaction reference |
| status | varchar | YES | 'COMPLETED' | Payment status |
| notes | text | NO | | Notes |
| processed_by | uuid | NO | | Staff who processed |
| created_at | timestamp | YES | now() | Created date |
| updated_at | timestamp | YES | now() | Updated date |

**Payment Methods:**
- Credit Card
- Debit Card
- Cash
- Check
- Bank Transfer
- Venmo
- PayPal
- Other

**Payment Statuses:**
- COMPLETED
- PENDING
- FAILED
- REFUNDED
- PARTIALLY_REFUNDED

---

### Task
Task/to-do records.

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | YES | gen_random_uuid() | Primary key |
| tenant_id | uuid | YES | | Tenant reference |
| title | varchar | YES | | Task title |
| description | text | NO | | Task description |
| task_type | varchar | NO | | Task type/category |
| priority | varchar | NO | 'MEDIUM' | Priority level |
| status | varchar | YES | 'PENDING' | Task status |
| due_date | timestamp | NO | | Due date |
| assigned_to | uuid | NO | | Assigned staff FK |
| booking_id | uuid | NO | | Related booking FK |
| pet_id | uuid | NO | | Related pet FK |
| completed_at | timestamp | NO | | Completion time |
| completed_by | uuid | NO | | Staff who completed |
| created_by | uuid | NO | | Creator FK |
| created_at | timestamp | YES | now() | Created date |
| updated_at | timestamp | YES | now() | Updated date |

**Task Priorities:**
- LOW
- MEDIUM
- HIGH
- URGENT

**Task Statuses:**
- PENDING
- IN_PROGRESS
- COMPLETED
- CANCELLED

---

### Segment
Customer/pet segment definitions.

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | YES | gen_random_uuid() | Primary key |
| tenant_id | uuid | YES | | Tenant reference |
| name | varchar | YES | | Segment name |
| description | text | NO | | Description |
| object_type | varchar | YES | | owners/pets |
| segment_type | varchar | NO | 'active' | active/static |
| is_automatic | boolean | NO | false | Auto-update members |
| criteria | jsonb | NO | | Filter criteria |
| filters | jsonb | NO | | Filter configuration |
| member_count | integer | NO | | Current member count |
| is_active | boolean | NO | true | Is active |
| created_by | uuid | NO | | Creator FK |
| created_at | timestamp | YES | now() | Created date |
| updated_at | timestamp | YES | now() | Updated date |

---

### Vaccination
Pet vaccination records.

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | YES | gen_random_uuid() | Primary key |
| tenant_id | uuid | YES | | Tenant reference |
| pet_id | uuid | YES | | Pet FK |
| name | varchar | YES | | Vaccine name |
| administered_date | date | YES | | Date given |
| expiration_date | date | NO | | Expiration date |
| administered_by | varchar | NO | | Vet/clinic name |
| notes | text | NO | | Notes |
| document_url | varchar | NO | | Proof document URL |
| is_required | boolean | NO | true | Required for boarding |
| created_by | uuid | NO | | Creator FK |
| created_at | timestamp | YES | now() | Created date |
| updated_at | timestamp | YES | now() | Updated date |

---

## System Properties by Object Type

Properties available for filtering, triggers, and display.

### Pet Properties

| Name | Label | Type | Required | Options |
|------|-------|------|----------|---------|
| owner_id | Owner | relation | YES | |
| name | Pet Name | text | YES | |
| species | Species | enum | YES | Dog, Cat, Bird, Rabbit, Guinea Pig, Hamster, Fish, Reptile, Other |
| breed | Breed | text | NO | |
| color | Color | text | NO | |
| weight | Weight (lbs) | number | NO | |
| birthdate | Birth Date | date | NO | |
| gender | Gender | enum | NO | Male, Female, Unknown |
| spayed_neutered | Spayed/Neutered | boolean | NO | |
| microchip_number | Microchip Number | text | NO | |
| notes | Notes | textarea | NO | |
| status | Status | enum | YES | Active, Inactive, Deceased |
| profile_image | Profile Image | image | NO | |
| created_at | Created | datetime | NO | |
| updated_at | Last Updated | datetime | NO | |

### Owner Properties

| Name | Label | Type | Required | Options |
|------|-------|------|----------|---------|
| first_name | First Name | text | YES | |
| last_name | Last Name | text | YES | |
| email | Email | email | YES | |
| phone | Phone | phone | NO | |
| address | Address | text | NO | |
| city | City | text | NO | |
| state | State | text | NO | |
| zip | ZIP Code | text | NO | |
| emergency_contact_name | Emergency Contact Name | text | NO | |
| emergency_contact_phone | Emergency Contact Phone | phone | NO | |
| notes | Notes | textarea | NO | |
| status | Status | enum | YES | Active, Inactive, VIP, Blocked |
| created_at | Created | datetime | NO | |
| updated_at | Last Updated | datetime | NO | |

### Booking Properties

| Name | Label | Type | Required | Options |
|------|-------|------|----------|---------|
| pet_id | Pet | relation | YES | |
| owner_id | Owner | relation | YES | |
| service_id | Service | relation | YES | |
| facility_id | Facility/Kennel | relation | NO | |
| start_date | Start Date | date | YES | |
| end_date | End Date | date | YES | |
| check_in_time | Check-in Time | datetime | NO | |
| check_out_time | Check-out Time | datetime | NO | |
| status | Status | enum | YES | Pending, Confirmed, Checked In, Checked Out, Cancelled, No Show |
| notes | Notes | textarea | NO | |
| total_amount | Total Amount | currency | NO | |
| created_at | Created | datetime | NO | |
| updated_at | Last Updated | datetime | NO | |

### Invoice Properties

| Name | Label | Type | Required | Options |
|------|-------|------|----------|---------|
| invoice_number | Invoice # | text | YES | |
| owner_id | Customer | relation | YES | |
| booking_id | Booking | relation | NO | |
| issue_date | Issue Date | date | YES | |
| due_date | Due Date | date | YES | |
| subtotal | Subtotal | currency | YES | |
| tax_amount | Tax | currency | NO | |
| total_amount | Total | currency | YES | |
| amount_paid | Paid | currency | NO | |
| status | Status | enum | YES | Draft, Sent, Viewed, Partially Paid, Paid, Overdue, Void, Refunded |
| notes | Notes | textarea | NO | |
| created_at | Created | datetime | NO | |
| updated_at | Last Updated | datetime | NO | |

### Payment Properties

| Name | Label | Type | Required | Options |
|------|-------|------|----------|---------|
| invoice_id | Invoice | relation | NO | |
| owner_id | Customer | relation | YES | |
| amount | Amount | currency | YES | |
| payment_method | Method | enum | YES | Credit Card, Debit Card, Cash, Check, Bank Transfer, Venmo, PayPal, Other |
| payment_date | Date | datetime | YES | |
| reference_number | Reference # | text | NO | |
| status | Status | enum | YES | Completed, Pending, Failed, Refunded, Partially Refunded |
| notes | Notes | textarea | NO | |
| created_at | Created | datetime | NO | |
| updated_at | Last Updated | datetime | NO | |

### Service Properties

| Name | Label | Type | Required | Options |
|------|-------|------|----------|---------|
| name | Service Name | text | YES | |
| description | Description | textarea | NO | |
| category | Category | enum | NO | Boarding, Daycare, Grooming, Training, Veterinary, Other |
| base_price | Base Price | currency | YES | |
| duration_minutes | Duration (mins) | number | NO | |
| is_active | Active | boolean | YES | |
| capacity | Capacity | number | NO | |
| created_at | Created | datetime | NO | |
| updated_at | Last Updated | datetime | NO | |

### Kennel Properties

| Name | Label | Type | Required | Options |
|------|-------|------|----------|---------|
| name | Kennel Name | text | YES | |
| building | Building | text | NO | |
| floor | Floor | text | NO | |
| capacity | Capacity | number | YES | |
| size | Size | enum | NO | Small, Medium, Large, Extra Large |
| type | Type | enum | NO | Indoor Run, Outdoor Run, Suite, Luxury Suite, Condo, Cabin |
| amenities | Amenities | multi_enum | NO | Climate Control, Indoor/Outdoor Access, Webcam, Private Yard, Elevated Bed, TV, Music |
| hourly_rate | Hourly Rate | currency | NO | |
| daily_rate | Daily Rate | currency | NO | |
| is_active | Active | boolean | YES | |
| notes | Notes | textarea | NO | |
| created_at | Created | datetime | NO | |
| updated_at | Last Updated | datetime | NO | |

### Staff Properties

| Name | Label | Type | Required | Options |
|------|-------|------|----------|---------|
| first_name | First Name | text | YES | |
| last_name | Last Name | text | YES | |
| email | Email | email | YES | |
| phone | Phone | phone | NO | |
| role | Role | enum | YES | Manager, Kennel Technician, Groomer, Trainer, Receptionist, Veterinarian, Vet Tech, Administrator |
| hire_date | Hire Date | date | NO | |
| hourly_rate | Hourly Rate | currency | NO | |
| certifications | Certifications | multi_enum | NO | Pet First Aid, CPR Certified, Fear Free Certified, CPDT-KA, Grooming Certification, Vet Tech License |
| status | Status | enum | YES | Active, Inactive, On Leave, Terminated |
| notes | Notes | textarea | NO | |
| created_at | Created | datetime | NO | |
| updated_at | Last Updated | datetime | NO | |

---

## Status Values and Enums

### Booking Status
- `PENDING` - Awaiting confirmation
- `CONFIRMED` - Confirmed reservation
- `CHECKED_IN` - Pet currently at facility
- `CHECKED_OUT` - Completed stay
- `CANCELLED` - Reservation cancelled
- `NO_SHOW` - Customer did not show up

### Invoice Status
- `DRAFT` - Not yet sent
- `SENT` - Sent to customer
- `VIEWED` - Customer viewed
- `PARTIALLY_PAID` - Partial payment received
- `PAID` - Fully paid
- `OVERDUE` - Past due date
- `VOID` - Voided/cancelled
- `REFUNDED` - Refunded

### Payment Status
- `COMPLETED` - Payment successful
- `PENDING` - Awaiting processing
- `FAILED` - Payment failed
- `REFUNDED` - Fully refunded
- `PARTIALLY_REFUNDED` - Partially refunded

### Task Status
- `PENDING` - Not started
- `IN_PROGRESS` - Currently working
- `COMPLETED` - Done
- `CANCELLED` - Cancelled

### Task Priority
- `LOW`
- `MEDIUM`
- `HIGH`
- `URGENT`

### Pet Status
- `Active` - Current/active pet
- `Inactive` - No longer boarding
- `Deceased` - Passed away

### Owner Status
- `Active` - Active customer
- `Inactive` - Inactive customer
- `VIP` - VIP customer
- `Blocked` - Blocked from service

### Pet Species
- Dog
- Cat
- Bird
- Rabbit
- Guinea Pig
- Hamster
- Fish
- Reptile
- Other

### Pet Gender
- Male
- Female
- Unknown

### Service Categories
- Boarding
- Daycare
- Grooming
- Training
- Veterinary
- Other

### Payment Methods
- Credit Card
- Debit Card
- Cash
- Check
- Bank Transfer
- Venmo
- PayPal
- Other

---

## Foreign Key Relationships

### Key Relationships

```
Pet
  └── tenant_id → Tenant
  └── vet_id → Veterinarian
  └── created_by → User
  └── updated_by → User

Owner
  └── tenant_id → Tenant
  └── created_by → User
  └── updated_by → User

PetOwner (junction table)
  └── pet_id → Pet
  └── owner_id → Owner
  └── tenant_id → Tenant

Booking
  └── tenant_id → Tenant
  └── owner_id → Owner
  └── service_id → Service
  └── kennel_id → Kennel
  └── checked_in_by → User
  └── checked_out_by → User
  └── created_by → User
  └── updated_by → User

BookingPet (junction table)
  └── booking_id → Booking
  └── pet_id → Pet
  └── tenant_id → Tenant

Invoice
  └── tenant_id → Tenant
  └── owner_id → Owner
  └── booking_id → Booking
  └── created_by → User

Payment
  └── tenant_id → Tenant
  └── invoice_id → Invoice
  └── owner_id → Owner
  └── processed_by → User

Task
  └── tenant_id → Tenant
  └── assigned_to → User
  └── booking_id → Booking
  └── pet_id → Pet
  └── completed_by → User
  └── created_by → User

Vaccination
  └── tenant_id → Tenant
  └── pet_id → Pet
  └── created_by → User

Segment
  └── tenant_id → Tenant
  └── created_by → User

SegmentMember
  └── segment_id → Segment
  └── owner_id → Owner
  └── tenant_id → Tenant
  └── added_by → User
```

---

## Variable Tokens for Templates

Use these tokens in SMS/Email templates. They will be replaced with actual values at runtime.

### Pet Variables
```
{{pet.name}}
{{pet.species}}
{{pet.breed}}
{{pet.color}}
{{pet.weight}}
{{pet.birthdate}}
{{pet.gender}}
{{pet.status}}
{{pet.microchip_number}}
```

### Owner Variables
```
{{owner.first_name}}
{{owner.last_name}}
{{owner.full_name}}          // first_name + last_name
{{owner.email}}
{{owner.phone}}
{{owner.address}}
{{owner.city}}
{{owner.state}}
{{owner.zip}}
{{owner.full_address}}       // formatted full address
```

### Booking Variables
```
{{booking.id}}
{{booking.check_in}}         // formatted date/time
{{booking.check_out}}        // formatted date/time
{{booking.check_in_date}}    // date only
{{booking.check_out_date}}   // date only
{{booking.check_in_time}}    // time only
{{booking.check_out_time}}   // time only
{{booking.status}}
{{booking.total_price}}      // formatted currency
{{booking.deposit}}          // formatted currency
{{booking.notes}}
{{booking.special_instructions}}
{{booking.duration_days}}    // calculated days
```

### Invoice Variables
```
{{invoice.number}}
{{invoice.subtotal}}
{{invoice.tax}}
{{invoice.total}}
{{invoice.paid}}
{{invoice.balance_due}}
{{invoice.due_date}}
{{invoice.status}}
```

### Payment Variables
```
{{payment.amount}}
{{payment.method}}
{{payment.date}}
{{payment.reference_number}}
{{payment.status}}
```

### Task Variables
```
{{task.title}}
{{task.description}}
{{task.priority}}
{{task.status}}
{{task.due_date}}
```

### Service Variables
```
{{service.name}}
{{service.description}}
{{service.category}}
{{service.base_price}}
{{service.duration_minutes}}
```

### Facility/Kennel Variables
```
{{kennel.name}}
{{kennel.building}}
{{kennel.size}}
{{kennel.type}}
```

### System Variables
```
{{current_date}}             // Today's date
{{current_time}}             // Current time
{{current_datetime}}         // Current date and time
{{business_name}}            // Tenant business name
{{business_phone}}           // Tenant phone
{{business_email}}           // Tenant email
{{business_address}}         // Tenant address
```

### Staff Variables (for internal notifications)
```
{{staff.first_name}}
{{staff.last_name}}
{{staff.email}}
{{staff.role}}
```

---

## API Endpoints Reference

### Segments
- `GET /api/segments` - List all segments
- `GET /api/segments/:id` - Get segment details
- `GET /api/segments/:id/members` - Get segment members

### Workflows (to be created)
- `GET /api/workflows` - List all workflows
- `GET /api/workflows/:id` - Get workflow details
- `POST /api/workflows` - Create workflow
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow

### Properties
- `GET /api/properties/:objectType` - Get properties for object type

### Staff/Users
- `GET /api/staff` - List staff members
- `GET /api/users` - List users

---

## Condition Operators by Field Type

### Number Fields
- `equals` - is equal to
- `not_equals` - is not equal to
- `less_than` - is less than
- `less_or_equal` - is less than or equal to
- `greater_than` - is greater than
- `greater_or_equal` - is greater than or equal to
- `between` - is between
- `not_between` - is not between
- `is_known` - is known (has any value)
- `is_unknown` - is unknown (is empty/null)
- `has_ever_been` - has ever been equal to
- `has_never_been` - has never been equal to
- `updated_in_last` - updated in last (X days/weeks/months)
- `not_updated_in_last` - not updated in last
- `updated_after_property` - was updated after property
- `updated_before_property` - was updated before property

### Date Fields
- `is` - is (exact date)
- `equals` - is equal to
- `before` - is before
- `after` - is after
- `between` - is between
- `not_between` - is not between
- `less_than_ago` - is less than (X days/weeks/months ago)
- `more_than_ago` - is more than (X days/weeks/months ago)
- `is_known` - is known
- `is_unknown` - is unknown
- `after_property` - is after another property
- `before_property` - is before another property
- `updated_in_last` - updated in last
- `not_updated_in_last` - not updated in last
- `updated_after_property` - was updated after property
- `updated_before_property` - was updated before property

### Text Fields
- `equals_any` - is equal to any of
- `not_equals_any` - is not equal to any of
- `contains` - contains exactly
- `not_contains` - doesn't contain exactly
- `contains_any` - contains any of
- `not_contains_any` - doesn't contain any of
- `starts_with_any` - starts with any of
- `ends_with_any` - ends with any of
- `is_known` - is known
- `is_unknown` - is unknown
- `has_ever_been_any` - has ever been equal to any of
- `has_never_been_any` - has never been equal to any of
- `has_ever_contained` - has ever contained exactly
- `has_never_contained` - has never contained exactly
- `updated_in_last` - updated in last
- `not_updated_in_last` - not updated in last
- `updated_after_property` - was updated after property
- `updated_before_property` - was updated before property

### Boolean Fields
- `is_true` - is true
- `is_false` - is false
- `is_known` - is known
- `is_unknown` - is unknown

### Enum/Select Fields
- `is_any` - is any of
- `is_none` - is none of
- `is_known` - is known
- `is_unknown` - is unknown
- `has_ever_been_any` - has ever been any of
- `has_never_been_any` - has never been any of

---

*Generated from BarkBase PostgreSQL database on 2024-12-14*
