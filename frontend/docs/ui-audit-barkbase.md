# BarkBase UI/UX Audit – Phase 0

**Date:** 2025-11-22  
**Objective:** capture the current visual debt before applying the professional B2B SaaS aesthetic.

---

## Section 1: Overview

### Stack snapshot
- React 19 + Vite 7 with Tailwind 3.4, React Query, CVA-based primitives, and vitest (`package.json`).  
- Semantic design tokens defined in `src/styles/design-tokens.css` and surfaced through Tailwind (`tailwind.config.js`).  
- Global utilities (`src/index.css`) already implement the three-weight typography system, shared cards/buttons/tables, and scrollbar styling.  
- Layout shell sits in `components/layout/AppShell.jsx`, orchestrating `JumboSidebar`, `JumboHeader`, tenant state, and the routed outlet.

### Screens reviewed
- **Structural:** `AppShell.jsx`, `JumboHeader.jsx`, `JumboSidebar.jsx`.  
- **Operational:** `features/today/TodayCommandCenter.jsx`.  
- **Bookings workflows:** `features/bookings/routes/Bookings.jsx`, `BookingsOverview.jsx`.  
- **Data list/detail:** `features/pets/routes/Pets.jsx`.  
- **Settings hub:** `features/settings/components/SettingsLayout.jsx`.  
- **Mobile workflow:** `features/mobile/MobileCheckIn.jsx`.

---

## Section 2: Findings by category

### Colors & dark mode drift
- Several surfaces still pin to `#0F0F1A`, flattening elevation and deviating from the lighter pro dark palette.
```110:140:frontend/src/features/settings/components/SettingsLayout.jsx
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0F0F1A]">
      <PageHeader … />
      <div className="bg-white dark:bg-surface-primary border-b border-gray-300 dark:border-surface-border mb-6">
        …
```
```208:230:frontend/src/features/mobile/MobileCheckIn.jsx
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-[#0F0F1A]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (arrivals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-[#0F0F1A] p-6 text-center">
        …
```
- Data views still hard-code light-mode hex colors (`#263238`, `#F5F6FA`) so the content fails dark-mode contrast.
```153:245:frontend/src/features/pets/routes/Pets.jsx
          <div className="flex items-center gap-3 mb-4 pr-8">
            …
            <h3 className="font-semibold text-[#263238] dark:text-text-primary truncate">{pet.name}</h3>
            …
        <tr className="border-b border-[#F5F6FA] hover:bg-[#F5F6FA]/50 cursor-pointer transition-colors">
          …
          <p className="text-[#263238] dark:text-text-primary">{primaryOwner?.name || primaryOwner?.email || '--'}</p>
```
- Quick actions inside `JumboHeader` use saturated bespoke fills instead of the desaturated brand/status palette we already defined.
```127:235:frontend/src/components/layout/JumboHeader.jsx
                  <Link …>
                    <div className="w-8 h-8 bg-[#4B5DD3] rounded-lg flex items-center justify-center">
                      <Grid3x3 className="h-4 w-4 text-white" />
                    </div>
                    …
                  </Link>
                  <Link …>
                    <div className="w-8 h-8 bg-[#FF9800] rounded-lg flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
```

### Borders, chips, and segmented controls
- Multiple headers still rely on pill toggles rather than the underline tabs component (`components/ui/Tabs`).
```23:67:frontend/src/features/bookings/routes/Bookings.jsx
        {!showNewBooking && (
          <div className="flex items-center bg-gray-100 dark:bg-surface-secondary rounded-lg p-1">
            <button className={`px-3 py-1.5 rounded text-sm font-medium …`}>Run Board</button>
            <button className={`px-3 py-1.5 rounded text-sm font-medium …`}>List View</button>
          </div>
        )}
```
- Today view, BookingsOverview, and Settings tabs recreate similar segmented controls, so adopting underline tabs will declutter those headers immediately.

### Headers, elevation, and empty states
- Most feature pages still render ad-hoc `<h1>` + `<p>` stacks and bespoke action rows instead of the shared `PageHeader`, leading to mismatched spacing and button placement.
- Empty states on mobile and in Pets stretch to full height with large typography rather than the compact `components/ui/EmptyState.jsx` pattern, so the experience still feels consumer-grade.

### Status colors & badges
- Badges, quick metrics, and dashboards reference raw Tailwind greens/oranges.
```60:125:frontend/src/features/staff/components/TeamDashboard.jsx
          <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">{stats.totalStaff}</p>
          <p className="text-xs text-green-600">+2 this month</p>
        </Card>
        …
            <div className="w-10 h-10 bg-green-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
```
- TodayCommandCenter mixes `Badge` variants with `text-blue-600`, `text-warning-600`, etc., so status semantics change from card to card.

### Typography and spacing
- Despite the three-weight system, key headers (`Bookings`, `MobileCheckIn`, staff dashboards) still use `font-bold`, so titles feel heavier than HubSpot/Linear references.
- Grids mix `gap-3`, `gap-4`, and `gap-6`, and card padding ranges from `p-4` to `p-6`, which breaks the 8-pt rhythm defined in the tokens.

---

## Section 3: File-level references

| Theme | Primary files/components |
| --- | --- |
| Dark-mode surfaces & colors | `components/layout/AppShell.jsx`, `components/layout/JumboHeader.jsx`, `features/settings/components/SettingsLayout.jsx`, `features/mobile/MobileCheckIn.jsx`, `features/pets/routes/Pets.jsx`, `styles/theme-config.js` |
| Tabs / segmented controls | `components/ui/Tabs.jsx`, `features/bookings/routes/Bookings.jsx`, `features/bookings/routes/BookingsOverview.jsx`, `features/today/TodayCommandCenter.jsx`, `features/settings/components/SettingsLayout.jsx` |
| Status chips & badges | `components/ui/Badge.jsx`, `features/staff/components/TeamDashboard.jsx`, `features/today/TodayCommandCenter.jsx`, `components/QuickAccessBar.jsx`, `features/bookings/components/BatchCheckIn.jsx` |
| Typography & spacing | `features/bookings/routes/Bookings.jsx`, `features/mobile/MobileCheckIn.jsx`, `features/staff/components/TeamDashboard.jsx`, `features/settings/routes/components/SubscriptionTab.jsx`, `features/pets/routes/Pets.jsx` |
| Empty states & elevation | `components/ui/EmptyState.jsx` (reference), `features/pets/routes/Pets.jsx`, `features/mobile/MobileCheckIn.jsx`, `components/shared/PlaceholderPage.jsx`, `features/today/TodayCommandCenter.jsx` |

These files hit the most-used workflows, so refactoring them first maximizes the perceived uplift.

---

## Section 4: Adjusted plan

1. **Phase 1 – Dark-mode surface reset**: purge every lingering `#0F0F1A`, `#263238`, `#F5F6FA` usage in AppShell, Settings, Mobile, Pets, and the theme config so the new palette actually ships.
2. **Phase 2 – Underline tabs everywhere**: finish hardening `components/ui/Tabs` (already underline-based) and replace the pill toggles in Bookings, Today, Settings, and any saved-view switchers.
3. **Phase 3 – Semantic badges & accents**: refactor `Badge.jsx`, Quick Access tiles, Today metrics, and dashboards to use the `success/warning/error/info` tokens instead of raw Tailwind greens/oranges/hex fills.
4. **Phase 4 – Border radius + chip normalization**: cap cards/modals at `rounded-lg` (8px) and controls at `rounded-md` (6px), introduce a shared “chip” helper for filters, and remove stray `rounded-full` badges.
5. **Phase 5 – Header & layout consistency**: adopt `PageHeader` across Bookings, Today, Pets, and Settings; document padding/border defaults so actions line up predictably.
6. **Phase 6 – Empty states & density**: swap bespoke empty screens for `EmptyState`, enforce `p-6`/`gap-6` defaults (or `p-4` compact), and remove oversized hero illustrations.
7. **Phase 7 – Typography sweep**: replace `font-bold` with `font-semibold`, align heading sizes to the documented scale, and ensure supporting text uses `text-secondary` tokens.
8. **Phase 8 – Workflow polish**: once primitives align, revisit Today’s high-density mode, Bookings modals, and Mobile check-in to confirm they inherit the updated system without overrides.
9. **Phase 9 – Final verification**: lint/typecheck/build, sanity-check Today, Bookings, Pets, Settings, and Mobile in dark/light themes, and capture before/after screenshots for stakeholders.

Compared to the previous assistant’s sequence, this reorders the earliest phases around the most visible regressions (lingering `#0F0F1A`, pill toggles, saturated badges) and adds explicit typography/spacing and empty-state sweeps that were previously missing.
