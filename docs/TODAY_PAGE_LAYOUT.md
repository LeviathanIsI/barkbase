# Today / Command Center Layout Map

Source: `frontend/src/features/today/TodayCommandCenter.jsx`

The Today screen is a single component that renders its entire layout inline. There are no child route files; the component orchestrates data fetching, summary cards, arrival/departure lists, and two modals.

## 1. Page-Level Structure

```
AppShell (global header/sidebar)
└── TodayCommandCenter
    ├── Hero Section (Card)
    │   ├── Title + Date
    │   └── Primary CTA (New Booking button)
    ├── Key Stats Grid (inside hero Card)
    │   ├── Arriving
    │   ├── Departing
    │   ├── In Facility
    │   └── Attention Items (conditional)
    ├── Main Grid (2 columns on lg)
    │   ├── Arrivals Card
    │   │   ├── Header + Batch Check-in button
    │   │   └── <ArrivalDepartureList type="arrival" />
    │   └── Departures Card
    │       ├── Header + Batch Check-out button
    │       └── <ArrivalDepartureList type="departure" />
    ├── Batch Check-in Modal (wraps `<BatchCheckIn />`)
    └── Batch Check-out Modal (inline BatchCheckOut component)
```

### Sections & Components

| Section | Components | Purpose | Notes |
| --- | --- | --- | --- |
| Hero Section | `<Card>`, `<Button>`, `<PageHeader>` (indirect), lucide icons | Title, formatted date, “New Booking” CTA | Title text uses `kennelName` derived from user profile. |
| Key Stats | Inline grid of four cards | Displays `arrivals`, `departures`, `inFacility`, `attentionItems` counts | Pulls from memoized `stats` object derived from queries (see data flow doc). |
| Arrivals Pane | `<Card>`, `<ArrivalDepartureList>` | List of pets arriving today | CTA triggers BatchCheckIn modal. |
| Departures Pane | `<Card>`, `<ArrivalDepartureList>` | List of pets departing today | CTA triggers BatchCheckOut inline modal component. |
| BatchCheckIn modal | `<Modal>` + `<BatchCheckIn />` (import from bookings feature) | Reuses bookings component to process check-ins | right rail overlay, large width. |
| BatchCheckOut modal | `<Modal>` + `BatchCheckOut` inline | Allows multi-select of departures to POST `/check-out` | Contains its own state + toast messaging. |

### ArrivalDepartureList anatomy

* Reusable inline component defined inside TodayCommandCenter.
* Props: `items`, `type ('arrival' | 'departure')`.
* Renders icon, status badge, pet avatar, owner name, optional service, vaccination warning.
* Relies on `PetAvatar`, `Badge`, `AlertCircle`.

## 2. Layout Observations / Smells

* **Single-file monolith:** Fetch logic, layout, and modals all live in one file. There are no sub-components except `ArrivalDepartureList` and `BatchCheckOut`.
* **Inline modal content:** BatchCheckOut is defined inline, with its own React state, API calls, toast handling, and reload hook.
* **No suspense/loading skeleton reuse:** The loading state duplicates skeleton markup instead of using shared skeleton components.
* **CTA duplication:** “New Booking” button in hero plus QuickAccessBar likely link to the same action.
* **Potential future targets:** Arrivals/Departures sections will likely need to become modular cards that can be rearranged in a dashboard grid (callout for Phase B:2).

> This document purposely captures the current layout for reference. No runtime behavior was changed while drafting this map. Comments were added separately (see code annotations in TodayCommandCenter) to mark areas slated for later refactors.

