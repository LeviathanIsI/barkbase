# BarkBase API Versioning Strategy

> Last Updated: 2024-12-01 (P3-3 Documentation)

## Overview

This document defines the API versioning strategy for BarkBase, including current route inventory, versioning rules, and guidelines for future API changes.

## Current API Version

**Active Version:** `v1`
**Base Path:** `/api/v1`

All production API routes use the `/api/v1` prefix. There is currently no `v2` or deprecated version.

---

## Route Inventory by Service

### Auth API (`auth-api`)
Authentication and session management.

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/v1/auth/login` | User login (Cognito token validation) |
| POST | `/api/v1/auth/register` | User registration |
| POST | `/api/v1/auth/refresh` | Token refresh |
| POST | `/api/v1/auth/logout` | User logout |
| GET | `/api/v1/auth/me` | Get current user info |
| GET | `/api/v1/auth/sessions` | List user sessions |
| GET | `/api/v1/health` | Health check (public) |

### User Profile Service (`user-profile-service`)
User and tenant profile management.

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/profile/me` | Get current user profile |
| PUT | `/api/v1/profile/me` | Update current user profile |
| GET | `/api/v1/profile/tenant` | Get current tenant info |
| PUT | `/api/v1/profile/tenant` | Update tenant info |
| GET | `/api/v1/profile/preferences` | Get user preferences |
| PUT | `/api/v1/profile/preferences` | Update user preferences |

### Entity Service (`entity-service`)
Core business entity CRUD operations.

#### Tenants
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/entity/tenants` | List tenants |
| GET | `/api/v1/entity/tenants/{id}` | Get tenant |
| POST | `/api/v1/entity/tenants` | Create tenant |
| PUT | `/api/v1/entity/tenants/{id}` | Update tenant |
| DELETE | `/api/v1/entity/tenants/{id}` | Delete tenant |

#### Facilities (Kennels)
> **Note:** See `docs/NAMING_CONVENTIONS.md` - `/facilities` routes query the `"Kennel"` table.

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/entity/facilities` | List kennels/facilities |
| GET | `/api/v1/entity/facilities/{id}` | Get kennel/facility |
| POST | `/api/v1/entity/facilities` | Create kennel/facility |
| PUT | `/api/v1/entity/facilities/{id}` | Update kennel/facility |
| DELETE | `/api/v1/entity/facilities/{id}` | Delete kennel/facility |

#### Pets
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/entity/pets` | List pets |
| GET | `/api/v1/entity/pets/{id}` | Get pet |
| POST | `/api/v1/entity/pets` | Create pet |
| PUT | `/api/v1/entity/pets/{id}` | Update pet |
| DELETE | `/api/v1/entity/pets/{id}` | Delete pet (soft delete) |

#### Vaccinations
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/entity/pets/vaccinations/expiring` | Get expiring vaccinations |
| GET | `/api/v1/entity/pets/{id}/vaccinations` | Get pet's vaccinations |
| POST | `/api/v1/entity/pets/{id}/vaccinations` | Create vaccination |
| PUT | `/api/v1/entity/pets/{petId}/vaccinations/{id}` | Update vaccination |
| DELETE | `/api/v1/entity/pets/{petId}/vaccinations/{id}` | Delete vaccination |

#### Owners
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/entity/owners` | List owners |
| GET | `/api/v1/entity/owners/{id}` | Get owner |
| POST | `/api/v1/entity/owners` | Create owner |
| PUT | `/api/v1/entity/owners/{id}` | Update owner |
| DELETE | `/api/v1/entity/owners/{id}` | Delete owner (soft delete) |
| GET | `/api/v1/entity/owners/{id}/export` | Export owner data (GDPR) |
| DELETE | `/api/v1/entity/owners/{id}/data` | Delete owner data (GDPR) |

#### Staff
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/entity/staff` | List staff members |
| GET | `/api/v1/entity/staff/{id}` | Get staff member |
| POST | `/api/v1/entity/staff` | Create staff member |
| PUT | `/api/v1/entity/staff/{id}` | Update staff member |
| DELETE | `/api/v1/entity/staff/{id}` | Delete staff member |

### Operations Service (`operations-service`)
Bookings, tasks, scheduling, and daily operations.

#### Bookings
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/operations/bookings` | List bookings |
| GET | `/api/v1/operations/bookings/{id}` | Get booking |
| POST | `/api/v1/operations/bookings` | Create booking |
| PUT | `/api/v1/operations/bookings/{id}` | Update booking |
| DELETE | `/api/v1/operations/bookings/{id}` | Cancel booking |
| POST | `/api/v1/operations/bookings/{id}/checkin` | Check in |
| POST | `/api/v1/operations/bookings/{id}/checkout` | Check out |
| GET | `/api/v1/operations/bookings/availability` | Check availability |

#### Recurring Bookings
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/recurring-bookings` | List recurring bookings |
| GET | `/api/v1/recurring-bookings/{id}` | Get recurring booking |
| POST | `/api/v1/recurring-bookings` | Create recurring booking |
| PUT | `/api/v1/recurring-bookings/{id}` | Update recurring booking |
| DELETE | `/api/v1/recurring-bookings/{id}` | Delete recurring booking |

#### Tasks
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/operations/tasks` | List tasks |
| GET | `/api/v1/operations/tasks/{id}` | Get task |
| POST | `/api/v1/operations/tasks` | Create task |
| PUT | `/api/v1/operations/tasks/{id}` | Update task |
| DELETE | `/api/v1/operations/tasks/{id}` | Delete task |

#### Time Tracking
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/v1/time-entries/clock-in` | Clock in |
| POST | `/api/v1/time-entries/clock-out` | Clock out |
| GET | `/api/v1/time-entries` | List time entries |
| GET | `/api/v1/time-entries/current` | Get current time status |
| GET | `/api/v1/time-entries/{id}` | Get time entry |
| PUT | `/api/v1/time-entries/{id}` | Update time entry |
| DELETE | `/api/v1/time-entries/{id}` | Delete time entry |

#### Shifts
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/shifts` | List shifts |
| POST | `/api/v1/shifts` | Create shift |
| PUT | `/api/v1/shifts/{id}` | Update shift |
| DELETE | `/api/v1/shifts/{id}` | Delete shift |
| GET | `/api/v1/shifts/templates` | List shift templates |
| POST | `/api/v1/shifts/bulk` | Bulk create shifts |
| GET | `/api/v1/shifts/week` | Get weekly schedule |

#### Incidents
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/incidents` | List incidents |
| GET | `/api/v1/incidents/{id}` | Get incident |
| POST | `/api/v1/incidents` | Create incident |
| PUT | `/api/v1/incidents/{id}` | Update incident |

#### Notifications
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/v1/notifications/email` | Send email |
| POST | `/api/v1/notifications/booking-confirmation` | Send booking confirmation |
| POST | `/api/v1/notifications/booking-reminder` | Send booking reminder |
| POST | `/api/v1/notifications/vaccination-reminder` | Send vaccination reminder |
| POST | `/api/v1/notifications/check-in` | Send check-in notification |
| POST | `/api/v1/notifications/check-out` | Send check-out notification |
| POST | `/api/v1/notifications/sms` | Send SMS |
| GET | `/api/v1/notifications/sms/config` | Get SMS config |

#### Calendar
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/calendar/events` | Get calendar events |
| GET | `/api/v1/calendar/occupancy` | Get occupancy data |

#### Run Templates
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/run-templates` | List run templates |
| POST | `/api/v1/run-templates` | Create run template |
| PUT | `/api/v1/run-templates/{id}` | Update run template |
| DELETE | `/api/v1/run-templates/{id}` | Delete run template |

### Analytics Service (`analytics-service`)
Dashboard, reports, and analytics.

#### Dashboard
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/analytics/dashboard` | Dashboard overview |
| GET | `/api/v1/analytics/dashboard/summary` | Dashboard summary |
| GET | `/api/v1/analytics/dashboard/kpis` | Key performance indicators |

#### Revenue Analytics
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/analytics/revenue` | Revenue overview |
| GET | `/api/v1/analytics/revenue/daily` | Daily revenue |
| GET | `/api/v1/analytics/revenue/monthly` | Monthly revenue |

#### Occupancy Analytics
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/analytics/occupancy` | Occupancy overview |
| GET | `/api/v1/analytics/occupancy/current` | Current occupancy |
| GET | `/api/v1/analytics/occupancy/forecast` | Occupancy forecast |

#### Customer & Pet Analytics
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/analytics/customers` | Customer analytics |
| GET | `/api/v1/analytics/customers/retention` | Customer retention |
| GET | `/api/v1/analytics/pets` | Pet analytics |
| GET | `/api/v1/analytics/pets/breeds` | Pet breeds breakdown |
| GET | `/api/v1/analytics/pets/services` | Pet service usage |

#### Reports & Exports
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/analytics/reports` | List reports |
| POST | `/api/v1/analytics/reports/generate` | Generate report |
| GET | `/api/v1/analytics/export/revenue` | Export revenue data |
| GET | `/api/v1/analytics/export/bookings` | Export bookings |
| GET | `/api/v1/analytics/export/customers` | Export customers |
| GET | `/api/v1/analytics/export/occupancy` | Export occupancy |
| GET | `/api/v1/analytics/export/pets` | Export pets |
| GET | `/api/v1/analytics/export/vaccinations` | Export vaccinations |

#### Segments & Messages
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/segments` | List customer segments |
| POST | `/api/v1/segments` | Create segment |
| GET | `/api/v1/messages/conversations` | List conversations |
| GET | `/api/v1/messages/unread/count` | Get unread count |

#### Compliance / USDA Forms
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/compliance` | Compliance overview |
| GET | `/api/v1/compliance/usda/7001` | Get USDA 7001 data |
| GET | `/api/v1/compliance/usda/7001/pdf` | Generate USDA 7001 PDF |
| GET | `/api/v1/compliance/usda/7002` | Get USDA 7002 data |
| GET | `/api/v1/compliance/usda/7002/pdf` | Generate USDA 7002 PDF |
| GET | `/api/v1/compliance/usda/7005` | Get USDA 7005 data |
| GET | `/api/v1/compliance/usda/7005/pdf` | Generate USDA 7005 PDF |
| GET | `/api/v1/compliance/vaccinations` | Vaccination compliance |
| GET | `/api/v1/compliance/inspection-checklist` | Inspection checklist |

#### Audit Logs
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/audit-logs` | List audit logs |
| GET | `/api/v1/audit-logs/summary` | Audit summary |
| GET | `/api/v1/audit-logs/export` | Export audit logs |

### Config Service (`config-service`)
Configuration, settings, and tenant customization.

#### Tenant Config
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/config/tenant` | Get tenant config |
| PUT | `/api/v1/config/tenant` | Update tenant config |
| GET | `/api/v1/config/tenant/theme` | Get tenant theme |
| PUT | `/api/v1/config/tenant/theme` | Update tenant theme |
| GET | `/api/v1/config/tenant/features` | Get feature flags |
| GET | `/api/v1/config/tenant/onboarding` | Get onboarding status |
| PUT | `/api/v1/config/tenant/onboarding` | Update onboarding |

#### System Config
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/config/system` | Get system config |
| GET | `/api/v1/config/system/features` | Get system features |
| GET | `/api/v1/config/settings` | Get all settings |

#### Account Defaults
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/account-defaults` | Get account defaults |
| PUT | `/api/v1/account-defaults` | Update account defaults |
| PUT | `/api/v1/account-defaults/logo` | Update logo |

#### Settings
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/settings/sms` | Get SMS settings |
| PUT | `/api/v1/settings/sms` | Update SMS settings |
| POST | `/api/v1/settings/sms/test` | Test SMS |
| POST | `/api/v1/settings/sms/verify` | Verify SMS number |
| POST | `/api/v1/settings/sms/disconnect` | Disconnect SMS |
| GET | `/api/v1/settings/sms/templates` | Get SMS templates |
| PUT | `/api/v1/settings/sms/templates` | Update SMS templates |
| GET | `/api/v1/settings/email` | Get email settings |
| PUT | `/api/v1/settings/email` | Update email settings |
| POST | `/api/v1/settings/email/test` | Test email |
| GET | `/api/v1/settings/email/usage` | Get email usage |
| GET | `/api/v1/settings/email/templates` | Get email templates |
| PUT | `/api/v1/settings/email/templates` | Update email templates |
| GET | `/api/v1/settings/domain` | Get domain settings |
| PUT | `/api/v1/settings/domain` | Update domain settings |
| POST | `/api/v1/settings/domain/verify` | Verify domain |
| GET | `/api/v1/settings/domain/status` | Get domain status |
| GET | `/api/v1/settings/online-booking` | Get online booking settings |
| PUT | `/api/v1/settings/online-booking` | Update online booking |
| GET | `/api/v1/settings/online-booking/check-slug` | Check slug availability |
| GET | `/api/v1/settings/online-booking/qr-code` | Generate QR code |
| GET | `/api/v1/settings/calendar` | Get calendar settings |
| PUT | `/api/v1/settings/calendar` | Update calendar settings |
| GET | `/api/v1/settings/booking` | Get booking settings |
| PUT | `/api/v1/settings/booking` | Update booking settings |
| GET | `/api/v1/settings/invoicing` | Get invoicing settings |
| PUT | `/api/v1/settings/invoicing` | Update invoicing settings |
| GET | `/api/v1/settings/invoicing/preview` | Preview invoice |
| GET | `/api/v1/settings/payments` | Get payment settings |
| PUT | `/api/v1/settings/payments` | Update payment settings |
| POST | `/api/v1/settings/payments/test-stripe` | Test Stripe |
| GET | `/api/v1/settings/payments/stripe-status` | Get Stripe status |
| POST | `/api/v1/settings/payments/disconnect-stripe` | Disconnect Stripe |

#### Policies
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/policies` | List policies |
| POST | `/api/v1/policies` | Create policy |
| PUT | `/api/v1/policies/{id}` | Update policy |
| DELETE | `/api/v1/policies/{id}` | Delete policy |
| GET | `/api/v1/policies/templates` | Get policy templates |

#### Import/Export
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/import-export/jobs` | List jobs |
| POST | `/api/v1/import-export/export` | Start export |
| POST | `/api/v1/import-export/import` | Start import |
| GET | `/api/v1/import-export/jobs/{id}` | Get job details |
| GET | `/api/v1/import-export/jobs/{id}/download` | Download export |

#### Privacy Config
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/config/privacy` | Get privacy settings |
| PUT | `/api/v1/config/privacy` | Update privacy settings |

### Financial Service (`financial-service`)
Invoicing, payments, and Stripe integration.

#### Invoices
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/financial/invoices` | List invoices |
| GET | `/api/v1/financial/invoices/{id}` | Get invoice |
| POST | `/api/v1/financial/invoices` | Create invoice |
| PUT | `/api/v1/financial/invoices/{id}` | Update invoice |
| DELETE | `/api/v1/financial/invoices/{id}` | Void invoice |

#### Payments
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/financial/payments` | List payments |
| POST | `/api/v1/financial/payments` | Record payment |

#### Stripe
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/v1/financial/stripe/payment-intent` | Create payment intent |
| POST | `/api/v1/financial/stripe/confirm` | Confirm payment |
| POST | `/api/v1/financial/stripe/customers` | Create Stripe customer |
| POST | `/api/v1/webhooks/stripe` | Stripe webhook |

---

## Versioning Rules

### When to Create a New Version

Create `/api/v2` routes when making **breaking changes**:

1. **Removing a field** from request/response
2. **Changing field types** (e.g., string → number)
3. **Changing required fields** (optional → required)
4. **Removing an endpoint**
5. **Changing authentication requirements**
6. **Changing error response formats**

### Non-Breaking Changes (Keep Same Version)

These changes are safe within the current version:

1. **Adding new optional fields** to requests
2. **Adding new fields** to responses
3. **Adding new endpoints**
4. **Adding new query parameters**
5. **Bug fixes** that don't change contracts

### Deprecation Process

1. **Announce deprecation** - Add deprecation notice to response headers
2. **Set sunset date** - Minimum 6 months notice
3. **Log usage** - Track which clients use deprecated endpoints
4. **Create migration guide** - Document v1 → v2 changes
5. **Remove after sunset** - Only after confirming no active usage

### Header Format

```http
Deprecation: true
Sunset: Sat, 01 Jun 2025 00:00:00 GMT
Link: </api/v2/resource>; rel="successor-version"
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Human-readable error message",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "email",
    "reason": "Invalid email format"
  }
}
```

### Error Codes

See `auth-handler.js` for the complete list:
- `VALIDATION_ERROR` - Invalid input
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Access denied
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Duplicate or conflict
- `INTERNAL_ERROR` - Server error

---

## Legacy Route Support

Some routes have legacy aliases for backward compatibility:

| Current Route | Legacy Alias |
|---------------|--------------|
| `/api/v1/profile/me` | `/api/v1/users/profile` |
| `/api/v1/recurring-bookings` | `/api/v1/recurring` |
| `/api/v1/time-entries/*` | `/api/v1/staff/time-entries/*` |
| `/api/v1/time-entries/clock-in` | `/api/v1/staff/clock-in` |

These legacy routes will be deprecated in a future version.

---

## Rate Limiting

| Route Category | Limit | Window |
|----------------|-------|--------|
| Auth endpoints | 10 req | 1 min |
| Export endpoints | 5 req | 1 min |
| General API | 100 req | 1 min |

---

## Summary

- **Current version:** v1
- **Total routes:** ~150+ endpoints across 7 services
- **URL format:** `/api/v1/{service}/{resource}`
- **Authentication:** JWT Bearer token (Cognito)
- **Multi-tenancy:** `X-Tenant-Id` header + JWT claims
