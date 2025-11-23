# Directory Data Flow Map

This document summarizes the React Query hooks and API calls used by the Pets & Owners directory screens (lists + detail + unified view). It focuses on where data duplication and inconsistent query usage exist today.

## Pets Domain

### List Screen (`/pets`)

* **Hook(s)**: Primarily implemented inline in `frontend/src/features/pets/routes/Pets.jsx`
  * Uses React Query to fetch pets via `/api/v1/pets`, applying filters (status, species, search) through query params.
  * Query keys typically follow `['pets', filters]`.
* **Supporting API file**: `frontend/src/features/pets/api.js`
  * Exports helper functions (`fetchPets`, `fetchPetDetail`, etc.) that call the canonical endpoints under `/api/v1/pets`.
* **Observations**
  * Owners list uses a different filtering approach even though both hit `/api/v1/pets`.
  * Multiple components (filters, tables) call `useQuery` separately rather than sharing data via context.

### Detail Screen (`/pets/:petId`)

* **Hook**: `useQuery(['pets', petId], () => fetchPetDetail(petId))`
  * Endpoint: `/api/v1/pets/{petId}`
* **Derived Data**
  * Associated bookings, notes, activity feed; these are fetched via separate queries inside child components (e.g., `/api/v1/bookings?petId=...`).
* **Observations**
  * Each tab on the detail view manages its own query key, leading to multiple round-trips even when data overlaps (e.g., upcoming bookings vs. full booking history).

## Owners Domain

### List Screen (`/owners`)

* **Hook(s)**: Inline inside `frontend/src/features/owners/routes/Owners.jsx`
  * React Query fetches `/api/v1/owners` with search + filter params.
  * Query keys often look like `['owners', filters]`.
* **Supporting API file**: `frontend/src/features/owners/api.js`
  * Functions such as `fetchOwners`, `fetchOwnerDetail`, etc.
* **Observations**
  * Filter logic diverges from pets: owners list uses separate state managers for search + segments.
  * There’s no shared hook that both Pets and Owners can reuse for search state or debouncing.

### Detail Screen (`/owners/:ownerId`)

* **Hook**: `useQuery(['owners', ownerId], () => fetchOwnerDetail(ownerId))`
  * Endpoint: `/api/v1/owners/{ownerId}`
* **Associated Data**
  * Sub-queries for associated pets (`/api/v1/pets?ownerId=...`), notes, billing history, etc., each with its own query key.
* **Observations**
  * Similar to Pet Detail, each tab fetches data independently; there is no owner “snapshot” that returns pets + profile + stats in one call.
  * Owner detail and Customer detail screens hit similar endpoints but map the response differently, leading to duplicate queries when both screens are used.

## Unified Pet + People View (`/pets-people`)

* **Implementation**: `frontend/src/features/pets-people/UnifiedPetPeopleView.jsx`
  * Fetches both `/api/v1/pets` and `/api/v1/owners` depending on filters, using separate React Query calls.
  * Maintains its own search state rather than sharing with the dedicated list screens.
* **Observations**
  * Duplicates list queries from Pets/Owners instead of reusing data (e.g., switching from `/pets` to `/pets-people` triggers another fetch).
  * Empty/loading states do not leverage existing data from the primary lists, resulting in more API traffic.

## Customers / CRM (`/customers/:ownerId`)

* **Hook**: Similar to `OwnerDetail`, fetches `/api/v1/owners/{ownerId}` but under a different wrapper.
* **Observations**
  * Data pulled here is redundant with `/owners/:ownerId`, yet fetches are separate.
  * No shared caching strategy for owner detail, so both screens load individually.

## Redundancy & Duplication Summary

1. **List-Level Duplication**
   * `/api/v1/pets` and `/api/v1/owners` are fetched independently by:
     * Pets list
     * Owners list
     * UnifiedPetsPeople view
     * Batch operations (e.g., certain modals request lists again)

2. **Detail-Level Duplication**
   * Owner detail and Customer detail fetch the same owner profile data separately.
   * Pet detail tabs each issue their own queries, even when data could be returned in a single response.

3. **Lack of Shared Hooks**
   * Each screen recreates search/filter logic rather than using a shared “directory query” hook.
   * No combined “directory snapshot” exists (similar to the Today snapshot created in Phase B:6).

4. **Reload / Manual Refresh**
   * Some Batch modals (e.g., owner/pet assignment flows) still call `window.location.reload()` instead of React Query invalidation (needs confirmation in later phases).

These findings will guide Phases C1:2+ when we begin refactoring the directory screens to share hooks and reduce redundant API calls. No code changes were made while preparing this document.

