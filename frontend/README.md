# Frontend (Vite + React)

## Features
- Vite + React 19 with route-level code splitting (React Router v6)
- Tailwind CSS with runtime CSS-variable theming for white-label tenants
- Zustand stores for auth, tenant, bookings, and UI state
- TanStack Query for server state with optimistic booking mutations
- PWA (service worker via `vite-plugin-pwa`) with offline queueing powered by IndexedDB (`idb`)
- Drag & drop booking calendar using `@dnd-kit/core`
- Date utilities via `date-fns`, dashboards with `recharts`, forms with `react-hook-form`
- First-run onboarding checklist with plan-aware feature gating across navigation and routes

## Getting Started

```bash
npm install
npm run dev
```

The app defaults to `http://localhost:5173` and expects the backend at `http://localhost:4000`.

### Environment Variables

Copy `.env.example` to `.env` and adjust:

```
VITE_API_URL=http://localhost:4000
VITE_PORT=5173
VITE_PREVIEW_PORT=4173
```

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build and PWA manifest generation |
| `npm run preview` | Preview build locally |
| `npm run test` | Run Vitest + React Testing Library suite |

## Offline Architecture

- `useOfflineDetection` hook toggles UI state and flushes queued API calls
- `apiClient` enqueues mutating requests to IndexedDB when offline
- Service worker caches shell assets and API responses via Workbox runtime caching

## State Organization

```
src/
  app/            // core router + providers
  components/     // UI primitives and layout shells
  features/       // feature-centric components, routes, hooks
  lib/            // API client, theme utilities, offline queue
  stores/         // Zustand slices (auth, bookings, tenant, ui)
  hooks/          // cross-feature hooks like offline detection
  styles/         // Tailwind variable definitions
```

## Theming & White-Labeling

- CSS variables defined in `src/styles/design-tokens.css` (SINGLE SOURCE OF TRUTH)
- `tenant` store calls `applyTheme` to inject runtime colors and fonts
- Tenants API (`/api/v1/tenants/theme`) updates theme JSON persisted in the backend

## Testing

Vitest is configured with jsdom and RTL in `src/test/setupTests.js`. Example specs are recorded under `src/components/ui/__tests__` and feature-level suites such as `src/features/dashboard/components/__tests__/OnboardingChecklist.test.jsx`.

Run with `npm run test -- --watch` for interactive mode.

## PWA Notes

- Auto-updating service worker via `virtual:pwa-register`
- Manifest describes icons and color scheme; Nginx build handles SPA fallback
- Offline indicator banner surfaces when `navigator.onLine` is false

## Next Steps

- Add Storybook stories for design system components (`Button`, `Card`, etc.)
- Extend drag-drop calendar with socket-driven live updates
- Hook booking and pet forms to backend endpoints once APIs are populated with data
