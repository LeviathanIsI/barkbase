# BarkBase Naming Conventions

> Last Updated: 2024-12-01 (P3-5 Standardization)

## Overview

This document clarifies the naming conventions for physical locations and boarding units across the codebase to prevent confusion.

## Key Terms

| Term | Definition | Database Table | User-Facing Label |
|------|------------|----------------|-------------------|
| **Facility** | A physical location/property where the business operates (e.g., "Main Building", "East Wing") | `"Facility"` | "Location" or "Property" |
| **Kennel** | An individual boarding unit within a facility (e.g., "Run 1", "Suite A", "Deluxe Room 3") | `"Kennel"` | "Kennel" or "Run" |

## Current State (Pre-Standardization)

### Issue: API Route Mismatch

The `/api/v1/entity/facilities` endpoint actually operates on the `"Kennel"` table (individual boarding units), not the `"Facility"` table (physical locations).

**Current Mapping:**
```
API Route                       → Database Table → Purpose
/api/v1/entity/facilities       → "Kennel"       → Individual boarding units
(no route)                      → "Facility"     → Physical locations
```

### Why This Happened

The `"Facility"` table was added later (migration 034) to support multi-location businesses. The original API route for kennels was named `/facilities` before the concept of a separate "Facility" entity existed.

## Standardized Naming (Recommended)

### Database Tables

| Table Name | Purpose | Key Columns |
|------------|---------|-------------|
| `"Facility"` | Physical locations/properties | `name`, `address_*`, `phone`, `email`, `capacity`, `is_primary` |
| `"Kennel"` | Individual boarding units | `name`, `category`, `capacity`, `size`, `features`, `price_modifier_cents` |

### API Routes

**Recommended (Future)**
```
/api/v1/entity/facilities       → "Facility" table (physical locations)
/api/v1/entity/kennels          → "Kennel" table (boarding units)
```

**Current (Backward Compatible)**
```
/api/v1/entity/facilities       → "Kennel" table (boarding units) - LEGACY
/api/v1/entity/locations        → "Facility" table (physical locations) - NEW
```

### Frontend Labels

| Context | Display Label | Notes |
|---------|---------------|-------|
| Navigation sidebar | "Kennels" | Already consistent |
| Settings pages | "Kennels & Runs" | For boarding unit config |
| Multi-location settings | "Locations" | For physical properties |
| Booking forms | "Kennel" dropdown | For unit selection |
| Reports | "By Kennel" / "By Location" | Distinguish clearly |

### Code Variables and Functions

```javascript
// Database queries - use table name exactly
SELECT * FROM "Kennel"      // For boarding units
SELECT * FROM "Facility"    // For physical locations

// API handlers - match the entity type
async function getKennels() { ... }      // Returns boarding units
async function getFacilities() { ... }   // Returns physical locations

// Frontend hooks - use domain terminology
useKennels()           // Fetches boarding units
useLocations()         // Fetches physical facilities (future)
```

## Migration Path

### Phase 1: Documentation (Complete)
- [x] Document current naming inconsistencies
- [x] Define standardized terminology
- [x] Create this conventions guide

### Phase 2: Backend Alignment (Optional - Breaking Change)
1. Add new routes for clarity:
   - `GET /api/v1/entity/kennels` → queries `"Kennel"` table
   - `GET /api/v1/entity/locations` → queries `"Facility"` table
2. Keep `/facilities` as deprecated alias for backward compatibility
3. Update frontend to use new routes

### Phase 3: Frontend Updates (Optional)
1. Create `useLocations()` hook for facility management
2. Update settings pages to clearly distinguish kennels vs. locations
3. Update labels in multi-location scenarios

## Guidelines for New Code

### When Adding New Features

1. **For individual boarding units**: Use "kennel" terminology
   - Query the `"Kennel"` table
   - Use `kennel_id` as foreign keys
   - Display as "Kennel", "Run", or "Unit" to users

2. **For physical locations**: Use "facility" or "location" terminology
   - Query the `"Facility"` table
   - Use `facility_id` as foreign keys
   - Display as "Location" or "Property" to users

### Avoid These Confusions

| ❌ Confusing | ✅ Clear |
|-------------|---------|
| "Add a new facility" (for boarding units) | "Add a new kennel" |
| `facility_id` pointing to Kennel table | `kennel_id` for Kennel, `facility_id` for Facility |
| `getFacilities()` returning kennels | Document clearly which entity is returned |

## Related Database Schema

### Kennel Table (Boarding Units)
```sql
CREATE TABLE "Kennel" (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  name text NOT NULL,           -- "Run 1", "Suite A"
  category text,                -- "standard", "deluxe", "suite"
  capacity integer DEFAULT 1,
  size text,                    -- "small", "medium", "large"
  features jsonb DEFAULT '[]',  -- ["climate_control", "outdoor_access"]
  price_modifier_cents integer,
  is_active boolean DEFAULT true,
  ...
);
```

### Facility Table (Physical Locations)
```sql
CREATE TABLE "Facility" (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  name text NOT NULL,           -- "Main Building", "East Wing"
  address_street text,
  address_city text,
  address_state text,
  capacity int4,                -- Total capacity of location
  is_primary bool DEFAULT false,
  ...
);
```

## Summary

- **Kennel** = Individual boarding unit (like a hotel room)
- **Facility** = Physical location (like a hotel building)
- The current API `/facilities` route queries kennels (historical naming)
- New code should use clear, entity-specific naming
- User-facing labels should be consistent per feature context
