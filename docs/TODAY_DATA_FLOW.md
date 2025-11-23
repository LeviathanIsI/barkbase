# Today / Command Center Data Flow

Source: `frontend/src/features/today/TodayCommandCenter.jsx`

This file enumerates the React Query hooks and API calls currently used by the Today view. The goal is to identify dependencies and highlight duplication for Phase B:2 planning.

## 1. Query Inventory

| Hook / Query | React Query Key | Endpoint(s) | Domain | Refresh | Purpose |
| --- | --- | --- | --- | --- | --- |
| `useUserProfileQuery()` | `['user-profile']` (inside hook) | `/api/v1/users/profile` | user-profile-service | default | Used to extract `propertyName` / `businessName` for hero title. |
| Arrivals query | `['bookings', 'arrivals', today]` | `GET /api/v1/bookings?date=<today>` | operations/bookings | 30s | Fetch all bookings for the selected date, then filtered client-side for `PENDING`/`CONFIRMED`. |
| Departures query | `['bookings', 'departures', today]` | `GET /api/v1/bookings?status=CHECKED_IN` | operations/bookings | 30s | Pulls all checked-in bookings, then filtered for those ending today. |
| Occupancy query | `['bookings', 'checked-in', today]` | `GET /api/v1/bookings?status=CHECKED_IN` | operations/bookings | 30s | Fetches the same data set as departures but used to show “In Facility”. |
| Dashboard stats | `['dashboard', 'stats', today]` | `GET /api/v1/dashboard/stats` | analytics-service | 60s | Aggregated metrics surfaced as hero stat cards. |
| Attention items | `['attention', 'items', today]` | `GET /api/v1/bookings?status=UNPAID`, (plus reuse of local arrivals array) | operations/bookings | 60s | Counts unpaid bookings + arrivals with `hasExpiringVaccinations`. Enabled only when arrivals data exists. |
| Batch check-out POST | (imperative) | `POST /api/v1/bookings/{id}/check-out` | operations/bookings | n/a | Called per booking when “Batch Check-out” is confirmed. |
| Batch check-in modal | (component) | `/api/v1/bookings` (inside `<BatchCheckIn />`) | operations/bookings | n/a | Imported component manages its own queries/mutations. |

## 2. Identified Issues

1. **Duplicate fetches for CHECKED_IN bookings**
   * Departures query and Occupancy query both request `/api/v1/bookings?status=CHECKED_IN`.
   * Both refresh every 30s independently.
   * Potential future action: share data via React Query or derive occupancy from departures + arrivals to reduce load.

2. **Client-side filtering of “arrivals”**
   * Arrivals query fetches all bookings for the date, then filters statuses. If backend supports `status` filter, we could offload to API later.

3. **Attention items rely on previously fetched data**
   * The attention query doesn’t fetch arrivals again; it reuses the `arrivals` array to count vaccination issues. This introduces temporal coupling (if arrivals haven’t loaded yet, attention query waits).

4. **Mix of analytics + operations domains**
   * The hero stats mix derived counts from bookings (operations-service) with aggregated analytics metrics. Need to be mindful of cross-service latency in future real-time dashboards.

5. **Manual page reload after batch checkout**
   * After processing check-outs, `window.location.reload()` is invoked. This discards React state and refetches everything, which is acceptable for now but highlights missing invalidation.

## 3. Critical vs. Secondary Data

| Category | Queries | Notes |
| --- | --- | --- |
| **Critical snapshot** (must load for the page to feel useful) | Arrivals, Departures, Occupancy | These drive the hero stats, both panels, and occupancy count. |
| **Secondary** (nice-to-have but not blockers) | Dashboard stats, Attention items | The UI still renders without them; they enhance awareness but can lag behind. |
| **Modal-only** | Batch check-in/out operations | Only used when modals open. Could be lazy-loaded in future. |

## 4. Future Opportunities (document-only)

1. **Coalesce `/bookings?status=CHECKED_IN` queries.** Share via React Query or unify into a single hook returning both departures and occupancy counts.
2. **Prefetch with server filters.** Add `status=PENDING/CONFIRMED` to the arrivals request once backend supports multi-status filtering.
3. **Refactor attention items.** Instead of double-fetching bookings for unpaid status, consider a dedicated `/api/v1/alerts/today` endpoint (documented for later phases).

> This document is informational only; no runtime behavior changed while compiling the data flow.

