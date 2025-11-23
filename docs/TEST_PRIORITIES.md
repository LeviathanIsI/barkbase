# Test Priorities

Prioritization factors:

- **Risk:** Security / tenant isolation, financial accuracy, pet & booking correctness.
- **Execution frequency:** Pages hit on every login (Today, Pets, Bookings).
- **Fragility:** Recently refactored code, heavy store interactions, or mocked integrations.
- **Impact:** Anything touching money, bookings, pets, or user data.

| Priority | Area / Feature | Rationale |
| --- | --- | --- |
| 1 | **Authentication + Tenant Loader** | Every request depends on correct tenant headers + 401 auto-logout. A regression compromises security for all users; add tests for login redirect, token expiry, tenant slug parsing, and theme application. |
| 2 | **Protected Routing / Today Command Center** | `/today` is the first screen post-login. Need tests that authenticated users land there, unauthorized users are redirected, and Today’s arrivals/departures queries handle empty/error states. |
| 3 | **`/api/v1/pets` CRUD & normalization** | Pets Directory is core B2B workflow. The recent `pets.filter` runtime proves we need regression tests for list normalization, search/filtering, and edit/delete mutations. |
| 4 | **User Profile & Settings** | Personal data + security (name/phone/avatar/password) plus tenant defaults. Failures here leak incorrect branding and break downstream permissions. |
| 5 | **Bookings / Schedule / Kennel assignments** | High-frequency operational flows with complex state (drag-and-drop, batch check-in). Need tests for arrivals, departures, kennel occupancy, and mutation side-effects. |
| 6 | **Payments & Reports** | Direct financial impact. Validate upgrade gates, captured revenue totals, filters, and error handling when billing features are disabled. |
| 7 | **Vaccinations & Medical Alerts** | Compliance-related data shown on Today + Alerts banners. Tests should ensure expiring vaccinations and alerts render correctly and handle empty responses. |
| 8 | **Owners / Clients / Pets & People directories** | Need parity with Pets Directory patterns: query normalization, filter/search, detail drawer behavior. Prevent N+1 fetch regressions. |
| 9 | **Manual Endpoint Scripts Replacement** | `test-endpoints.js` & `test-fixed-endpoints.js` should be superseded by automated API tests (e.g., Vitest + MSW or integration tests) to avoid production-token reliance. |

Once the top tiers are covered, expand into lower-risk UI primitives (Buttons, SectionCards) only if they gain logic/conditional rendering; otherwise prefer Storybook/visual regression coverage.

