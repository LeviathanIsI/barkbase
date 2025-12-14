# API Endpoints Reference

## Overview

BarkBase API is organized into four microservices:

| Service | Base Path | Purpose |
|---------|-----------|---------|
| Entity Service | `/api/v1/entity` | Core business entities (owners, pets, staff) |
| Operations Service | `/api/v1/operations` | Bookings, schedules, runs |
| Financial Service | `/api/v1/financial` | Payments, invoices, pricing |
| Analytics Service | `/api/v1/analytics` | Reports, dashboards, metrics |
| Config Service | `/api/v1/config` | Tenant settings, feature flags |

## Authentication

All endpoints require JWT authentication unless noted otherwise.

**Headers Required:**
```
Authorization: Bearer <jwt_token>
X-Tenant-Id: <tenant_uuid>
Content-Type: application/json
```

**Response Format:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 25
  }
}
```

---

## Entity Service (`/api/v1/entity`)

### Owners

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/owners` | List all owners | ✅ |
| GET | `/owners/:id` | Get owner by ID | ✅ |
| POST | `/owners` | Create new owner | ✅ |
| PUT | `/owners/:id` | Update owner | ✅ |
| DELETE | `/owners/:id` | Soft delete owner | ✅ |
| GET | `/owners/:id/pets` | Get owner's pets | ✅ |
| GET | `/owners/:id/bookings` | Get owner's bookings | ✅ |

**List Owners Query Parameters:**
```
GET /api/v1/entity/owners?page=1&pageSize=25&search=john&status=active&sort=lastName&order=asc
```

**Create Owner Request:**
```json
POST /api/v1/entity/owners
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "(555) 123-4567",
  "address": "123 Main St",
  "city": "Tampa",
  "state": "FL",
  "zip": "33601",
  "notes": "Prefers morning drop-offs"
}
```

**Owner Response:**
```json
{
  "id": "uuid",
  "recordId": "OWN-001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "(555) 123-4567",
  "address": "123 Main St",
  "city": "Tampa",
  "state": "FL",
  "zip": "33601",
  "notes": "Prefers morning drop-offs",
  "petCount": 2,
  "totalBookings": 15,
  "totalSpent": 2500.00,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-12-01T14:22:00Z"
}
```

### Pets

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/pets` | List all pets | ✅ |
| GET | `/pets/:id` | Get pet by ID | ✅ |
| POST | `/pets` | Create new pet | ✅ |
| PUT | `/pets/:id` | Update pet | ✅ |
| DELETE | `/pets/:id` | Soft delete pet | ✅ |
| GET | `/pets/:id/vaccinations` | Get pet vaccinations | ✅ |
| POST | `/pets/:id/vaccinations` | Add vaccination record | ✅ |
| GET | `/pets/:id/bookings` | Get pet's booking history | ✅ |

**Create Pet Request:**
```json
POST /api/v1/entity/pets
{
  "name": "Max",
  "ownerId": "owner-uuid",
  "species": "DOG",
  "breed": "Golden Retriever",
  "color": "Golden",
  "weight": 75,
  "weightUnit": "LBS",
  "dateOfBirth": "2020-03-15",
  "sex": "MALE",
  "isNeutered": true,
  "microchipId": "985141000123456",
  "notes": "Friendly, loves water",
  "feedingInstructions": "2 cups twice daily",
  "medicationInstructions": null,
  "veterinarian": "Dr. Smith",
  "vetPhone": "(555) 987-6543"
}
```

### Staff

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/staff` | List all staff members | ✅ |
| GET | `/staff/:id` | Get staff member by ID | ✅ |
| POST | `/staff` | Create staff member | ✅ (Admin) |
| PUT | `/staff/:id` | Update staff member | ✅ (Admin) |
| DELETE | `/staff/:id` | Deactivate staff member | ✅ (Admin) |
| GET | `/staff/:id/schedule` | Get staff schedule | ✅ |
| PUT | `/staff/:id/schedule` | Update staff schedule | ✅ (Admin) |

### Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users` | List tenant users | ✅ (Admin) |
| GET | `/users/me` | Get current user | ✅ |
| PUT | `/users/me` | Update current user profile | ✅ |
| POST | `/users/invite` | Invite new user | ✅ (Admin) |
| DELETE | `/users/:id` | Remove user access | ✅ (Admin) |

---

## Operations Service (`/api/v1/operations`)

### Bookings

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/bookings` | List all bookings | ✅ |
| GET | `/bookings/:id` | Get booking by ID | ✅ |
| POST | `/bookings` | Create new booking | ✅ |
| PUT | `/bookings/:id` | Update booking | ✅ |
| DELETE | `/bookings/:id` | Cancel booking | ✅ |
| POST | `/bookings/:id/check-in` | Check in booking | ✅ |
| POST | `/bookings/:id/check-out` | Check out booking | ✅ |
| GET | `/bookings/availability` | Check availability | ✅ |

**List Bookings Query Parameters:**
```
GET /api/v1/operations/bookings?
  page=1&
  pageSize=25&
  startDate=2024-12-01&
  endDate=2024-12-31&
  status=confirmed,checked_in&
  ownerId=uuid&
  petId=uuid&
  serviceType=boarding
```

**Create Booking Request:**
```json
POST /api/v1/operations/bookings
{
  "ownerId": "owner-uuid",
  "petIds": ["pet-uuid-1", "pet-uuid-2"],
  "serviceType": "BOARDING",
  "startDate": "2024-12-20T14:00:00Z",
  "endDate": "2024-12-27T11:00:00Z",
  "runId": "run-uuid",
  "specialInstructions": "Extra playtime requested",
  "addOns": [
    { "serviceId": "grooming-uuid", "date": "2024-12-23" },
    { "serviceId": "bath-uuid", "date": "2024-12-26" }
  ],
  "deposit": {
    "amount": 75.00,
    "paymentMethodId": "pm_xxx"
  }
}
```

**Booking Response:**
```json
{
  "id": "booking-uuid",
  "recordId": "BK-2024-001234",
  "status": "CONFIRMED",
  "owner": {
    "id": "owner-uuid",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "(555) 123-4567"
  },
  "pets": [
    { "id": "pet-uuid", "name": "Max", "breed": "Golden Retriever" }
  ],
  "serviceType": "BOARDING",
  "startDate": "2024-12-20T14:00:00Z",
  "endDate": "2024-12-27T11:00:00Z",
  "nights": 7,
  "run": {
    "id": "run-uuid",
    "name": "Suite A-1",
    "type": "LUXURY"
  },
  "pricing": {
    "baseRate": 65.00,
    "nights": 7,
    "subtotal": 455.00,
    "addOns": 45.00,
    "tax": 35.00,
    "total": 535.00,
    "depositPaid": 75.00,
    "balanceDue": 460.00
  },
  "addOns": [...],
  "createdAt": "2024-12-01T10:00:00Z"
}
```

### Schedules

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/schedules` | Get daily schedule | ✅ |
| GET | `/schedules/arrivals` | Today's arrivals | ✅ |
| GET | `/schedules/departures` | Today's departures | ✅ |
| GET | `/schedules/occupancy` | Occupancy by date | ✅ |

### Runs / Kennels

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/runs` | List all runs | ✅ |
| GET | `/runs/:id` | Get run details | ✅ |
| POST | `/runs` | Create run | ✅ (Admin) |
| PUT | `/runs/:id` | Update run | ✅ (Admin) |
| DELETE | `/runs/:id` | Delete run | ✅ (Admin) |
| GET | `/runs/:id/availability` | Check run availability | ✅ |
| POST | `/runs/:id/assign` | Assign pet to run | ✅ |
| POST | `/runs/:id/unassign` | Remove pet from run | ✅ |

### Daycare

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/daycare` | List daycare sessions | ✅ |
| POST | `/daycare/check-in` | Check in for daycare | ✅ |
| POST | `/daycare/check-out` | Check out from daycare | ✅ |
| GET | `/daycare/attendance` | Daily attendance | ✅ |

---

## Financial Service (`/api/v1/financial`)

### Invoices

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/invoices` | List all invoices | ✅ |
| GET | `/invoices/:id` | Get invoice by ID | ✅ |
| POST | `/invoices` | Create invoice | ✅ |
| PUT | `/invoices/:id` | Update invoice | ✅ |
| POST | `/invoices/:id/send` | Send invoice to customer | ✅ |
| POST | `/invoices/:id/void` | Void invoice | ✅ (Admin) |
| GET | `/invoices/:id/pdf` | Download invoice PDF | ✅ |

**Create Invoice Request:**
```json
POST /api/v1/financial/invoices
{
  "bookingId": "booking-uuid",
  "ownerId": "owner-uuid",
  "lineItems": [
    {
      "description": "Boarding - 7 nights",
      "quantity": 7,
      "unitPrice": 65.00,
      "amount": 455.00
    },
    {
      "description": "Grooming - Bath & Brush",
      "quantity": 1,
      "unitPrice": 45.00,
      "amount": 45.00
    }
  ],
  "taxRate": 7.0,
  "dueDate": "2024-12-27",
  "notes": "Thank you for choosing us!"
}
```

### Payments

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/payments` | List all payments | ✅ |
| GET | `/payments/:id` | Get payment by ID | ✅ |
| POST | `/payments` | Record payment | ✅ |
| POST | `/payments/:id/refund` | Process refund | ✅ (Manager+) |

**Create Payment Request:**
```json
POST /api/v1/financial/payments
{
  "invoiceId": "invoice-uuid",
  "amount": 535.00,
  "method": "CARD",
  "paymentMethodId": "pm_xxx",
  "idempotencyKey": "pay_abc123"
}
```

### Stripe Integration

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/stripe/create-payment-intent` | Create payment intent | ✅ |
| POST | `/stripe/confirm-payment` | Confirm payment | ✅ |
| GET | `/stripe/payment-methods` | List saved cards | ✅ |
| POST | `/stripe/attach-payment-method` | Save card | ✅ |
| DELETE | `/stripe/payment-methods/:id` | Remove saved card | ✅ |
| POST | `/stripe/webhook` | Stripe webhook handler | ❌ |

**Create Payment Intent:**
```json
POST /api/v1/financial/stripe/create-payment-intent
{
  "amount": 53500,  // In cents
  "currency": "usd",
  "invoiceId": "invoice-uuid",
  "customerId": "owner-uuid",
  "metadata": {
    "bookingId": "booking-uuid"
  }
}
```

### Pricing

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/pricing` | List all pricing | ✅ |
| GET | `/pricing/:serviceId` | Get service pricing | ✅ |
| PUT | `/pricing/:serviceId` | Update pricing | ✅ (Admin) |
| POST | `/pricing/calculate` | Calculate booking price | ✅ |

---

## Analytics Service (`/api/v1/analytics`)

### Dashboard

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/dashboard` | Get dashboard summary | ✅ |
| GET | `/dashboard/revenue` | Revenue metrics | ✅ |
| GET | `/dashboard/occupancy` | Occupancy metrics | ✅ |
| GET | `/dashboard/bookings` | Booking metrics | ✅ |

**Dashboard Response:**
```json
{
  "summary": {
    "todayArrivals": 5,
    "todayDepartures": 3,
    "currentOccupancy": 42,
    "totalCapacity": 50,
    "occupancyRate": 84
  },
  "revenue": {
    "today": 1250.00,
    "thisWeek": 8500.00,
    "thisMonth": 32000.00,
    "lastMonth": 28500.00,
    "changePercent": 12.3
  },
  "recentBookings": [...],
  "upcomingArrivals": [...]
}
```

### Reports

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/reports/revenue` | Revenue report | ✅ (Manager+) |
| GET | `/reports/occupancy` | Occupancy report | ✅ (Manager+) |
| GET | `/reports/customers` | Customer report | ✅ (Manager+) |
| GET | `/reports/services` | Services report | ✅ (Manager+) |
| POST | `/reports/export` | Export report to CSV | ✅ (Manager+) |

**Report Query Parameters:**
```
GET /api/v1/analytics/reports/revenue?
  startDate=2024-01-01&
  endDate=2024-12-31&
  groupBy=month&
  serviceType=all
```

---

## Config Service (`/api/v1/config`)

### Tenant Settings

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/tenant` | Get tenant settings | ✅ |
| PUT | `/tenant` | Update tenant settings | ✅ (Admin) |
| GET | `/tenant/branding` | Get branding settings | ✅ |
| PUT | `/tenant/branding` | Update branding | ✅ (Admin) |

### Services Configuration

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/services` | List configured services | ✅ |
| POST | `/services` | Add service | ✅ (Admin) |
| PUT | `/services/:id` | Update service | ✅ (Admin) |
| DELETE | `/services/:id` | Remove service | ✅ (Admin) |

### Feature Flags

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/features` | Get feature flags | ✅ |
| PUT | `/features` | Update feature flags | ✅ (Admin) |

---

## Error Responses

### Standard Error Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "amount", "message": "Amount must be positive" }
    ]
  },
  "requestId": "req_abc123xyz"
}
```

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable | Business rule violation |
| 429 | Too Many Requests | Rate limited |
| 500 | Server Error | Unexpected error |

### Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Authentication token required |
| `AUTH_INVALID` | Invalid or expired token |
| `AUTH_FORBIDDEN` | Insufficient permissions |
| `VALIDATION_ERROR` | Input validation failed |
| `NOT_FOUND` | Resource not found |
| `DUPLICATE` | Resource already exists |
| `RATE_LIMITED` | Too many requests |
| `BOOKING_CONFLICT` | Date/run conflict |
| `PAYMENT_FAILED` | Payment processing failed |
| `INTERNAL_ERROR` | Server error |

---

## Rate Limiting

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 5 requests | 1 minute |
| Standard API | 100 requests | 1 minute |
| Bulk Operations | 10 requests | 1 minute |
| Webhooks | 50 requests | 1 minute |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1702503600
```

---

## Pagination

**Request:**
```
GET /api/v1/entity/owners?page=2&pageSize=25
```

**Response:**
```json
{
  "data": [...],
  "meta": {
    "page": 2,
    "pageSize": 25,
    "total": 150,
    "totalPages": 6,
    "hasNext": true,
    "hasPrev": true
  }
}
```

---

## Filtering & Sorting

**Filter Examples:**
```
# By status
GET /bookings?status=confirmed

# Multiple statuses
GET /bookings?status=confirmed,checked_in

# Date range
GET /bookings?startDate=2024-12-01&endDate=2024-12-31

# Search
GET /owners?search=john

# Combined
GET /owners?search=john&status=active&sort=lastName&order=asc
```

**Sort Parameters:**
- `sort`: Field to sort by
- `order`: `asc` or `desc` (default: `asc`)
