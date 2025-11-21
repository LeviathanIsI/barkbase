# Layout & Theme System - Barkbase

**Last Updated**: 2025-01-20
**Purpose**: Complete reference for layout architecture and theme implementation

---

## Architecture Overview

Barkbase uses a **dual-theme system** (dark/light) with professional B2B design inspired by Linear and Calendly.

- **Default Theme**: Dark mode
- **Storage**: localStorage (`barkbase-theme`)
- **Mechanism**: `.dark` class on `<html>` + Tailwind dark: variants + CSS variables
- **Font**: Inter (Google Fonts)

---

## Core Theme Files

### 1. ThemeContext (`frontend/src/contexts/ThemeContext.jsx`)
React Context managing theme state:
- Provides: `useTheme()` → `{ theme, toggleTheme, setTheme, isDark, isLight }`
- Persists to localStorage
- Applies `.dark`/.light` class to document root

### 2. Design Tokens (`frontend/src/styles/design-tokens.css`)
CSS custom properties for entire color/spacing/typography system:

**Dark Mode Colors**:
```css
--bg-primary: #0F0F1A;              /* Deep navy */
--bg-secondary: #1A1A2E;            /* Cards */
--surface-primary: rgba(30,30,46,0.6); /* Glass */
--text-primary: #F9FAFB;            /* White */
--color-primary-600: #6366F1;       /* Purple */
```

**Light Mode Colors** (`:root` defaults):
```css
--bg-primary: #FFFFFF;
--text-primary: #111827;
--color-primary-600: #2563EB;       /* Blue */
```

**Layout Dimensions**:
```css
--sidebar-width: 240px;
--sidebar-width-collapsed: 64px;
--header-height: 64px;
```

**Typography** (Inter font, 8-point spacing grid):
```css
--font-family-sans: 'Inter', -apple-system, ...;
--text-base: 1rem;   /* 16px */
--space-4: 1rem;     /* 16px */
```

### 3. Theme Config (`frontend/src/styles/theme-config.js`)
JavaScript object with complete theme configuration (colors, shadows, glass effects, typography, spacing, transitions, z-index).

### 4. Tailwind Config (`frontend/tailwind.config.js`)
- `darkMode: 'class'` - Requires `.dark` class
- Maps all design tokens to Tailwind utilities
- Custom `.glass` utility for glassmorphism

### 5. Global Styles
- `frontend/src/index.css` - Base styles, form elements, utilities
- `frontend/src/App.css` - Application-specific layout, tables, modals

---

## Layout Components

### AppShell (`frontend/src/components/layout/AppShell.jsx`)
**Root layout wrapper** for entire authenticated app:

```jsx
<div className="flex min-h-screen bg-[#F5F6FA] dark:bg-[#0F0F1A]">
  <JumboSidebar />
  <div className="flex w-full flex-col">
    <JumboHeader />
    <AlertBanner />
    <main><Outlet /></main>
    <MobileBottomNav />
  </div>
</div>
```

**Features**:
- Mobile sidebar overlay
- Sidebar collapse state (Zustand)
- Recovery mode modal
- Global keyboard shortcuts

**Issue**: Uses hardcoded colors (`#F5F6FA`, `#0F0F1A`, `#1E1E2D`)

---

### JumboHeader (`frontend/src/components/layout/JumboHeader.jsx`)
**Top navigation bar** - Blue header with global actions:

```jsx
<header className="sticky top-0 z-40 h-16 bg-primary-600 text-white">
```

**Contains**:
- Logo/tenant branding
- Global search (Cmd+K) - searches pets, owners, bookings
- Quick actions: Check In, New Booking, View Schedule
- Apps dropdown, Notifications, Messages
- **Theme toggle** (`<ThemeToggleIconButton />`)
- User menu

**Issue**: Uses hardcoded colors (`#4B5DD3`, `#FF9800`, `#4CAF50`)

---

### JumboSidebar (`frontend/src/components/layout/JumboSidebar.jsx`)
**Left navigation** - Collapsible sidebar (260px → 80px):

```jsx
<div className="bg-[#1E1E2D] dark:bg-[#1A1A2E] text-white">
```

**Structure**:
- TODAY: Today, Calendar, Schedule
- PETS & PEOPLE: Pets, Owners, View, Flows, Communications
- BUSINESS: Bookings, Tasks, Financial, Analytics, Settings

**Features**:
- Active state: `bg-[#4B5DD3]`
- Section collapse with localStorage
- Mobile overlay variant

**Issue**: Uses hardcoded colors (`#1E1E2D`, `#1A1A2E`, `#4B5DD3`)

---

### MobileBottomNav (`frontend/src/components/mobile/MobileBottomNav.jsx`)
Bottom tab bar for mobile (< lg breakpoint):
- Tabs: Today | Schedule | Pets | Owners | More
- Hidden on desktop: `className="lg:hidden"`

---

## Theme Toggle Components

**File**: `frontend/src/components/ui/ThemeToggle.jsx`

Three variants:
1. `<ThemeToggle />` - Full button with sliding knob
2. `<ThemeToggleIconButton />` - Icon-only (used in JumboHeader)
3. `<ThemeToggleButton />` - Text button

All use `useTheme()` hook and call `toggleTheme()`.

---

## Dark Mode Implementation

### Flow:
1. User clicks theme toggle
2. `toggleTheme()` from ThemeContext
3. Updates localStorage: `barkbase-theme`
4. Adds/removes `.dark` class on `<html>`
5. Tailwind `dark:` variants activate
6. CSS variables in `.dark` selector override `:root`

### Component Pattern:
```jsx
<div className="bg-white dark:bg-surface-primary text-gray-900 dark:text-text-primary">
  <h1 className="text-2xl dark:text-text-primary">Title</h1>
  <p className="text-gray-600 dark:text-text-secondary">Description</p>
</div>
```

---

## UI Component Patterns

### Button (`frontend/src/components/ui/Button.jsx`)
Uses `class-variance-authority`:
- Variants: primary, secondary, tertiary, destructive, ghost, ghost-dark, success
- Dark mode: `bg-primary-600 dark:bg-primary-700`

### Card (`frontend/src/components/ui/Card.jsx`)
```jsx
<Card className="bg-white dark:bg-surface-primary">
  <CardHeader><CardTitle /></CardHeader>
  <CardContent />
  <CardFooter />
</Card>
```

### Input, Modal, Badge, Alert, Dropdown, Select, etc.
All 30+ UI components follow consistent dark mode patterns.

---

## Provider Hierarchy

**File**: `frontend/src/app/providers/AppProviders.jsx`

```jsx
<ThemeProvider>              ← Theme (outermost)
  <QueryProvider>            ← React Query
    <RealtimeProvider>       ← WebSocket
      <AuthLoader />
      <TenantLoader />
      <Suspense>{children}</Suspense>
      <Toaster />
    </RealtimeProvider>
  </QueryProvider>
</ThemeProvider>
```

---

## Routing & Layout Application

**File**: `frontend/src/app/router.jsx`

```jsx
{
  element: <><RoutePersistence /><AppShell /></>,
  children: [
    // All main routes render inside AppShell
    { path: "today", element: <TodayCommandCenter /> },
    { path: "settings", element: <SettingsLayout />, children: [...] },
    // ... 30+ routes
  ]
},
{
  // Full-screen routes (NO AppShell)
  path: "/handler-flows/builder", element: <WorkflowBuilder />
},
{ path: "/login", element: <Login /> }
```

---

## Color System

### Design Token Colors (from design-tokens.css)

**Dark Theme**:
- Backgrounds: `#0F0F1A`, `#1A1A2E`, `#1E1E2E`
- Surface: `rgba(30, 30, 46, 0.6)` (glass)
- Text: `#F9FAFB`, `#D1D5DB`, `#9CA3AF`
- Primary: `#6366F1` (purple)
- Secondary: `#10B981` (green)
- Accent: `#3B82F6` (blue)
- Success: `#10B981`, Warning: `#F59E0B`, Error: `#EF4444`

**Light Theme**:
- Backgrounds: `#FFFFFF`, `#F9FAFB`, `#F3F4F6`
- Text: `#111827`, `#6B7280`
- Primary: `#2563EB` (blue - different from dark!)

### Hardcoded Colors (Issues) ⚠️
Found in AppShell, JumboHeader, JumboSidebar:
- `#F5F6FA`, `#0F0F1A`, `#1E1E2D`, `#1A1A2E`, `#4B5DD3`, `#FF9800`, `#4CAF50`

**Recommendation**: Replace with design tokens or Tailwind classes.

---

## Responsive Breakpoints

Tailwind defaults (mobile-first):
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

**Common patterns**:
```jsx
className="hidden lg:flex"           // Desktop only
className="lg:hidden"                // Mobile only
className="px-4 sm:px-6 lg:px-8"    // Responsive padding
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
```

---

## Animations & Transitions

### Custom Keyframes (tailwind.config.js):
- `fade-in`, `slide-in`, `scale-in`

### Durations:
```css
--transition-fast: 150ms;
--transition-base: 200ms;
--transition-slow: 300ms;
```

---

## State Management

### UI Store (`frontend/src/stores/ui.js`)
Zustand with persistence:
```javascript
{
  sidebarCollapsed: false,
  setSidebarCollapsed,
  toggleSidebar
}
```
Persisted to: `barkbase-ui` (localStorage)

### Theme State
Managed by ThemeContext (NOT Zustand).
Persisted to: `barkbase-theme`

---

## Utility Functions

### cn() - Class Name Utility ⚠️

**Two versions exist** (duplicate):
1. `frontend/src/lib/cn.js` - Simple filter/join
2. `frontend/src/lib/utils.js` - With tailwind-merge (preferred)

**Recommendation**: Remove `cn.js`, keep only `utils.js`

**Usage**:
```jsx
className={cn(
  'base-classes',
  isDark && 'dark-classes',
  isActive && 'active-classes',
  className
)}
```

---

## Z-Index Layers

```css
--z-dropdown: 1000;
--z-sticky: 1020;
--z-modal-backdrop: 1040;
--z-modal: 1050;
--z-tooltip: 1070;
```

Layout usage:
- JumboHeader: `z-40`
- Sidebar overlay: `z-30`
- Modals: `z-50`

---

## Glassmorphism

```css
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.dark .glass {
  background: rgba(30, 30, 46, 0.6);
}
```

---

## Accessibility

- Focus rings: 2px outline with offset
- WCAG AA contrast ratios
- Keyboard navigation (Tab, Esc, Cmd+K)
- ARIA labels on all interactive elements
- Focus trap in modals
- Semantic HTML

---

## Known Issues & Recommendations

### ⚠️ Issues

1. **Hardcoded colors in layout components**
   - AppShell, JumboHeader, JumboSidebar use hex values
   - Should use: Tailwind classes or `var(--token-name)`

2. **Duplicate cn() utility**
   - Both `lib/cn.js` and `lib/utils.js` export `cn()`
   - Keep only `utils.js` (has tailwind-merge)

3. **Legacy files**
   - `lib/theme.js` - appears unused, not imported
   - `components/layout/Header.jsx` - replaced by JumboHeader

4. **Partial token migration**
   - Mix of design tokens and hardcoded colors
   - Inconsistent approach across components

### ✅ Strengths

1. Comprehensive dual-theme system
2. Consistent dark mode patterns (50+ components)
3. Modern stack: Tailwind + CSS variables + React Context
4. Mobile-responsive with dedicated components
5. Professional B2B design (Linear/Calendly inspired)
6. Accessible with ARIA and keyboard support

### 🎯 Migration Path

To consolidate theme system:
1. Replace hardcoded colors with design tokens:
   ```jsx
   // Before: className="bg-[#1E1E2D]"
   // After:  className="bg-surface-primary"
   ```
2. Remove `lib/theme.js` (legacy)
3. Remove `lib/cn.js` (duplicate)
4. Remove `components/layout/Header.jsx` (replaced)
5. Audit all `#` colors and replace with tokens

---

## File Inventory

### Core Theme (7 files)
- `frontend/src/contexts/ThemeContext.jsx` ✅
- `frontend/src/styles/theme-config.js` ✅
- `frontend/src/styles/design-tokens.css` ✅
- `frontend/tailwind.config.js` ✅
- `frontend/src/index.css` ✅
- `frontend/src/App.css` ✅
- `frontend/src/lib/theme.js` ⚠️ (legacy - unused)

### Layout Components (5 files)
- `frontend/src/components/layout/AppShell.jsx` ✅
- `frontend/src/components/layout/JumboHeader.jsx` ✅
- `frontend/src/components/layout/JumboSidebar.jsx` ✅
- `frontend/src/components/layout/DashboardLayout.jsx` ✅
- `frontend/src/components/layout/Header.jsx` ⚠️ (legacy - unused)

### Theme UI Components (30+ in `frontend/src/components/ui/`)
All with dark mode support:
- ThemeToggle.jsx, Button.jsx, Card.jsx, Input.jsx, Modal.jsx, Badge.jsx, Alert.jsx, Dropdown.jsx, Select.jsx, etc.

### Mobile (4 files)
- `frontend/src/components/mobile/MobileBottomNav.jsx`
- `frontend/src/features/mobile/*`

### Providers & Router (4 files)
- `frontend/src/app/providers/AppProviders.jsx`
- `frontend/src/app/router.jsx`
- `frontend/src/App.jsx`
- `frontend/src/main.jsx`

### Utilities (2 files)
- `frontend/src/lib/cn.js` ⚠️ (duplicate - remove)
- `frontend/src/lib/utils.js` ✅ (preferred)

---

## Quick Reference

### Toggle Theme Programmatically
```jsx
import { useTheme } from '@/contexts/ThemeContext';
const { theme, toggleTheme, isDark } = useTheme();
```

### Apply Dark Mode to Component
```jsx
<div className="bg-white dark:bg-surface-primary text-gray-900 dark:text-text-primary">
```

### Use Design Tokens
```jsx
// Via Tailwind
className="bg-primary-600 dark:bg-primary-700"

// Via CSS variable
style={{ background: 'var(--bg-primary)' }}
```

### Responsive Visibility
```jsx
className="hidden lg:block"  // Desktop only
className="lg:hidden"        // Mobile only
```

### Glassmorphism Effect
```jsx
className="glass"
```

---

## Related Documentation

- `/docs/API_ROUTES.md` - Backend API structure
- `/docs/LAMBDA_FUNCTIONS.md` - Lambda architecture
- `/docs/SECURITY_PATTERNS.md` - Auth & tenant isolation
- `/docs/TROUBLESHOOTING.md` - Common issues

---

**End of Layout & Theme System Documentation**
