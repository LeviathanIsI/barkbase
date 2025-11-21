# API Routes Documentation

## API Gateway Configuration
- **Base URL:** `https://smvidb1rd0.execute-api.us-east-2.amazonaws.com`
- **Authentication:** JWT Bearer tokens (RS256)
- **Authorizer:** AWS HTTP API JWT Authorizer with Cognito

## Route Map

### Authentication Routes
**Lambda:** AuthApiFunction

| Method | Endpoint | Handler | Auth Required | Description |
|--------|----------|---------|--------------|-------------|
| POST | `/api/v1/auth/login` | `login()` | No | User authentication |
| POST | `/api/v1/auth/signup` | `signup()` | No | New user registration |
| POST | `/api/v1/auth/refresh` | `refreshToken()` | Yes | Refresh JWT token |
| POST | `/api/v1/auth/logout` | `logout()` | Yes | User logout |

**Request/Response Examples:**

```javascript
// Login Request
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "securePassword123"
}

// Login Response
{
  "token": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIs...",
  "user": {
    "id": "123",
    "email": "user@example.com",
    "tenantId": "tenant-456",
    "role": "USER"
  }
}
```

---

### Pet Management Routes
**Lambda:** EntityServiceFunction

| Method | Endpoint | Handler | Auth Required | Description |
|--------|----------|---------|--------------|-------------|
| GET | `/api/v1/pets` | `listPets()` | Yes | List all pets for tenant |
| GET | `/api/v1/pets/{id}` | `getPet()` | Yes | Get specific pet |
| POST | `/api/v1/pets` | `createPet()` | Yes | Create new pet |
| PUT | `/api/v1/pets/{id}` | `updatePet()` | Yes | Update pet |
| DELETE | `/api/v1/pets/{id}` | `deletePet()` | Yes | Delete pet |
| GET | `/api/v1/pets/vaccinations/expiring` | `listExpiringVaccinations()` | Yes | Get pets with expiring vaccines |

**Request/Response Examples:**

```javascript
// Create Pet Request
POST /api/v1/pets
Authorization: Bearer {token}
{
  "name": "Max",
  "species": "DOG",
  "breed": "Golden Retriever",
  "birthDate": "2020-01-15",
  "ownerId": "owner-123"
}

// List Expiring Vaccinations Response
GET /api/v1/pets/vaccinations/expiring?daysAhead=90
{
  "data": [
    {
      "petId": "pet-123",
      "petName": "Max",
      "vaccinationName": "Rabies",
      "expiryDate": "2024-02-15",
      "daysUntilExpiry": 45,
      "ownerName": "John Doe",
      "ownerPhone": "555-0123"
    }
  ]
}
```

---

### Owner Management Routes
**Lambda:** EntityServiceFunction

| Method | Endpoint | Handler | Auth Required | Description |
|--------|----------|---------|--------------|-------------|
| GET | `/api/v1/owners` | `listOwners()` | Yes | List all owners |
| GET | `/api/v1/owners/{id}` | `getOwner()` | Yes | Get specific owner |
| POST | `/api/v1/owners` | `createOwner()` | Yes | Create new owner |
| PUT | `/api/v1/owners/{id}` | `updateOwner()` | Yes | Update owner |
| DELETE | `/api/v1/owners/{id}` | `deleteOwner()` | Yes | Delete owner |

---

### Staff Management Routes
**Lambda:** EntityServiceFunction

| Method | Endpoint | Handler | Auth Required | Description |
|--------|----------|---------|--------------|-------------|
| GET | `/api/v1/staff` | `listStaff()` | Yes | List all staff |
| GET | `/api/v1/staff/{id}` | `getStaffMember()` | Yes | Get specific staff |
| POST | `/api/v1/staff` | `createStaffMember()` | Yes | Create new staff |
| PUT | `/api/v1/staff/{id}` | `updateStaffMember()` | Yes | Update staff |
| DELETE | `/api/v1/staff/{id}` | `deleteStaffMember()` | Yes | Delete staff |

---

### Analytics & Reports Routes
**Lambda:** AnalyticsServiceFunction

| Method | Endpoint | Handler | Auth Required | Description |
|--------|----------|---------|--------------|-------------|
| GET | `/api/v1/reports/arrivals` | `getReportArrivals()` | Yes | Arrival report |
| GET | `/api/v1/reports/departures` | `getReportDepartures()` | Yes | Departure report |
| GET | `/api/v1/reports/dashboard` | `getDashboard()` | Yes | Dashboard data |

**Query Parameters:**
- `startDate` - Start date for report (YYYY-MM-DD)
- `endDate` - End date for report (YYYY-MM-DD)
- `limit` - Number of results to return
- `offset` - Pagination offset

---

### Operations Routes
**Lambda:** OperationsServiceFunction

| Method | Endpoint | Handler | Auth Required | Description |
|--------|----------|---------|--------------|-------------|
| GET | `/api/v1/reservations` | `listReservations()` | Yes | List reservations |
| POST | `/api/v1/reservations` | `createReservation()` | Yes | Create reservation |
| PUT | `/api/v1/reservations/{id}` | `updateReservation()` | Yes | Update reservation |
| DELETE | `/api/v1/reservations/{id}` | `cancelReservation()` | Yes | Cancel reservation |
| POST | `/api/v1/checkin` | `checkIn()` | Yes | Check in pet |
| POST | `/api/v1/checkout` | `checkOut()` | Yes | Check out pet |

---

## Authentication Requirements

### JWT Token Structure
```javascript
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "tenantId": "tenant-uuid",
  "role": "USER|ADMIN|STAFF",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Authorization Header
```
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

### Token Validation Process
1. API Gateway validates JWT signature with Cognito
2. Lambda extracts claims from `event.requestContext.authorizer.jwt.claims`
3. TenantId is extracted for multi-tenant filtering
4. If tenantId missing, query database for user's tenant

---

## Multi-Tenant Filtering

All endpoints automatically filter data by tenant:

```javascript
// Automatic tenant filtering applied
SELECT * FROM pets WHERE "tenantId" = $1 AND "deletedAt" IS NULL
```

### Tenant Context Extraction
```javascript
function getUserInfoFromEvent(event) {
    const claims = event?.requestContext?.authorizer?.jwt?.claims;

    // For Cognito users without tenantId, fetch from database
    if (!claims.tenantId && claims.sub) {
        const tenant = await getTenantForUser(claims.sub);
        claims.tenantId = tenant.id;
    }

    return {
        sub: claims.sub,
        email: claims.email,
        tenantId: claims.tenantId,
        role: claims.role
    };
}
```

---

## Error Responses

### Standard Error Format
```javascript
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-20T12:00:00.000Z",
  "details": {} // Optional additional details
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

---

## Rate Limiting
- Default: 10,000 requests per second
- Burst: 5,000 requests
- Per-route throttling can be configured in CDK

---

## CORS Configuration
```javascript
headers: {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
}
```

---

## WebSocket Routes
**Endpoint:** `wss://nn9mlzmgug.execute-api.us-east-2.amazonaws.com/production`

| Route | Handler | Description |
|-------|---------|-------------|
| `$connect` | `handleConnect()` | WebSocket connection |
| `$disconnect` | `handleDisconnect()` | WebSocket disconnection |
| `$default` | `handleMessage()` | Default message handler |

---

## Recent Changes & Fixes

### JWT Authorizer Added to Proxy Routes (Fixed)
- **Issue:** Proxy routes missing JWT authorizer causing 401 errors
- **Fix:** Added `authorizer: httpAuthorizer` to all proxy routes in CDK
- **Files:** `cdk-stack.ts` lines 1567, 1572, 1577

### Duplicate Function Declarations (Fixed)
- **Issue:** Entity service had duplicate function declarations
- **Fix:** Removed duplicate async function declarations
- **File:** `entity-service/index.js` lines 644-1034