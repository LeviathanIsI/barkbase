# BarkBase API Documentation
**Version**: 1.0
**Base URL**: `https://api.barkbase.com/api/v1`
**Authentication**: JWT Bearer Token + X-Tenant-Id header

---

## Authentication

All endpoints (except public) require:
- `Authorization: Bearer <jwt_token>` header
- `X-Tenant-Id: <tenant_uuid>` header

### Auth Endpoints

#### POST /auth/register
Register new tenant and admin user.

**Request**:
```json
{
  "email": "admin@company.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "tenantSlug": "company-name",
  "tenantName": "Company Name Inc",
  "plan": "FREE"
}
```

**Response** (201):
```json
{
  "user": { "recordId": "uuid", "email": "admin@company.com" },
  "tenant": { "recordId": "uuid", "slug": "company-name" },
  "tokens": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG...",
    "accessTokenExpiresIn": 900
  }
}
```

#### POST /auth/login
Login existing user.

**Request**:
```json
{
  "email": "admin@company.com",
  "password": "SecurePass123!"
}
```

**Response** (200):
```json
{
  "user": { "recordId": "uuid", "email": "admin@company.com" },
  "membership": { "recordId": "uuid", "tenantId": "uuid", "role": "ADMIN" },
  "tokens": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG...",
    "accessTokenExpiresIn": 900
  }
}
```

---

## Bookings

#### GET /bookings
List all bookings for tenant.

**Query Parameters**:
- `status`: PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED
- `startDate`: ISO date (filter by start date)
- `endDate`: ISO date (filter by end date)
- `limit`: number (default 50, max 1000)
- `offset`: number (default 0)

**Response** (200):
```json
[
  {
    "recordId": "uuid",
    "petId": "uuid",
    "petName": "Max",
    "ownerId": "uuid",
    "ownerName": "Jane Smith",
    "startDate": "2025-01-15",
    "endDate": "2025-01-20",
    "status": "CONFIRMED",
    "totalAmount": 250.00,
    "notes": "Special diet required"
  }
]
```

#### POST /bookings
Create new booking.

**Request**:
```json
{
  "petId": "uuid",
  "startDate": "2025-01-15",
  "endDate": "2025-01-20",
  "serviceIds": ["uuid1", "uuid2"],
  "kennelId": "uuid",
  "notes": "Special diet required"
}
```

#### PUT /bookings/{id}
Update booking.

#### PATCH /bookings/{id}/status
Update booking status.

**Request**:
```json
{
  "status": "CONFIRMED"
}
```

#### POST /bookings/{id}/checkin
Check in booking.

#### POST /bookings/{id}/checkout
Check out booking.

#### DELETE /bookings/{id}
Cancel booking.

---

## Pets

#### GET /pets
List all pets.

**Query Parameters**:
- `ownerId`: Filter by owner
- `species`: DOG, CAT, OTHER
- `limit`, `offset`: Pagination

**Response** (200):
```json
[
  {
    "recordId": "uuid",
    "name": "Max",
    "species": "DOG",
    "breed": "Golden Retriever",
    "age": 3,
    "weight": 65.5,
    "ownerName": "Jane Smith",
    "medicalNotes": "Allergic to chicken"
  }
]
```

#### POST /pets
Create pet.

**Request**:
```json
{
  "name": "Max",
  "species": "DOG",
  "breed": "Golden Retriever",
  "dateOfBirth": "2022-01-15",
  "weight": 65.5,
  "color": "Golden",
  "microchipNumber": "123456789",
  "medicalNotes": "Allergic to chicken"
}
```

#### GET /pets/{id}
Get pet details.

#### PUT /pets/{id}
Update pet.

#### DELETE /pets/{id}
Delete pet.

#### GET /pets/{id}/vaccinations
List pet vaccinations.

#### POST /pets/{id}/vaccinations
Add vaccination record.

#### GET /pets/vaccinations/expiring
Get expiring vaccinations.

**Query**: `days=30` (vaccinations expiring within 30 days)

---

## Owners

#### GET /owners
List all owners.

#### POST /owners
Create owner.

**Request**:
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+1-555-0100",
  "address": "123 Main St, City, ST 12345",
  "emergencyContact": "+1-555-0200",
  "notes": "Prefers text communication"
}
```

#### GET /owners/{id}
Get owner details (includes pets).

#### PUT /owners/{id}
Update owner.

#### DELETE /owners/{id}
Delete owner.

---

## Kennels

#### GET /kennels
List all kennels.

#### GET /kennels/occupancy
List kennels with real-time occupancy.

**Response**:
```json
[
  {
    "recordId": "uuid",
    "name": "Kennel A1",
    "type": "KENNEL",
    "capacity": 1,
    "occupied": 1,
    "amenities": {"indoor": true, "outdoor": true}
  }
]
```

#### POST /kennels
Create kennel.

#### PUT /kennels/{id}
Update kennel.

#### DELETE /kennels/{id}
Delete kennel.

---

## Staff

#### GET /staff
List all staff (includes user/role info).

#### POST /staff
Create staff member.

**Request**:
```json
{
  "membershipId": "uuid",
  "position": "Kennel Technician",
  "phone": "+1-555-0100",
  "emergencyContact": "+1-555-0200"
}
```

---

## Payments & Invoices

#### GET /payments
List payments.

#### POST /payments
Record payment.

**Request**:
```json
{
  "invoiceId": "uuid",
  "amount": 250.00,
  "method": "CREDIT_CARD",
  "status": "COMPLETED",
  "transactionId": "ch_1234567890"
}
```

#### GET /invoices
List invoices.

#### POST /invoices
Create invoice.

#### GET /invoices/{id}
Get invoice details.

#### PUT /invoices/{id}
Update invoice.

#### PATCH /invoices/{id}/status
Update invoice status (DRAFT, SENT, PAID, OVERDUE).

#### DELETE /invoices/{id}
Delete invoice.

---

## Tenants

#### GET /tenants?slug={slug}
Get tenant by slug (public endpoint).

#### GET /tenants/current
Get current tenant details.

#### GET /tenants/current/plan
Get tenant plan and features.

**Response**:
```json
{
  "plan": "PRO",
  "features": {
    "realtime": true,
    "advancedReports": true,
    "seats": 5,
    "activePets": "unlimited"
  }
}
```

#### GET /tenants/current/onboarding
Get onboarding checklist status.

#### PATCH /tenants/current/onboarding
Update onboarding step.

#### PUT /tenants/current/theme
Update tenant theme/branding.

**Request**:
```json
{
  "colors": {
    "primary": "59 130 246",
    "accent": "249 115 22"
  },
  "fonts": {
    "sans": "Inter, sans-serif"
  },
  "assets": {
    "logo": "https://s3.amazonaws.com/..."
  }
}
```

---

## Dashboard

#### GET /dashboard/stats
Get dashboard overview stats.

**Response**:
```json
{
  "occupancy": {
    "current": 45,
    "total": 60,
    "percentage": 75
  },
  "todayArrivals": 5,
  "todayDepartures": 3,
  "revenueThisMonth": 12500.00,
  "pendingInvoices": 8
}
```

#### GET /dashboard/today-pets
Get pets in facility today.

#### GET /dashboard/arrivals
Get upcoming arrivals.

---

## Services & Packages

#### GET /services
List services.

#### POST /services
Create service.

**Request**:
```json
{
  "name": "Boarding",
  "category": "BOARDING",
  "price": 50.00,
  "duration": 1,
  "description": "Daily boarding service"
}
```

#### GET /packages
List packages.

#### POST /packages
Create prepaid package.

---

## Reports

#### GET /reports/revenue
Revenue report.

**Query**: `startDate`, `endDate`, `groupBy` (day/week/month)

#### GET /reports/occupancy
Occupancy report.

#### GET /reports/vaccinations
Vaccination compliance report.

---

## Error Codes

| Code | Description |
|------|-------------|
| AUTH_001 | Invalid credentials |
| AUTH_002 | Missing required fields |
| AUTH_003 | Duplicate user |
| AUTH_004 | Duplicate tenant |
| AUTH_005 | Invalid token |
| AUTH_006 | Unauthorized |
| RES_001 | Resource not found |
| VAL_001 | Invalid input |
| SYS_001 | Internal server error |

---

## Rate Limits

- Auth endpoints: 10 requests/second
- General endpoints: 100 requests/second
- Exceeded: HTTP 429 with `Retry-After` header

---

## WebSocket (Real-time)

**Connection**: `wss://ws.barkbase.com`

**Authentication**: Send `accessToken` in first message.

**Events**:
- `booking.created`
- `booking.updated`
- `booking.checkin`
- `booking.checkout`
- `kennel.occupied`
- `kennel.vacated`

---

**For complete OpenAPI spec, see**: `openapi.yaml`
