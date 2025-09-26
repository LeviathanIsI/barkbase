# Component Library Notes

## Core Primitives
- `Button` – variants: primary, secondary, ghost, destructive
- `Card` – header, content, footer slots with surface elevation
- `Badge` – semantic variants (info, success, warning, danger)
- `Modal` – portal-based modal with close button
- `Skeleton` – animating placeholder used for suspense fallbacks

## Layout
- `AppShell` – orchestrates sidebar, header, content region, mobile overlay
- `Sidebar` – navigation list responsive to tenant terminology
- `Header` – brand, connectivity indicator, user context
- `DashboardLayout` – section wrapper with title/actions slots

## Feature Highlights
- `BookingCalendar` – DnD board integrating DayPicker + DnD Kit
- `QuickCheckIn` – reactive form targeting sub-30s check-in flow
- `WaitlistManager` – waitlist promotion with optimistic booking inserts
- `PetProfile` – rich profile card with behaviour & dietary flags
- `VaccinationTimeline`, `MedicationSchedule`, `IncidentLog`

## Storybook Roadmap
- Install `@storybook/react` and configure to use Tailwind tokens
- Provide stories for UI primitives and layout shells to enable visual regression testing
- Integrate tenant theme switching controls via Storybook decorators
