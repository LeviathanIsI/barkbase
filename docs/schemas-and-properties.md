# BarkBase Database Schemas & Properties

**Last Updated:** October 30, 2025  
**Purpose:** Complete reference of all database schemas and their system properties

---

## Table of Contents

1. [Pets](#1-pets-schema)
2. [Owners](#2-owners-schema)
3. [Bookings](#3-bookings-schema)
4. [Kennels](#4-kennels-schema)
5. [Services](#5-services-schema)
6. [Staff](#6-staff-schema)
7. [Vaccinations](#7-vaccinations-schema)
8. [Payments](#8-payments-schema)
9. [Check-Ins](#9-check-ins-schema)
10. [Check-Outs](#10-check-outs-schema)
11. [Incident Reports](#11-incident-reports-schema)
12. [Communications](#12-communications-schema)
13. [Notes](#13-notes-schema)
14. [Tasks](#14-tasks-schema)
15. [Runs (Daycare)](#15-runs-daycare-schema)
16. [Run Templates](#16-run-templates-schema)
17. [Users](#17-users-schema)
18. [Tenants](#18-tenants-schema)
19. [Invoices](#19-invoices-schema)

---

## Property Type Reference

| Type | Description | Example |
|------|-------------|---------|
| `string` | Single-line text | "Max", "Golden Retriever" |
| `text` | Multi-line text | "Medical notes..." |
| `email` | Email address | "owner@example.com" |
| `phone` | Phone number | "(555) 123-4567" |
| `url` | Website URL | "https://example.com" |
| `number` | Numeric value | 45, 12.5 |
| `currency` | Money amount in cents | 5000 = $50.00 |
| `date` | Date only | 2024-01-15 |
| `datetime` | Date and time | 2024-01-15T10:30:00Z |
| `boolean` | True/false | true, false |
| `enum` | Single select dropdown | "Dog", "Cat", "Bird" |
| `multi_enum` | Multiple checkboxes | ["friendly", "anxious"] |
| `file` | File upload/URL | Photo, document URL |
| `json` | Complex structured data | {"key": "value"} |
| `user` | Reference to another record | Link to Owner, Pet, etc. |
| `score` | Numeric rating | 1-5 stars |

---

## 1. Pets Schema

**Object Type:** `pets`  
**Database Table:** `Pet`  
**Total Properties:** 17

### Basic Information
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `recordId` | Record ID | string | ✓ | Unique identifier (system-generated) |
| `name` | Pet Name | string | ✓ | The pet's name |
| `species` | Species | enum | | Type of animal (Dog, Cat, Bird, Rabbit, Other) |
| `breed` | Breed | string | | Pet breed or breed mix |
| `birthdate` | Date of Birth | date | | Pet's birthdate for age calculation |
| `weight` | Weight (lbs) | number | | Current weight in pounds |
| `photoUrl` | Photo | file | | Pet profile photo URL |
| `status` | Status | enum | ✓ | Active, Inactive, or Deceased |
| `primaryOwnerId` | Primary Owner | user | | Link to primary owner record |

**Species Options:** Dog, Cat, Bird, Rabbit, Other (custom allowed)  
**Status Options:** active, inactive, deceased

### Medical Information
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `medicalNotes` | Medical Notes | text | | General medical information and conditions |
| `allergies` | Allergies | text | | Known allergies and sensitivities |
| `dietaryNotes` | Dietary Notes | text | | Feeding instructions and dietary restrictions |
| `lastVetVisit` | Last Vet Visit | date | | Date of last veterinary visit |
| `nextAppointment` | Next Appointment | datetime | | Upcoming veterinary appointment |

### Behavior
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `behaviorFlags` | Behavior Flags | multi_enum | | Behavioral traits and characteristics |

**Behavior Options:** friendly_with_dogs, friendly_with_cats, friendly_with_children, anxious, aggressive, escape_artist, loud, destructive, needs_muzzle

### System Fields
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `tenantId` | Organization | string | ✓ | Organization identifier (read-only) |
| `createdAt` | Created Date | datetime | ✓ | Record creation timestamp (read-only) |
| `updatedAt` | Last Modified | datetime | ✓ | Last update timestamp (read-only) |

---

## 2. Owners Schema

**Object Type:** `owners`  
**Database Table:** `Owner`  
**Total Properties:** 15

### Contact Information
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `recordId` | Record ID | string | ✓ | Unique identifier (system-generated) |
| `firstName` | First Name | string | ✓ | Owner's first name |
| `lastName` | Last Name | string | ✓ | Owner's last name |
| `email` | Email Address | email | | Primary email address |
| `phone` | Phone Number | phone | | Primary contact phone number |

### Address
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `address` | Address | json | ✓ | Full address object |
| `address.street` | Street Address | string | | Street address line 1 |
| `address.street2` | Address Line 2 | string | | Apartment, suite, unit number |
| `address.city` | City | string | | City |
| `address.state` | State/Province | string | | State or province |
| `address.zip` | ZIP/Postal Code | string | | Postal code |
| `address.country` | Country | string | | Country |

### System Fields
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `tenantId` | Organization | string | ✓ | Organization identifier (read-only) |
| `createdAt` | Created Date | datetime | ✓ | Record creation timestamp (read-only) |
| `updatedAt` | Last Modified | datetime | ✓ | Last update timestamp (read-only) |

---

## 3. Bookings Schema

**Object Type:** `bookings`  
**Database Table:** `Booking`  
**Total Properties:** 16

### Booking Details
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `recordId` | Record ID | string | ✓ | Unique identifier (system-generated) |
| `petId` | Pet | user | ✓ | Pet associated with this booking |
| `ownerId` | Owner | user | ✓ | Owner/customer for this booking |
| `status` | Status | enum | ✓ | Current booking status |
| `checkIn` | Check-In Date | datetime | ✓ | Scheduled check-in date and time |
| `checkOut` | Check-Out Date | datetime | ✓ | Scheduled check-out date and time |
| `source` | Booking Source | enum | | How the booking was created |

**Status Options:** PENDING, CONFIRMED, CHECKED_IN, IN_PROGRESS, CHECKED_OUT, COMPLETED, CANCELLED  
**Source Options:** portal, phone, email, walk-in, online

### Financial
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `depositCents` | Deposit Amount | currency | | Deposit paid in cents |
| `totalCents` | Total Amount | currency | | Total booking cost in cents |
| `balanceDueCents` | Balance Due | currency | | Remaining balance in cents |

### Notes
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `notes` | Internal Notes | text | | Staff notes about the booking |
| `specialInstructions` | Special Instructions | text | | Owner's special instructions |

### System Fields
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `tenantId` | Organization | string | ✓ | Organization identifier (read-only) |
| `createdAt` | Created Date | datetime | ✓ | Record creation timestamp (read-only) |
| `updatedAt` | Last Modified | datetime | ✓ | Last update timestamp (read-only) |

---

## 4. Kennels Schema

**Object Type:** `kennels`  
**Database Table:** `Kennel`  
**Total Properties:** 17

### Kennel Details
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `recordId` | Record ID | string | ✓ | Unique identifier (system-generated) |
| `name` | Kennel Name | string | ✓ | Identifier name or number |
| `type` | Accommodation Type | enum | ✓ | Type of accommodation |
| `size` | Size | enum | | Accommodation size |
| `capacity` | Capacity | number | ✓ | Maximum number of pets (min: 1) |
| `isActive` | Active | boolean | ✓ | Whether kennel is available for booking |

**Type Options:** SUITE, KENNEL, CABIN, DAYCARE, MEDICAL  
**Size Options:** Small, Medium, Large, XL

### Location
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `location` | General Location | string | | Building or area description |
| `building` | Building | string | | Building identifier |
| `zone` | Zone/Area | string | | Specific zone or section |

### Pricing
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `hourlyRate` | Hourly Rate | currency | | Rate per hour in cents |
| `dailyRate` | Daily Rate | currency | | Rate per day in cents |
| `weeklyRate` | Weekly Rate | currency | | Rate per week in cents |

### Features
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `amenities` | Amenities | multi_enum | | Features and amenities |
| `notes` | Notes | text | | Additional information |

### System Fields
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `tenantId` | Organization | string | ✓ | Organization identifier (read-only) |
| `createdAt` | Created Date | datetime | ✓ | Record creation timestamp (read-only) |
| `updatedAt` | Last Modified | datetime | ✓ | Last update timestamp (read-only) |

---

## 5. Services Schema

**Object Type:** `services`  
**Database Table:** `Service`  
**Total Properties:** 9

### Service Details
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `recordId` | Record ID | string | ✓ | Unique identifier (system-generated) |
| `name` | Service Name | string | ✓ | Name of the service |
| `description` | Description | text | | Detailed description |
| `category` | Category | enum | ✓ | Service category |
| `priceCents` | Price | currency | ✓ | Service price in cents |
| `isActive` | Active | boolean | ✓ | Whether service is available |

**Category Options:** BOARDING, DAYCARE, GROOMING, TRAINING, OTHER

### System Fields
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `tenantId` | Organization | string | ✓ | Organization identifier (read-only) |
| `createdAt` | Created Date | datetime | ✓ | Record creation timestamp (read-only) |
| `updatedAt` | Last Modified | datetime | ✓ | Last update timestamp (read-only) |

---

## 6. Staff Schema

**Object Type:** `staff`  
**Database Table:** `Staff`  
**Total Properties:** 8

### Staff Details
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `recordId` | Record ID | string | ✓ | Unique identifier (system-generated) |
| `membershipId` | Membership | user | ✓ | Link to user membership |
| `title` | Job Title | string | | Staff position/title |
| `phone` | Phone Number | phone | | Contact phone number |
| `schedule` | Schedule | json | ✓ | Work schedule configuration |

### System Fields
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `tenantId` | Organization | string | ✓ | Organization identifier (read-only) |
| `createdAt` | Created Date | datetime | ✓ | Record creation timestamp (read-only) |
| `updatedAt` | Last Modified | datetime | ✓ | Last update timestamp (read-only) |

---

## 7. Vaccinations Schema

**Object Type:** `vaccinations`  
**Database Table:** `Vaccination`  
**Total Properties:** 11

### Vaccination Details
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `recordId` | Record ID | string | ✓ | Unique identifier (system-generated) |
| `petId` | Pet | user | ✓ | Associated pet |
| `type` | Vaccination Type | enum | ✓ | Type of vaccination |
| `administeredAt` | Date Administered | date | ✓ | When vaccine was given |
| `expiresAt` | Expiration Date | date | ✓ | When vaccine expires |
| `documentUrl` | Document | file | | Upload of vaccination certificate |
| `reminderSentAt` | Reminder Sent | datetime | | When reminder was sent to owner |
| `notes` | Notes | text | | Additional information |

**Type Options:** Rabies, DHPP, Bordetella, Lepto, Influenza, Lyme, etc.

### System Fields
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `tenantId` | Organization | string | ✓ | Organization identifier (read-only) |
| `createdAt` | Created Date | datetime | ✓ | Record creation timestamp (read-only) |
| `updatedAt` | Last Modified | datetime | ✓ | Last update timestamp (read-only) |

---

## 8. Payments Schema

**Object Type:** `payments`  
**Database Table:** `Payment`  
**Total Properties:** 15

### Payment Details
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `recordId` | Record ID | string | ✓ | Unique identifier (system-generated) |
| `bookingId` | Booking | user | | Associated booking (if applicable) |
| `ownerId` | Owner | user | ✓ | Customer who made payment |
| `amountCents` | Amount | currency | ✓ | Payment amount in cents |
| `currency` | Currency | enum | ✓ | Currency code (USD, CAD, EUR, etc.) |
| `status` | Payment Status | enum | ✓ | Current payment status |
| `method` | Payment Method | enum | | How payment was made |
| `externalId` | External ID | string | | Payment processor transaction ID |
| `intentId` | Intent ID | string | | Stripe/processor payment intent ID |
| `capturedAt` | Captured At | datetime | | When payment was captured/completed |
| `metadata` | Metadata | json | ✓ | Additional payment processor data |

**Status Options:** PENDING, AUTHORIZED, CAPTURED, SUCCESSFUL, REFUNDED, FAILED  
**Method Options:** card, cash, check, bank_transfer

### System Fields
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `tenantId` | Organization | string | ✓ | Organization identifier (read-only) |
| `createdAt` | Created Date | datetime | ✓ | Record creation timestamp (read-only) |
| `updatedAt` | Last Modified | datetime | ✓ | Last update timestamp (read-only) |

---

## 9. Check-Ins Schema

**Object Type:** `check_ins`  
**Database Table:** `CheckIn`  
**Total Properties:** 11

### Check-In Details
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `recordId` | Record ID | string | ✓ | Unique identifier (system-generated) |
| `bookingId` | Booking | user | ✓ | Associated booking |
| `staffId` | Staff Member | user | | Staff who performed check-in |
| `time` | Check-In Time | datetime | ✓ | Actual check-in timestamp |
| `weight` | Weight | number | | Pet weight at check-in (lbs) |
| `conditionRating` | Condition Rating | score | | Pet condition score (1-5) |
| `photos` | Photos | file | | Check-in photos |
| `notes` | Notes | text | | Check-in observations and notes |

### System Fields
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `tenantId` | Organization | string | ✓ | Organization identifier (read-only) |
| `createdAt` | Created Date | datetime | ✓ | Record creation timestamp (read-only) |
| `updatedAt` | Last Modified | datetime | ✓ | Last update timestamp (read-only) |

---

## 10. Check-Outs Schema

**Object Type:** `check_outs`  
**Database Table:** `CheckOut`  
**Total Properties:** 10

### Check-Out Details
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `recordId` | Record ID | string | ✓ | Unique identifier (system-generated) |
| `bookingId` | Booking | user | ✓ | Associated booking |
| `staffId` | Staff Member | user | | Staff who performed check-out |
| `time` | Check-Out Time | datetime | ✓ | Actual check-out timestamp |
| `incidentReportId` | Incident Report | user | | Link to any incident report filed |
| `extraCharges` | Extra Charges | json | | Additional charges applied at checkout |
| `signatureUrl` | Signature | file | | Customer signature (digital or photo) |

### System Fields
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `tenantId` | Organization | string | ✓ | Organization identifier (read-only) |
| `createdAt` | Created Date | datetime | ✓ | Record creation timestamp (read-only) |
| `updatedAt` | Last Modified | datetime | ✓ | Last update timestamp (read-only) |

---

## 11. Incident Reports Schema

**Object Type:** `incidents`  
**Database Table:** `IncidentReport`  
**Total Properties:** 11

### Incident Details
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `recordId` | Record ID | string | ✓ | Unique identifier (system-generated) |
| `petId` | Pet | user | ✓ | Pet involved in incident |
| `bookingId` | Booking | user | | Associated booking (if applicable) |
| `occurredAt` | Occurrence Time | datetime | ✓ | When incident occurred |
| `severity` | Severity | enum | ✓ | Incident severity level |
| `narrative` | Description | text | ✓ | Detailed incident description |
| `photos` | Photos | file | | Incident photos/documentation |
| `vetContacted` | Vet Contacted | boolean | ✓ | Whether veterinarian was contacted |

**Severity Options:** MINOR, MODERATE, SEVERE, CRITICAL

### System Fields
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `tenantId` | Organization | string | ✓ | Organization identifier (read-only) |
| `createdAt` | Created Date | datetime | ✓ | Record creation timestamp (read-only) |
| `updatedAt` | Last Modified | datetime | ✓ | Last update timestamp (read-only) |

---

## 12. Communications Schema

**Object Type:** `communications`  
**Database Table:** `Communication`  
**Total Properties:** 11

### Communication Details
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `recordId` | Record ID | string | ✓ | Unique identifier (system-generated) |
| `ownerId` | Owner | user | ✓ | Customer being communicated with |
| `userId` | Staff Member | user | ✓ | Staff member handling communication |
| `type` | Type | enum | ✓ | Communication channel |
| `direction` | Direction | enum | ✓ | Communication direction |
| `subject` | Subject | string | | Communication subject/topic |
| `content` | Content | text | ✓ | Communication body/details |
| `metadata` | Metadata | json | | Additional data (attachments, thread ID, etc.) |

**Type Options:** EMAIL, SMS, CALL, NOTE, SYSTEM  
**Direction Options:** INBOUND, OUTBOUND, INTERNAL

### System Fields
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `tenantId` | Organization | string | ✓ | Organization identifier (read-only) |
| `createdAt` | Created Date | datetime | ✓ | Record creation timestamp (read-only) |
| `updatedAt` | Last Modified | datetime | ✓ | Last update timestamp (read-only) |

---

## 13. Notes Schema

**Object Type:** `notes`  
**Database Table:** `Note`  
**Total Properties:** 11

### Note Details
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `recordId` | Record ID | string | ✓ | Unique identifier (system-generated) |
| `entityType` | Entity Type | enum | ✓ | What object this note is about |
| `entityId` | Entity ID | string | ✓ | ID of the entity |
| `category` | Category | enum | | Note categorization |
| `content` | Content | text | ✓ | Note text content |
| `visibility` | Visibility | enum | ✓ | Who can see this note |
| `isPinned` | Pinned | boolean | ✓ | Whether note is pinned to top |
| `authorId` | Author | user | ✓ | Staff member who created note |

**Entity Type Options:** Pet, Owner, Booking, Kennel, Service, Staff  
**Visibility Options:** ALL, STAFF, ADMIN, PRIVATE

### System Fields
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `tenantId` | Organization | string | ✓ | Organization identifier (read-only) |
| `createdAt` | Created Date | datetime | ✓ | Record creation timestamp (read-only) |
| `updatedAt` | Last Modified | datetime | ✓ | Last update timestamp (read-only) |

---

## 14. Tasks Schema

**Object Type:** `tasks`  
**Database Table:** `Task`  
**Total Properties:** 13

### Task Details
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `recordId` | Record ID | string | ✓ | Unique identifier (system-generated) |
| `type` | Task Type | enum | ✓ | Type of task to be performed |
| `relatedType` | Related To | enum | ✓ | Type of related entity |
| `relatedId` | Related ID | string | ✓ | ID of related entity |
| `assignedTo` | Assigned To | user | | Staff member assigned to task |
| `scheduledFor` | Scheduled For | datetime | ✓ | When task should be completed |
| `completedAt` | Completed At | datetime | | When task was actually completed |
| `completedBy` | Completed By | user | | Staff member who completed task |
| `priority` | Priority | enum | ✓ | Task priority level |
| `notes` | Notes | text | | Task details and instructions |

**Type Options:** FEEDING, MEDICATION, EXERCISE, CLEANING, HEALTH_CHECK, SPECIAL_CARE  
**Priority Options:** LOW, NORMAL, HIGH, URGENT

### System Fields
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `tenantId` | Organization | string | ✓ | Organization identifier (read-only) |
| `createdAt` | Created Date | datetime | ✓ | Record creation timestamp (read-only) |
| `updatedAt` | Last Modified | datetime | ✓ | Last update timestamp (read-only) |

---

## 15. Runs (Daycare) Schema

**Object Type:** `runs`  
**Database Table:** `Run`  
**Total Properties:** 11

### Run Details
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `recordId` | Record ID | string | ✓ | Unique identifier (system-generated) |
| `templateId` | Template | user | | Associated run template |
| `name` | Run Name | string | ✓ | Name of the run session |
| `date` | Date | date | ✓ | Date of the run |
| `scheduleTime` | Scheduled Time | string | ✓ | Time slot (HH:MM format) |
| `capacity` | Capacity | number | ✓ | Maximum number of pets |
| `assignedPets` | Assigned Pets | json | ✓ | Array of assigned pet IDs |
| `isActive` | Active | boolean | ✓ | Whether run is available for assignment |

### System Fields
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `tenantId` | Organization | string | ✓ | Organization identifier (read-only) |
| `createdAt` | Created Date | datetime | ✓ | Record creation timestamp (read-only) |
| `updatedAt` | Last Modified | datetime | ✓ | Last update timestamp (read-only) |

---

## 16. Run Templates Schema

**Object Type:** `run_templates`  
**Database Table:** `RunTemplate`  
**Total Properties:** 9

### Template Details
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `recordId` | Record ID | string | ✓ | Unique identifier (system-generated) |
| `name` | Template Name | string | ✓ | Name of the run template |
| `timePeriodMinutes` | Time Period | number | ✓ | Duration in minutes |
| `capacityType` | Capacity Type | enum | ✓ | How capacity is calculated |
| `maxCapacity` | Maximum Capacity | number | ✓ | Max number of pets allowed |
| `isActive` | Active | boolean | ✓ | Whether template is available for use |

**Capacity Type Options:** total, per_size_group

### System Fields
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `tenantId` | Organization | string | ✓ | Organization identifier (read-only) |
| `createdAt` | Created Date | datetime | ✓ | Record creation timestamp (read-only) |
| `updatedAt` | Last Modified | datetime | ✓ | Last update timestamp (read-only) |

---

## 17. Users Schema

**Object Type:** `users`  
**Database Table:** `User`  
**Total Properties:** 13

### User Profile
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `recordId` | Record ID | string | ✓ | Unique identifier (system-generated) |
| `email` | Email Address | email | ✓ | Login email address |
| `name` | Full Name | string | | User's full name |
| `phone` | Phone Number | phone | | Contact phone number |
| `avatarUrl` | Avatar | file | | Profile photo URL |
| `timezone` | Timezone | enum | | User's timezone (e.g., America/New_York) |
| `language` | Language | enum | | Preferred language (en, es, fr, etc.) |
| `preferences` | Preferences | json | | User preferences and settings |

### Account Status
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `isActive` | Active | boolean | ✓ | Account enabled status |
| `emailVerified` | Email Verified | boolean | ✓ | Email verification status |
| `lastLoginAt` | Last Login | datetime | | Most recent login timestamp |

### System Fields
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `createdAt` | Created Date | datetime | ✓ | Record creation timestamp (read-only) |
| `updatedAt` | Last Modified | datetime | ✓ | Last update timestamp (read-only) |

---

## 18. Tenants Schema

**Object Type:** `tenants`  
**Database Table:** `Tenant`  
**Total Properties:** 11

### Organization Details
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `recordId` | Record ID | string | ✓ | Unique identifier (system-generated) |
| `slug` | Subdomain | string | ✓ | Organization subdomain/slug |
| `name` | Organization Name | string | ✓ | Display name for organization |
| `plan` | Plan | enum | ✓ | Subscription plan level |
| `storageProvider` | Storage Provider | enum | ✓ | File storage provider (AWS, Azure, etc.) |
| `customDomain` | Custom Domain | url | | Custom domain name (e.g., bookings.example.com) |
| `themeJson` | Theme | json | | Branding and theme settings (colors, logos) |
| `featureFlags` | Feature Flags | json | | Enabled/disabled features |
| `settings` | Settings | json | | Organization-wide settings |

**Plan Options:** FREE, PRO, ENTERPRISE  
**Storage Provider Options:** AWS, AZURE, GCP, LOCAL

### System Fields
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `createdAt` | Created Date | datetime | ✓ | Record creation timestamp (read-only) |
| `updatedAt` | Last Modified | datetime | ✓ | Last update timestamp (read-only) |

---

## 19. Invoices Schema

**Object Type:** `invoices`  
**Database Table:** `Invoice` (future)  
**Total Properties:** 13

### Invoice Details
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `recordId` | Record ID | string | ✓ | Unique identifier (system-generated) |
| `ownerId` | Customer | user | ✓ | Customer being invoiced |
| `invoiceNumber` | Invoice Number | string | ✓ | Human-readable invoice identifier |
| `issueDate` | Issue Date | date | ✓ | When invoice was created |
| `dueDate` | Due Date | date | ✓ | Payment due date |
| `status` | Status | enum | ✓ | Current invoice status |
| `subtotalCents` | Subtotal | currency | ✓ | Subtotal before tax (in cents) |
| `taxCents` | Tax Amount | currency | ✓ | Tax amount (in cents) |
| `totalCents` | Total | currency | ✓ | Total amount due (in cents) |
| `paidCents` | Amount Paid | currency | ✓ | Amount already paid (in cents) |
| `notes` | Notes | text | | Additional notes or payment terms |

**Status Options:** DRAFT, SENT, PAID, OVERDUE, CANCELLED

### System Fields
| Property | Label | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `tenantId` | Organization | string | ✓ | Organization identifier (read-only) |
| `createdAt` | Created Date | datetime | ✓ | Record creation timestamp (read-only) |
| `updatedAt` | Last Modified | datetime | ✓ | Last update timestamp (read-only) |

---

## Summary Statistics

| Schema | Total Properties | Required Properties | Groups |
|--------|-----------------|---------------------|---------|
| Pets | 17 | 4 | 4 (Basic, Medical, Behavior, System) |
| Owners | 15 | 4 | 3 (Contact, Address, System) |
| Bookings | 16 | 8 | 4 (Details, Financial, Notes, System) |
| Kennels | 17 | 6 | 5 (Details, Location, Pricing, Features, System) |
| Services | 9 | 6 | 2 (Details, System) |
| Staff | 8 | 3 | 2 (Details, System) |
| Vaccinations | 11 | 5 | 2 (Details, System) |
| Payments | 15 | 6 | 2 (Details, System) |
| Check-Ins | 11 | 3 | 2 (Details, System) |
| Check-Outs | 10 | 3 | 2 (Details, System) |
| Incident Reports | 11 | 5 | 2 (Details, System) |
| Communications | 11 | 5 | 2 (Details, System) |
| Notes | 11 | 6 | 2 (Details, System) |
| Tasks | 13 | 7 | 2 (Details, System) |
| Runs | 11 | 7 | 2 (Details, System) |
| Run Templates | 9 | 5 | 2 (Details, System) |
| Users | 13 | 3 | 3 (Profile, Status, System) |
| Tenants | 11 | 4 | 2 (Details, System) |
| Invoices | 13 | 9 | 2 (Details, System) |

**Total:** 19 schemas, 232 properties

---

## Notes

- All properties marked as **System Fields** are read-only and managed automatically by BarkBase
- Properties with `✓` in the Required column must have a value when creating new records
- Currency values are always stored in cents (e.g., $50.00 = 5000 cents)
- All datetime values are stored in UTC and converted to user's timezone in UI
- JSON properties can store complex nested data structures
- File properties store URLs pointing to uploaded files (S3, Azure Blob, etc.)
- User properties create relationships between records (foreign keys)

---

**Document Version:** 1.0  
**Generated:** October 30, 2025

