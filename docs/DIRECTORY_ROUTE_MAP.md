# Directory Route Map

This document inventories the current Pets & Owners directory routes as defined in `frontend/src/app/router.jsx` and implemented inside `frontend/src/features/`.

## Top-Level Routes

| Path | Component | Layout | Purpose |
| --- | --- | --- | --- |
| `/pets` | `frontend/src/features/pets/routes/Pets.jsx` | `ProtectedRoute` → `RoutePersistence` → `AppShell` | Main pets list/search page. |
| `/pets/:petId` | `frontend/src/features/pets/routes/PetDetail.jsx` | Same as above | Detail view for a single pet, with tabs/sections for profile, notes, bookings, etc. |
| `/owners` | `frontend/src/features/owners/routes/Owners.jsx` | Same as above | Owners directory with search, filters, and actions. |
| `/owners/:ownerId` | `frontend/src/features/owners/routes/OwnerDetail.jsx` | Same as above | Owner detail view showing profile info plus associated pets/notes/bookings. |
| `/pets-people` | `frontend/src/features/pets-people/UnifiedPetPeopleView.jsx` | Same as above | Unified “Clients” view combining pets + owners into a single directory. |
| `/customers/:ownerId` | `frontend/src/features/customers/routes/CustomerDetail.jsx` | Same as above | CRM-style owner detail screen used in newer flows (“CustomerDetail”). |
| `/segments` | `frontend/src/features/segments/components/SegmentList.jsx` | Same as above | Audience/segment list (adjacent to directory domain). |
| `/staff` | `frontend/src/features/staff/routes/Staff.jsx` | Same as above | Staff/team directory (not core to pets/owners but part of the “Directory” nav grouping). |

### Settings Redirects (Legacy)

Router also contains legacy redirects:

* `/objects/pets` → `/settings/objects/pets`
* `/objects/owners` → `/settings/objects/owners`

These send users into the settings “Object Setup” screens rather than live directory screens. They are retained for backwards compatibility.

## Components & File Locations

| Feature | List Route Component | Detail Route Component | Supporting Files |
| --- | --- | --- | --- |
| Pets | `frontend/src/features/pets/routes/Pets.jsx` | `frontend/src/features/pets/routes/PetDetail.jsx` | `frontend/src/features/pets/components/*`, `frontend/src/features/pets/api.js` |
| Owners | `frontend/src/features/owners/routes/Owners.jsx` | `frontend/src/features/owners/routes/OwnerDetail.jsx` | `frontend/src/features/owners/components/*`, `frontend/src/features/owners/api.js` |
| Pets + People | `frontend/src/features/pets-people/UnifiedPetPeopleView.jsx` | n/a (single page) | Shared UI for combined directory experience. |
| Customers (CRM) | `frontend/src/features/customers/routes/CustomerDetail.jsx` | n/a | CRM-specific owner detail screen. |
| Segments | `frontend/src/features/segments/components/SegmentList.jsx` | n/a | Segment builder / list. |
| Staff | `frontend/src/features/staff/routes/Staff.jsx` | n/a | Staff roster UI. |

## Notes

* All directory routes render inside the global `AppShell`, which injects `JumboSidebar`, `JumboHeader`, `QuickAccessBar`, etc.
* `/pets` and `/owners` share similar high-level structure (search header + table/list), but their implementations live in separate feature folders with limited shared abstraction.
* Unified pet/people view (`/pets-people`) is a distinct screen that merges pets + owners but reimplements data fetching & layout separately from the dedicated lists.
* Customer detail route (`/customers/:ownerId`) is a newer CRM-style detail view that overlaps significantly with `/owners/:ownerId`.

