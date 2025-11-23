# Navigation Cleanup Plan (Phase B:1)

This plan documents how navigation currently works (based on `JumboSidebar.jsx`, `JumboHeader.jsx`, `QuickAccessBar.jsx`, and AppShell), what problems exist, and how we might normalize the experience in future phases. **No code changes were made in this phase.**

## 1. Current Navigation Structure

| Zone | Location / Component | Contents |
| --- | --- | --- |
| **Sidebar** | `JumboSidebar` | Three accordion sections:<br>**TODAY** → `/today`, `/bookings`, `/tasks`, `/runs`.<br>**PETS & PEOPLE** → `/pets-people`, `/pets`, `/vaccinations`, `/owners`.<br>**BUSINESS** → `/reports`, `/payments`, `/packages`, `/staff`, `/settings`. |
| **Top header** | `JumboHeader` | Logo + tenant switch hints, search input (placeholder), quick app launcher (bookings/check-in shortcuts), notifications dropdown, messages dropdown, theme toggle, user menu. |
| **Quick Access Bar** | `QuickAccessBar` (beneath header) | Search button (Cmd+K), Quick Check-in, New Booking, “Today” schedule shortcut, Alerts button with unread count, plus global search modal. |
| **Settings sub-nav** | `SettingsLayout` | When inside `/settings`, a second left rail provides dozens of nested sections (Profile, Account, Facility, Communication, Booking, Billing, Integrations, etc.). |
| **Mobile overlay** | `JumboSidebar` (mobile mode) | Same groups as desktop sidebar shown inside slide-over. |

## 2. Problems / Pain Points

1. **Duplicate destinations across zones**
   * “New Booking” exists in QuickAccessBar, header apps dropdown, and sidebar (Bookings under TODAY). “Tasks” similarly appears in the sidebar and QuickAccessBar shortcuts (keyboard `c` opens bookings view).
   * `/schedule` vs. `/calendar` vs. QuickAccessBar “Today” button create overlapping entry points with slightly different terminology.

2. **Naming inconsistency**
   * Sidebar uses “Command Center” (Today), while router and analytics docs sometimes say “Today” or “Dashboard”.
   * “Pets & People” section points to `/pets-people` (“All Clients”), but Today page hero also references kennel-level stats; there is no single “Directory” label matching backend `entity-service`.

3. **Overloaded header dropdowns**
   * Header search fields are placeholders, yet QuickAccessBar already offers a fully functional global search. Users see two search affordances with different behavior.
   * Apps dropdown duplicates QuickAccessBar CTAs (“New Booking”, “Check-in”).

4. **Settings discoverability**
   * Sidebar only links to `/settings` at the bottom of Business section; inside settings there is a massive tree that doesn’t map back to the sidebar groupings (e.g., Facility config vs. Facility records).

5. **Legacy icons/labels**
   * Some icons (e.g., `Calendar` for “Today” button in QuickAccessBar) don’t match the actual destination (it links to `/schedule`).
   * Sidebar uses uppercase section names while header uses plain sentence case, giving mixed visual language.

## 3. Proposed Cleanup (Plan Only)

### 3.1 Normalize Naming

* Use “Dashboard” as the canonical label for the `/today` route across all nav surfaces.
* Introduce canonical group labels that echo backend domains (now enforced via `src/config/navigation.js`):
  * **Dashboard** – `/today`
  * **Directory** – `/pets-people`, `/pets`, `/owners`, `/vaccinations`
  * **Operations** – `/bookings`, `/schedule`, `/runs`, `/tasks`, `/kennels`
  * **Analytics** – `/dashboard`, `/reports`, `/payments`
  * **Settings** – `/staff`, `/settings`, `/tenants`

### 3.2 Reduce Duplicates

* Keep “New Booking” and “Quick Check-in” in **one** global location (QuickAccessBar), and remove duplicates from the header apps dropdown.
* Repurpose the header apps dropdown for secondary tools (e.g., handler flows, reports) rather than duplicating primary nav.
* QuickAccessBar now omits the old “Today” button that pointed to `/schedule`. It focuses on quick actions only.

### 3.3 Clarify Alerts vs. Messages

* QuickAccessBar already surfaces unread alerts; header notifications dropdown is empty. Decide which location owns alerting and disable the redundant one.
* Merge message shortcuts so `/messages` lives under a single top-level nav item (sidebar or header menu).

### 3.4 Settings Wayfinding Improvements

* Add contextual shortcuts in sidebar (e.g., “Facility Settings”) that deep-link into critical `/settings/...` sections to avoid burying them.
* Document the settings taxonomy in `SettingsLayout` so future route groups can be collapsed or lazy-loaded; for now, mention in route map.

### 3.5 Future Enhancements

* Convert sidebar groups into a data-driven config so QuickAccessBar + header could read from the same source of truth. (DONE → see `src/config/navigation.js`.)
* Consider replacing the placeholder header search with a call to the existing QuickAccessBar search hook to avoid duplicate UI.

> These are planning notes only. Implementation will occur in later phases after agreement on naming and IA changes.

## 4. Phase B:4 Implementation Notes

* `src/config/navigation.js` is now the single source of truth for primary nav definitions. Sidebar sections read directly from this config.
* QuickAccessBar is explicitly reserved for high-frequency actions (search, quick check-in, new booking). A comment in `QuickAccessBar.jsx` documents this rule.
* The sidebar uses the canonical “Dashboard” label for `/today`, ensuring there is exactly one main entry point into the Today view.
* TODO: If the `/today` route is renamed in the future, update `src/config/navigation.js` and any consumers as noted in that file.

