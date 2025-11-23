# UI Consistency Findings (Phase UX0)

> Scope: documentation only. No code has been changed. Observations are based on scanning the current frontend implementation and comparing it with the Today + Pets directory patterns that the BarkBase team adopted recently.

---

## 1. Spacing & Layout Scale

| Area | Observation | Files / Components |
| --- | --- | --- |
| Global cards & sections | Mixed padding values (p-5, p-7, px-10) instead of the 4/8/12/16/24/32 scale. | `frontend/src/features/pets/routes/Pets.jsx`, `frontend/src/features/owners/routes/OwnerDetail.jsx`, `frontend/src/features/settings/routes/Profile.jsx` |
| Tables & list rows | Row padding varies between `py-3`, `py-3.5`, `py-4`, and `py-5`. Needs standard row spacing (12 or 16px). | `Pets.jsx`, `OwnerDetail.jsx`, `Bookings` wizard |
| Side panels vs. center content | Some layouts use full-bleed sections while others use constrained widths, causing inconsistent gutters. | `UnifiedPetPeopleView.jsx`, `QuickAccessBar.jsx`, `FinancialDashboard.jsx` |

## 2. Non-standard Colors

| Component | Issue | Notes |
| --- | --- | --- |
| Legacy cards | Colors like `bg-gray-50`, `text-[#263238]`, `text-[#64748B]` are hard-coded. Should map to semantic tokens. | `Pets.jsx`, `OwnerDetail.jsx`, `Profile.jsx` |
| Badges & pills | Uses direct `text-warning-600`, `text-orange-500`, etc., without ensuring both light/dark equivalents exist. | `Pets.jsx`, `PetDetail.jsx`, `AlertBanner.jsx` |

## 3. Buttons & Inputs

| Pattern | Inconsistency | Examples |
| --- | --- | --- |
| Buttons inside tables | Some rows use `Button` component, others use raw `<button>` with Tailwind classes. | `Pets.jsx` vs `OwnerDetail.jsx`, `UnifiedPetPeopleView.jsx` |
| Search inputs | Multiple custom search bars, each with different padding, icons, and focus states. | `QuickAccessBar.jsx`, `Pets.jsx`, `Bookings` wizard, `Owners` views |
| Form layouts | Inputs often redefined with manual flex/grid setups; labels vary between uppercase, sentence case, and bold. | `Profile.jsx`, `AddPetToOwnerModal.jsx`, `SinglePageBookingWizard.jsx` |

## 4. Typography & Breadcrumbs

| Element | Issue | Example |
| --- | --- | --- |
| Headings | Mix of `text-xl`, `text-2xl`, `text-[var(--text-primary)]` without consistent scale or semantic heading tags. | `TodayCommandCenter.jsx`, `Pets.jsx`, `OwnerDetail.jsx` |
| Breadcrumbs | Only some pages use `PageHeader` breadcrumbs; others roll their own or omit them. | `Pets.jsx` uses `PageHeader`, but People/Owners custom screens often don’t. |

## 5. Cards, Tables, Empty States

| Pattern | Deviation | Files |
| --- | --- | --- |
| Card borders & shadows | Some cards use border + shadow, others only border; rounded radii vary (lg vs xl). | `Pets.jsx`, `TodayCommandCenter.jsx`, `FinancialDashboard.jsx` |
| Empty states | Different icons, colors, and copy per feature; no shared empty-state component. | `Pets.jsx`, `OwnerDetail.jsx`, `Vaccinations.jsx`, `QuickAccessBar.jsx` |
| Tables | Mix of `<table>` and flex/grids pretending to be tables; header styles not aligned. | `Pets.jsx` (table), `UnifiedPetPeopleView.jsx` (cards), `Bookings` wizard (custom lists) |

## 6. Re-implemented Patterns

| Pattern | Where duplicated | Notes |
| --- | --- | --- |
| Modals | At least three modal implementations: custom `<div>` overlays (Owners, Bookings), `AssociationModal`, and standard modal components. Need to converge on one (likely the existing overlay card pattern). |
| Tabs | Multiple flavors: `Tabs` component (Today page), custom button groups (Settings), nav pills (Owners). |
| Detail panels | Both `ThreePanelLayout` and custom flex layouts used; data sections differ in spacing/ordering. |

## 7. Miscellaneous

* Some legacy icons (e.g., inline emojis in empty states) don’t match the modern aesthetic.
* Batch action buttons occasionally appear as full-width bars instead of localized CTAs.
* Mobile responsiveness varies widely; several grids overflow at smaller widths.

---

### Summary

The modernized Today + Pets pages showcase the desired patterns (semantic cards, consistent spacing, dark-mode tokens). Other sections still rely on legacy Tailwind utilities and one-off layouts. The documentation above highlights the hotspots to standardize in future phases.

