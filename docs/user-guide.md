# User Guide

## Rapid Check-In Workflow
1. From the Dashboard, open **Bookings → Quick Check-In**
2. Scan or enter the pet identifier (collar tag or name)
3. Select the destination kennel; vaccination status auto-populates
4. Confirm notes and click **Complete Check-In** (sub-30 seconds goal)
5. Staff dashboards update in real time through Socket.IO

## First-Run Onboarding
- The dashboard surfaces a six-step onboarding checklist covering pets, kennels, bookings, theme, and plan review.
- Steps auto-complete as soon as the tenant creates data (e.g. first pet, first kennel).
- Owners/Admins can dismiss the checklist; the preference persists in `tenant.settings.onboarding`.
- Plan summary shows which features (billing portal, audit log, advanced reports) are included for the current tier.

## Booking Board
- Drag bookings between kennels or dates using the calendar board
- Status chips reflect lifecycle (pending → confirmed → checked-in)
- Waitlist cards can be promoted into active bookings

## Pet Management
- View detailed profiles (medical, dietary, behaviour flags)
- Upload documents or photos via the pet profile page
- Record vaccinations — reminders trigger at 90/60/30 day windows
- Medication schedule and incident log support auditable hand-offs

## Payments & Deposits (PRO plan)
- Upgrade to BarkBase PRO to track captured deposits, refunds, and payout reconciliation.
- Staff with access can record manual payments when third-party processors are offline.
- API hooks exist for Stripe/Square integration via service drivers.

## Reports & Analytics (PRO plan)
- Revenue dashboards, occupancy trends, and exports require the PRO feature flag.
- Use **Settings → Billing** to compare plans and upgrade.

## Tenant Administration
- Toggle feature flags (waitlist, medication reminders, incident reporting)
- Update color palette, fonts, terminology, and logo assets
- Manage custom domains and SSL provisioning through the admin UI

## Offline Mode
- Banner indicates offline state; forms remain usable
- API mutations queue automatically and sync on reconnection
- Manual sync can be triggered from the notifications panel (future enhancement)
