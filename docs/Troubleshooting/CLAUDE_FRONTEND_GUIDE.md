# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

BarkBase is a multi-tenant kennel management SaaS application with a React 19 frontend and AWS serverless backend. The system supports offline-first PWA capabilities, real-time updates, drag-and-drop booking management, and white-label theming.

## Tech Stack

**Frontend (This Directory)**:
- Vite + React 19 with React Router v7
- Tailwind CSS with runtime CSS variable theming
- Zustand for client state (auth, tenant, bookings, UI)
- TanStack Query for server state management
- PWA via `vite-plugin-pwa` with service worker
- IndexedDB for offline storage (`idb`)
- Vitest + React Testing Library
- Form handling: `react-hook-form` + `zod`
- UI Libraries: `@dnd-kit/core`, `recharts`, `reactflow`, `lucide-react`

**Backend (../aws/)**:
- AWS Lambda functions (Node.js)
- PostgreSQL on RDS
- AWS Cognito for authentication
- API Gateway with REST endpoints
- S3 for file storage with pre-signed URLs
- AWS CDK for infrastructure as code

## Common Development Commands

### Frontend Development
```bash
npm install              # Install dependencies
npm run dev              # Start dev server (localhost:5173)
npm run build            # Production build with PWA manifest
npm run preview          # Preview production build (localhost:4173)
npm run lint             # Run ESLint
npm run test             # Run Vitest test suite
npm run test -- --watch  # Run tests in watch mode
```

### Running Specific Tests
```bash
# Run a single test file
npm run test src/features/bookings/components/__tests__/BookingCalendar.test.jsx

# Run tests matching a pattern
npm run test -- --grep "OnboardingChecklist"
```

### Backend Deployment (../aws/cdk)
```bash
cd ../aws/cdk
npm install
export $(cat .env | xargs)  # Load environment variables
cdk bootstrap                # First time only
cdk deploy                   # Deploy infrastructure
cdk destroy                  # Tear down infrastructure
```

## Architecture

### Directory Structure
```
src/
  app/               # Core router, ProtectedRoute, providers
  components/        # Shared UI components
    layout/          # AppShell, Header, Sidebar, navigation
    ui/              # Primitive components (Button, Card, Modal, etc.)
  features/          # Feature-centric modules (see below)
  hooks/             # Cross-feature hooks (useOfflineDetection, etc.)
  lib/               # Utilities and API clients
    apiClient.js     # REST API wrapper with auth & tenant headers
    aws-client.js    # AWS Cognito integration
    theme.js         # White-label theme engine
    offlineQueue.js  # Offline queue (currently disabled)
  stores/            # Zustand state management
    auth.js          # Authentication state, tokens, user session
    booking.js       # Booking optimistic updates
    tenant.js        # Tenant settings, plan features, theme
    ui.js            # UI state (sidebar, modals, offline indicator)
  styles/            # Professional B2B design system
    design-tokens.css # CSS custom properties (SINGLE SOURCE OF TRUTH)
  test/              # Test setup and utilities
```

### Feature Modules
Features follow a consistent structure under `src/features/`:
```
features/
  bookings/
    components/      # Feature-specific components
    routes/          # Route components (pages)
    hooks/           # Feature-specific hooks
    __tests__/       # Tests for this feature
  [other features...]
```

Major features include:
- `auth/` - Login, signup, Cognito integration
- `dashboard/` - Dashboard with onboarding checklist
- `bookings/` - Booking management with optimistic updates
- `calendar/` - Drag-and-drop booking calendar
- `pets/`, `owners/`, `customers/` - Record management
- `kennels/`, `facilities/`, `services/`, `packages/` - Configuration
- `payments/`, `invoices/` - Financial operations
- `staff/`, `tasks/`, `operations/` - Staff workflow
- `handlerFlows/` - Visual workflow builder (ReactFlow)
- `settings/` - Comprehensive settings with nested routes
- `tenants/` - Tenant configuration and theming
- `admin/` - Admin dashboard

### State Management

**Zustand Stores**:
- `auth.js`: User authentication, JWT tokens, role/permissions, tenant membership
- `tenant.js`: Current tenant settings, plan features, theme configuration
- `booking.js`: Booking state with optimistic mutations
- `ui.js`: UI state (sidebar open/closed, offline indicator)

All stores are persisted to localStorage except for sensitive tokens (unless "remember me" is enabled).

### API Client Pattern

The `apiClient.js` provides REST methods that automatically inject:
- `Authorization: Bearer <token>` header from auth store
- `X-Tenant-Id: <tenantId>` header from tenant store
- Proper Content-Type headers

```javascript
import apiClient from '@/lib/apiClient';

// GET with query params
const { data } = await apiClient.get('/api/v1/bookings', { params: { status: 'active' } });

// POST with body
const { data } = await apiClient.post('/api/v1/bookings', { petId, dates });

// PUT/DELETE
await apiClient.put('/api/v1/bookings/123', { status: 'confirmed' });
await apiClient.delete('/api/v1/bookings/123');
```

### Authentication Flow

1. User signs in via Cognito (hosted UI or direct)
2. `useAuth` hook stores tokens in `auth` store
3. `apiClient` automatically injects `Authorization` header
4. Tokens are refreshed automatically before expiry
5. Multi-tenant: User can belong to multiple tenants (memberships)

Auth store methods:
- `setAuth()` - Set user, tokens, role, tenantId
- `updateTokens()` - Refresh tokens
- `clearAuth()` / `logout()` - Clear session
- `isAuthenticated()` - Check if user is logged in
- `hasRole(role)` - Check user role

### Multi-Tenancy

Every API request requires `X-Tenant-Id` header for data isolation. The tenant store:
- Loads tenant settings on app init
- Applies runtime theme via CSS variables
- Manages plan-based feature flags (FREE, PRO, ENTERPRISE)
- See `src/features.ts` for feature flag definitions

### Theme System

White-label theming uses CSS custom properties:
- Tenant themes are fetched from `/api/v1/tenants/theme`
- `applyTheme()` injects color/font overrides into `:root`
- Theme variables are defined in `src/styles/design-tokens.css`
- Tenants can customize colors, fonts, logo, and terminology

```javascript
import { applyTheme } from '@/lib/theme';

applyTheme({
  colors: { primary: '59 130 246', accent: '249 115 22' },
  fonts: { sans: 'Inter, sans-serif' },
  assets: { logo: 'https://...' }
});
```

### PWA and Offline Support

- Service worker auto-updates via `virtual:pwa-register`
- Offline queue is currently disabled (see `src/lib/offlineQueue.js`)
- `useOfflineDetection` hook monitors `navigator.onLine`
- UI shows banner when offline
- Future: Implement IndexedDB queuing for offline mutations

### Route-Level Code Splitting

All feature routes use `React.lazy()` for code splitting (see `src/app/router.jsx`). This reduces initial bundle size and improves load time.

### Plan-Based Feature Gating

Features are gated by subscription plan (FREE, PRO, ENTERPRISE):
```javascript
import { isFeatureEnabled } from '@/features';

if (isFeatureEnabled('advancedReports', { plan: tenant.plan })) {
  // Show advanced reports
}
```

See `src/features.ts` for all feature flags and plan limits.

## Testing Strategy

- Vitest configured with jsdom environment
- React Testing Library for component tests
- Test files located in `__tests__/` directories
- Example tests:
  - `src/components/ui/__tests__/`
  - `src/features/dashboard/components/__tests__/OnboardingChecklist.test.jsx`
  - `src/features/bookings/components/__tests__/BookingCalendar.test.jsx`

## Backend Integration

### AWS Lambda Services
The backend consists of 50+ Lambda functions (see `../aws/lambdas/`):
- `auth-api`: Login, signup, token refresh
- `tenants-api`: Tenant settings, themes, onboarding
- `bookings-api`: Booking CRUD, check-in/out
- `pets-api`, `owners-api`, `customers-api`: Record management
- `payments-api`, `invoices-api`: Financial operations
- `properties-api-v2`: Dynamic property/field management
- `websocket-*`: Real-time WebSocket handlers
- And many more...

### API Endpoints
All endpoints are prefixed with `/api/v1/` and require:
- `Authorization: Bearer <token>` header
- `X-Tenant-Id: <tenantId>` header

Local proxy configured in `vite.config.js` forwards `/api` to `http://localhost:4000`.

### Database
- PostgreSQL on AWS RDS
- Multi-tenant isolation via `tenantId` column on all tables
- Raw SQL queries (no ORM) for performance
- Schema migrations in `../aws/scripts/`

## Environment Variables

Create `.env` file in frontend directory:
```
VITE_API_URL=http://localhost:4000
VITE_PORT=5173
VITE_PREVIEW_PORT=4173
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=<cognito-pool-id>
VITE_CLIENT_ID=<cognito-client-id>
VITE_COGNITO_DOMAIN=<cognito-hosted-ui-domain>
VITE_REDIRECT_URI=http://localhost:5173
VITE_LOGOUT_URI=http://localhost:5173
```

## UI Component Library

Shared UI components in `src/components/ui/`:
- `Button`, `Card`, `Modal`, `Dialog`, `AlertDialog`
- `Input`, `Select`, `Checkbox`, `Switch`, `Textarea`
- `DataTable` - Advanced table with sorting, filtering, pagination
- `SlideOutDrawer`, `SlidePanel` - Side panels
- `Badge`, `Avatar`, `Skeleton`, `Alert`
- `DropdownMenu`, `Tabs`, `Calendar`
- All components use Tailwind with `class-variance-authority` for variants

## Key Patterns

### Route Protection
```javascript
// Protected routes require authentication
<Route element={<ProtectedRoute />}>
  <Route path="/dashboard" element={<Dashboard />} />
</Route>
```

### Route Persistence
`RoutePersistence` component saves last path to localStorage for resuming after login.

### Optimistic Updates
Bookings use TanStack Query optimistic updates for instant UI feedback:
```javascript
const { mutate } = useMutation({
  mutationFn: createBooking,
  onMutate: async (newBooking) => {
    // Optimistically update UI
  },
  onError: (err, variables, context) => {
    // Rollback on error
  }
});
```

### Form Validation
Forms use `react-hook-form` + `zod` schemas:
```javascript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({ name: z.string().min(1) });
const { register, handleSubmit } = useForm({ resolver: zodResolver(schema) });
```

### File Uploads
File uploads use S3 pre-signed URLs:
1. Call `storage.getUploadUrl(filename, contentType)`
2. Upload directly to S3 via pre-signed URL
3. Store S3 URL in database

## Workflow Builder

`handlerFlows` feature uses ReactFlow for visual workflow builder:
- Full-screen canvas at `/handler-flows/builder`
- Drag-and-drop nodes for triggers, actions, conditions
- Workflows are stored in database and executed by backend

## Known Issues and TODOs

- Offline queue is disabled (see `src/lib/offlineQueue.js`) - needs redesign for serverless architecture
- `uploadClient` in `apiClient.js` is a mock - implement proper S3 upload flow
- Auth store has TODO for using AWS Amplify to fetch user attributes instead of decoding JWT
- Some components have `.backup` files - these should be cleaned up

## Code Style

- Prefer functional components with hooks
- Use absolute imports via `@/` alias (configured in `vite.config.js`)
- Tailwind for styling (avoid inline styles)
- Use `clsx` and `tailwind-merge` for conditional classes
- Keep components small and focused
- Co-locate tests with features
- Use TypeScript for config files (e.g., `features.ts`)

## Production Considerations

- PWA manifest configured for offline use
- Service worker caches shell assets and API responses
- Route-level code splitting reduces bundle size
- Build output includes PWA assets and manifest
- Nginx config needed for SPA fallback in production
- Environment variables must be prefixed with `VITE_` to be included in build
