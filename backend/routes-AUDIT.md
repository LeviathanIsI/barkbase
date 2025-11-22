# Backend Routes Audit

| Frontend Route | Backend File / Function | Status | Notes |
| --- | --- | --- | --- |
| `GET /api/v1/pets` (pets list) | `aws/lambdas/entity-service/index.js` → `listPets` | OK | Single source of truth; legacy `pets-api` disabled. |
| `POST /api/v1/pets` (create) | `entity-service` → `createPet` | OK | Uses unified tenant/auth extraction. |
| `GET /api/v1/pets/{id}` / `PUT` / `DELETE` | `entity-service` → `getPetById`, `updatePet`, `deletePet` | OK | Duplicated handlers in `pets-api` now retired. |
| `GET /api/v1/pets/{id}/vaccinations` & mutations | `entity-service` → `listPetVaccinations`, `createPetVaccination`, `updatePetVaccination`, `deletePetVaccination` | OK | Matches Vaccinations UI + Today alerts. |
| `GET /api/v1/pets/vaccinations/expiring` | `entity-service` → `listExpiringVaccinations` | OK | Used by dashboard + AlertBanner. |
| `GET /api/v1/pets/medical-alerts` | `entity-service` → `listMedicalAlerts` | OK | Supplies facility alerts. |
| `GET /api/v1/users/profile` | `aws/lambdas/user-profile-service/index.js` → `getCurrentUserProfile` | OK | Newly implemented; previously missing causing 404s. |
| `PATCH /api/v1/users/profile` | `user-profile-service` → `updateCurrentUserProfile` | OK | Allows profile editing from settings. |
| `GET /api/v1/users` / `POST /api/v1/users` | `aws/lambdas/users-api/index.js` → `listUsers`, `createUser` | OK | Router normalized to `/api/v1` path. |
| `GET /api/v1/users/{id}` / `PUT` / `DELETE` | `users-api` → `getUserById`, `updateUser`, `deleteUser` | OK | Shares shared auth + `[ROUTING DEBUG]` logging. |
| Legacy `/api/v1/pets*` Lambda | `aws/lambdas/pets-api/index.js` | Duplicate (retired) | Handler now logs + returns `410 Gone` to ensure all callers migrate to `entity-service`. |

- All routes now emit a standardized `console.log("[ROUTING DEBUG]", { route, method, tenantId, userId })` before returning.
- Entity Service is the only handler for pet CRUD; the legacy `pets-api` is documented but inert.

