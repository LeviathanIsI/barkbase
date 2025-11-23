# UX Cleanup Plan (Phase UX0)

This document outlines recommended follow-up work after the UI inconsistency audit. No code has been changed; the goal is to set a roadmap for standardization.

---

## 1. Design System Alignment

1. **Spacing scale enforcement**
   * Adopt the 4/8/12/16/24/32 spacing scale globally.
   * Add linting/docs to discourage arbitrary `.p-7`, `.px-10`, etc.

2. **Semantic tokens only**
   * Replace hard-coded colors (`#263238`, `text-orange-500`) with the dark/light tokens defined in Tailwind config.

3. **Typography scales**
   * Define H1–H6 + body styles and map them to Tailwind classes (`text-2xl font-semibold`, etc.).
   * Update `PageHeader`, cards, detail panels to reference those tokens.

4. **Buttons & inputs**
   * Enforce usage of `Button` component and a single input component.
   * Provide variants (primary / secondary / outline / ghost) via props instead of ad-hoc classes.

## 2. Component Consolidation

1. **Modals/dialogs**
   * Migrate all custom overlays (`AddPetToOwnerModal`, booking wizard drawers, Confirm dialogs) to `components/ui/Modal`.
   * Provide subcomponents for header, body, footer.

2. **Tabs / filter toggles**
   * Standardize on the `Tabs` component used in Today page.
   * Replace button groups used as tabs in Settings, Owners, etc.

3. **Cards & panels**
   * Offer a single card primitive (title, description, optional actions) to replace `DashboardCard`, raw `div`s, etc.
   * Ensure `PanelSection` uses consistent spacing and typography.

4. **Empty states**
   * Create an `EmptyState` component (icon slot, title, description, CTA) with semantic colors.
   * Replace ad-hoc empty states across Pets, Owners, QuickAccessBar, etc.

5. **Tables & lists**
   * Publish a table pattern (header, row, action column) used by Pets, Owners, Bookings, Vaccinations.
   * Provide fallback states (“No records”, skeleton loaders).

## 3. Screen-Specific Normalization

| Screen / Feature | Needed Cleanup |
| --- | --- |
| **People directories (Clients/Owners/Pets & People)** | Adopt single-view layout from Pets (filters left, table center, optional detail). Remove board/grid toggles. |
| **Bookings & schedule** | Define the primary job for each page (e.g., “manage bookings for a day”) and remove extra widgets. Ensure tables/calendars share styling. |
| **Vaccinations** | Use the same table pattern with status badges + expiring info. |
| **Reports & payments** | Stick to simple B2B tables, aligned with cost/usage data. Remove marketing-style hero elements. |
| **Settings/Profile** | Reuse `useUserProfileQuery`, consistent card spacing, standardized form inputs. |

## 4. Logging & Debug Consistency

* Keep `[FRONTEND API DEBUG]` logs for every API call (already implemented in `apiClient`).
* Ensure new hooks use those logs; avoid `console.log` variants.

## 5. Process Recommendations

1. **Phase-by-phase implementation**
   * Route audit → People directories → Bookings/schedule → Vaccinations/reports → Settings.
   * Each phase should have its own PR to keep diffs reviewable.

2. **Documentation & linting**
   * Update `AGENTS.md` with the new component standards.
   * Add ESLint/Stylelint rules (or a custom script) to flag unsupported spacing/color classes.

3. **Design sign-off**
   * Once components are unified, get buy-in from the design team to avoid regressions.

---

### Deliverables for Future Phases

1. **Component library updates**
   * Finalize card/tabs/modal primitives and publish usage examples.

2. **Directory refactors**
   * Migrate Clients/Owners/Unified views to the Pets layout, including normalized query keys and empty states.

3. **Operational screens**
   * Simplify Bookings, Schedule, Runs to focus on the primary task (table or calendar).

4. **Compliance checks**
   * After refactors, re-run the UI inconsistency audit to verify spacing, colors, typography, and logging.

