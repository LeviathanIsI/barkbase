# UI Components

## Overview

BarkBase uses a custom component library built on top of Headless UI and Heroicons, following a dark-first design philosophy with HubSpot-inspired patterns.

**Design System:**
- CSS custom properties for theming
- Dark mode by default
- Responsive design (mobile-first)
- WCAG AA accessibility compliance

---

## New Components Added (Phase 4-5)

### VirtualizedTable

High-performance table component for rendering large datasets using virtual scrolling.

**File:** `frontend/src/components/ui/VirtualizedTable.jsx`

**Purpose:** Efficiently render tables with 1,000+ rows without performance degradation.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `Array` | Required | Array of row data |
| `columns` | `Array` | Required | Column definitions |
| `rowHeight` | `number` | `48` | Height of each row in pixels |
| `overscan` | `number` | `5` | Extra rows to render above/below viewport |
| `onRowClick` | `function` | - | Handler for row clicks |
| `selectedRows` | `Set` | - | Set of selected row IDs |

**Usage:**

```jsx
import { VirtualizedTable } from '@/components/ui/VirtualizedTable';

const columns = [
  { id: 'name', header: 'Name', width: 200 },
  { id: 'email', header: 'Email', width: 250 },
  { id: 'status', header: 'Status', width: 100 },
];

function OwnersList({ owners }) {
  return (
    <VirtualizedTable
      data={owners}
      columns={columns}
      rowHeight={52}
      onRowClick={(row) => navigate(`/owners/${row.id}`)}
    />
  );
}
```

**Implementation Highlights:**

```jsx
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualizedTable({ data, columns, rowHeight = 48 }) {
  const parentRef = useRef(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="overflow-auto h-[600px]">
      <div style={{ height: rowVirtualizer.getTotalSize() }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <TableRow
            key={virtualRow.key}
            row={data[virtualRow.index]}
            style={{
              transform: `translateY(${virtualRow.start}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

---

### VirtualizedList

Virtual scrolling for simple list displays.

**File:** `frontend/src/components/ui/VirtualizedList.jsx`

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `Array` | Required | Array of items |
| `renderItem` | `function` | Required | Render function for each item |
| `itemHeight` | `number` | `48` | Height of each item |
| `className` | `string` | - | Container class |

**Usage:**

```jsx
<VirtualizedList
  items={pets}
  itemHeight={60}
  renderItem={(pet) => (
    <PetListItem pet={pet} onClick={() => selectPet(pet)} />
  )}
/>
```

---

### EmptyState

Consistent empty state display for lists and tables.

**File:** `frontend/src/components/ui/emptystates/EmptyState.jsx`

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `Component` | - | Heroicon component |
| `title` | `string` | Required | Main message |
| `description` | `string` | - | Secondary message |
| `actions` | `ReactNode` | - | Action buttons |
| `compact` | `boolean` | `false` | Smaller version |

**Usage:**

```jsx
import { EmptyState } from '@/components/ui/emptystates';
import { CalendarIcon } from '@heroicons/react/24/outline';

<EmptyState
  icon={CalendarIcon}
  title="No bookings yet"
  description="Create your first booking to get started."
  actions={
    <Button onClick={openCreateModal}>
      Create Booking
    </Button>
  }
/>
```

**Variants:**

```jsx
// Inline empty state (for dropdowns, cards)
<InlineEmpty message="No items found" />

// Table empty state (spans full width)
<TableEmptyState
  colSpan={columns.length}
  type="noSearchResults"
  entityType="owners"
/>
```

---

### Skeleton Components

Loading placeholders with shimmer animation.

**Files:** `frontend/src/components/ui/skeleton/`

**Components:**

| Component | Purpose |
|-----------|---------|
| `Skeleton` | Base skeleton element |
| `SkeletonText` | Text placeholder (multiple lines) |
| `SkeletonAvatar` | Circular avatar placeholder |
| `SkeletonCard` | Card layout placeholder |
| `SkeletonTableRow` | Table row placeholder |
| `SkeletonChart` | Chart/graph placeholder |
| `SkeletonForm` | Form layout placeholder |

**Usage:**

```jsx
import {
  Skeleton,
  SkeletonText,
  SkeletonTableRow,
} from '@/components/ui/skeleton';

// Basic skeleton
<Skeleton className="h-4 w-32" />

// Text with multiple lines
<SkeletonText lines={3} />

// Table loading state
{isLoading ? (
  Array.from({ length: 5 }).map((_, i) => (
    <SkeletonTableRow key={i} columns={6} />
  ))
) : (
  data.map(row => <TableRow row={row} />)
)}
```

**Animation:**

```css
/* tokens.css */
@keyframes bb-skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.bb-skeleton-pulse {
  animation: bb-skeleton-pulse 1.5s ease-in-out infinite;
}
```

---

### ErrorBoundary / ErrorFallback

Graceful error handling for React component crashes.

**File:** `frontend/src/app/ErrorBoundary.jsx`

**Usage:**

```jsx
import ErrorBoundary from '@/app/ErrorBoundary';

// Wrap components that might crash
<ErrorBoundary>
  <ComplexComponent />
</ErrorBoundary>

// With custom fallback
<ErrorBoundary
  fallback={
    <div className="p-4">
      <p>Something went wrong in this section.</p>
      <Button onClick={() => window.location.reload()}>
        Reload Page
      </Button>
    </div>
  }
>
  <ComplexComponent />
</ErrorBoundary>
```

**Default Fallback UI:**

```jsx
export function ErrorFallback({ error, resetError }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-semibold mt-4">Something went wrong</h2>
        <p className="text-gray-500 mt-2">{error.message}</p>
        <Button onClick={resetError} className="mt-4">
          Try Again
        </Button>
      </div>
    </div>
  );
}
```

---

### DeleteConfirmationModal

enterprise deletion confirmation with type-to-confirm.

**File:** `frontend/src/components/ui/DeleteConfirmationModal.jsx`

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | Required | Modal visibility |
| `onClose` | `function` | Required | Close handler |
| `onConfirm` | `function` | Required | Confirm handler |
| `title` | `string` | Required | Modal title |
| `itemName` | `string` | Required | Name to type for confirmation |
| `itemType` | `string` | Required | Type of item (e.g., "owner") |
| `warningMessage` | `string` | - | Additional warning |
| `isLoading` | `boolean` | `false` | Loading state |

**Usage:**

```jsx
<DeleteConfirmationModal
  open={deleteModalOpen}
  onClose={() => setDeleteModalOpen(false)}
  onConfirm={handleDelete}
  title="Delete Owner"
  itemName={owner.firstName + ' ' + owner.lastName}
  itemType="owner"
  warningMessage="This will also delete all associated pets and booking history."
  isLoading={isDeleting}
/>
```

**Behavior:**
- User must type the item name exactly to enable delete button
- Shows warning about cascading effects
- Delete button is red and disabled until confirmation text matches

---

### Clickable

Accessible wrapper for clickable non-button elements.

**File:** `frontend/src/components/ui/Clickable.jsx`

**Purpose:** Makes any element keyboard-accessible and semantically correct for screen readers.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | `string` | `'div'` | HTML element to render |
| `onClick` | `function` | - | Click handler |
| `disabled` | `boolean` | `false` | Disabled state |
| `role` | `string` | `'button'` | ARIA role |
| `children` | `ReactNode` | Required | Content |

**Usage:**

```jsx
import { Clickable } from '@/components/ui/Clickable';

// Clickable card
<Clickable
  onClick={() => navigate(`/pets/${pet.id}`)}
  className="p-4 border rounded-lg hover:bg-gray-50"
>
  <PetCard pet={pet} />
</Clickable>

// Clickable row
<Clickable
  as="tr"
  onClick={() => selectRow(row.id)}
  className="hover:bg-gray-50"
>
  <td>{row.name}</td>
  <td>{row.email}</td>
</Clickable>
```

**Implementation:**

```jsx
export const Clickable = forwardRef(function Clickable(props, ref) {
  const {
    as = 'div',
    onClick,
    disabled = false,
    role = 'button',
    children,
    className,
    ...restProps
  } = props;

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(e);
    }
  };

  const Element = as;

  return (
    <Element
      ref={ref}
      role={role}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      onKeyDown={handleKeyDown}
      aria-disabled={disabled || undefined}
      className={cn(
        className,
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      )}
      {...restProps}
    >
      {children}
    </Element>
  );
});
```

---

### LaunchChecklist

Pre-launch verification checklist for facility setup.

**File:** `frontend/src/features/settings/components/LaunchChecklist.jsx`

**Purpose:** Interactive checklist that shows progress toward launch readiness.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `data` | `object` | Tenant data for checking completion |
| `onNavigate` | `function` | Navigation handler |
| `onRefresh` | `function` | Refresh data handler |
| `isLoading` | `boolean` | Loading state |

**Categories Checked:**
- Business Setup (name, logo, timezone)
- Services & Pricing
- Facility Configuration
- Team & Security
- Billing & Payments
- Communications

---

## Updated Components

### Input

Enhanced with ARIA attributes for accessibility.

**File:** `frontend/src/components/ui/Input.jsx`

**New Features:**
- `aria-invalid` when has error
- `aria-describedby` pointing to error message
- `aria-required` for required fields

**Usage:**

```jsx
<Input
  name="email"
  type="email"
  label="Email Address"
  error={errors.email}
  required
  aria-describedby="email-error"
/>
{errors.email && (
  <p id="email-error" className="text-red-500 text-sm">
    {errors.email}
  </p>
)}
```

---

### Badge

Updated to use design tokens for consistent theming.

**File:** `frontend/src/components/ui/Badge.jsx`

**Variants:**

| Variant | Use Case |
|---------|----------|
| `neutral` | Default, low emphasis |
| `info` | Informational |
| `success` | Positive status |
| `warning` | Caution |
| `danger` / `error` | Negative status |
| `outline` | Minimal |
| `ghost` | Very low emphasis |
| `accent` / `primary` | Brand color |
| `purple` | Special states (No Show) |

**Changes in Phase 5:**

```javascript
// Before
purple: ['bg-purple-500/10', 'text-purple-400']

// After (using design tokens)
purple: [
  'bg-[var(--bb-color-purple-soft)]',
  'border-[var(--bb-color-purple-soft)]',
  'text-[var(--bb-color-purple)]',
]
```

---

### Modal

Already had keyboard navigation (Escape to close, focus trap).

**Accessibility Features:**
- Focus trap within modal
- Escape key closes modal
- `aria-modal="true"`
- `aria-labelledby` for title
- Background scroll lock

---

## Design Tokens

### Color Tokens

```css
/* Light theme */
:root {
  --bb-color-bg-body: #f9fafb;
  --bb-color-bg-surface: #ffffff;
  --bb-color-bg-elevated: #f3f4f6;

  --bb-color-text-primary: #111827;
  --bb-color-text-muted: #6b7280;

  --bb-color-status-positive: #16a34a;
  --bb-color-status-warning: #d97706;
  --bb-color-status-negative: #dc2626;
  --bb-color-status-info: #2563eb;
}

/* Dark theme */
.dark {
  --bb-color-bg-body: #262830;
  --bb-color-bg-surface: #2c2f36;
  --bb-color-bg-elevated: #32353d;

  --bb-color-text-primary: #f0f2f4;
  --bb-color-text-muted: #a8adbb;

  --bb-color-status-positive: #4ade80;
  --bb-color-status-warning: #fbbf24;
  --bb-color-status-negative: #fca5a5;
  --bb-color-status-info: #93c5fd;
}
```

### Spacing Tokens

```css
:root {
  --bb-space-1: 0.25rem;  /* 4px */
  --bb-space-2: 0.5rem;   /* 8px */
  --bb-space-3: 0.75rem;  /* 12px */
  --bb-space-4: 1rem;     /* 16px */
  --bb-space-6: 1.5rem;   /* 24px */
  --bb-space-8: 2rem;     /* 32px */
}
```

### Border Radius Tokens

```css
:root {
  --bb-radius-sm: 0.25rem;
  --bb-radius-md: 0.375rem;
  --bb-radius-lg: 0.5rem;
  --bb-radius-xl: 0.75rem;
}
```

---

## Component Index

### Core UI

| Component | File | Description |
|-----------|------|-------------|
| Button | `ui/Button.jsx` | Primary action button |
| Input | `ui/Input.jsx` | Text input field |
| Select | `ui/Select.jsx` | Dropdown select |
| Textarea | `ui/Textarea.jsx` | Multi-line text input |
| Checkbox | `ui/Checkbox.jsx` | Checkbox input |
| Radio | `ui/Radio.jsx` | Radio button group |
| Switch | `ui/Switch.jsx` | Toggle switch |
| Badge | `ui/Badge.jsx` | Status indicator |
| Card | `ui/Card.jsx` | Content container |
| Modal | `ui/Modal.jsx` | Dialog overlay |
| Tooltip | `ui/Tooltip.jsx` | Hover tooltip |
| Toast | `ui/Toast.jsx` | Notification toast |

### Layout

| Component | File | Description |
|-----------|------|-------------|
| Container | `layout/Container.jsx` | Max-width wrapper |
| Grid | `layout/Grid.jsx` | CSS grid wrapper |
| Stack | `layout/Stack.jsx` | Vertical stack |
| Flex | `layout/Flex.jsx` | Flexbox wrapper |

### Data Display

| Component | File | Description |
|-----------|------|-------------|
| DataTable | `ui/DataTable.jsx` | Feature-rich table |
| VirtualizedTable | `ui/VirtualizedTable.jsx` | Virtual scrolling table |
| EmptyState | `ui/emptystates/EmptyState.jsx` | Empty state display |
| Skeleton | `ui/skeleton/Skeleton.jsx` | Loading placeholder |

### Feedback

| Component | File | Description |
|-----------|------|-------------|
| Alert | `ui/Alert.jsx` | Inline alert |
| ErrorBoundary | `app/ErrorBoundary.jsx` | Error catcher |
| LoadingSpinner | `ui/LoadingSpinner.jsx` | Loading indicator |
| ProgressBar | `ui/ProgressBar.jsx` | Progress indicator |

### Navigation

| Component | File | Description |
|-----------|------|-------------|
| Sidebar | `navigation/Sidebar.jsx` | Main navigation |
| Topbar | `navigation/Topbar.jsx` | Top navigation bar |
| Breadcrumbs | `ui/Breadcrumbs.jsx` | Navigation trail |
| Tabs | `ui/Tabs.jsx` | Tab navigation |
