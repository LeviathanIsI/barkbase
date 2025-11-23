# Directory Cleanup Plan (Phases C1:2 – C1:5)

This roadmap outlines the upcoming work for the Pets & Owners directory cluster. Each phase builds on the architecture audit (C1:1) and will be executed without breaking existing behavior.

## Phase C1:2 — Structural Refactor

* Extract shared layout components for Pets/Owners lists (headers, filter bars, tables).
* Normalize detail page scaffolding (hero, tabs, side panels) so Pets and Owners feel consistent.
* Ensure UnifiedPetPeople view reuses the shared layout primitives instead of bespoke markup.

## Phase C1:3 — UX Polishing & States

* Implement consistent loading/empty/error states across all directory tables and detail tabs.
* Align action button placement (New Pet / Add Owner) and spacing conventions.
* Introduce shared filter/search UX with accessible focus states and debounced inputs.

## Phase C1:4 — React Query Consolidation

* Introduce shared hooks (e.g., `usePetsDirectoryQuery`, `useOwnersDirectoryQuery`) to remove duplicate fetch logic.
* Explore “directory snapshot” pattern (similar to Today snapshot) for list + detail prefetching.
* Replace any lingering `window.location.reload()` calls with targeted query invalidation.

## Phase C1:5 — Action UX Cleanup

* Streamline “create” flows (New Pet, New Owner) to ensure consistent modals/wizards.
* Improve contextual actions on detail pages (e.g., quick actions for associated pets, bookings).
* Audit cross-links (Owner → Pet, Pet → Owner) to ensure same routing patterns and breadcrumbs.

## Additional Considerations

* Customer detail vs Owner detail duplication: evaluate whether both views can share a single data layer.
* Unified directory search should reuse the same hooks as the dedicated lists to avoid duplicate API calls.
* Segment builder (`/segments`) may become part of a broader “Directory Analytics” phase once core screens are unified.

> This plan is documentation only; no runtime behavior was changed in Phase C1:1.

