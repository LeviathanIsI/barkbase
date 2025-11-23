# Component & Pattern Duplicates

> Documentation only — no code changes made. This inventory highlights UI patterns that appear multiple times and should be unified in future refactors.

---

## 1. Modal & Overlay Patterns

| Component / File | Notes |
| --- | --- |
| `frontend/src/components/ui/Modal.jsx` | Primary modal implementation with accessibility handling. |
| Custom overlays (e.g., `AddPetToOwnerModal.jsx`, `SinglePageBookingWizard.jsx`) | Rebuild overlays manually (`div` with fixed position, custom close buttons). Should be migrated to the shared modal. |
| `ConfirmDialog`, `AssociationModal`, owner delete dialogs | Each implements its own layout/styling. These should reuse a consistent dialog + button stack. |

## 2. Tabs & Filter Toggles

| Files | Issue |
| --- | --- |
| `TodayCommandCenter.jsx` (uses Tabs component) | New standard. |
| `Pets.jsx`, `Owners` pages (custom button groups) | Should migrate to shared tabs or segmented-control component. |
| `QuickAccessBar.jsx` search toggles | Hard-coded keyboard shortcuts and toggles not aligned with the tab system. |

## 3. Search Inputs

| Variants | Where |
| --- | --- |
| Icon-inside-input with `Search` icon | `Pets.jsx`, `QuickAccessBar.jsx`, Owner lists. |
| Plain `<input>` with placeholder | `SinglePageBookingWizard.jsx`, `UnifiedPetPeopleView.jsx`. |
| Debounced search implementations | Multiple custom hooks; none share a single utility. |

## 4. Cards & Panels

| Duplicate Patterns | Details |
| --- | --- |
| `Card`, `DashboardCard`, `PanelSection`, custom `<div>` wrappers | Mixed usage; some screens import `Card` from UI, others restyle `div`s. |
| Property lists / detail sections | `PropertyList` exists, but many detail panels rebuild grids manually. |
| Alert banners / info boxes | `Alert` component vs. multiple handmade warning banners with icons. |

## 5. Tables & Lists

| Variation | Notes |
| --- | --- |
| HTML `<table>` (Pets) vs. Flex rows (Owners, Unified view) | Data tables don’t share column spacing, header styles, or sorting controls. |
| Inline action buttons | Sometimes `Button`, sometimes icon buttons, sometimes plain text links. |
| Pagination / totals | Not standardized; some lists show “Showing X of Y”, others none. |

## 6. Empty States

| Component | Issue |
| --- | --- |
| Pets empty state card (new pattern) | Clean, single CTA. |
| Owners / Profile / QuickAccessBar | Each uses different icons, copy, spacing. Need shared empty-state component with semantic tokens. |

## 7. Button Variants

| Observation | Files |
| --- | --- |
| Primary & secondary buttons are mixed with plain `<button>` elements using `bg-gray-200`. | Treat `Button` component as the single entry point. |
| Ghost / outline variants manually re-created. | E.g., owner detail action buttons. |

## 8. Legacy vs. Modern Layouts

| Area | Legacy | Modern |
| --- | --- | --- |
| People/Owners directories | Grid/board/list toggles, boomerang UI. | Today + Pets pattern (single calm view). |
| Bookings & schedule | Multiple partial dashboards, custom HUDs. | Need to converge on one table/calendar per route. |

---

### Actionable Follow-up

* **Modals** – adopt `components/ui/Modal.jsx` everywhere; remove bespoke overlays.
* **Tabs** – centralize on the Tabs component from Today page.
* **Search inputs** – provide a shared search field component with consistent icon/spacing.
* **Cards/tables** – define layout primitives (card header, table header, row) and apply across directories/operations.
* **Empty states** – build a reusable `EmptyState` component aligning with semantic tokens.

