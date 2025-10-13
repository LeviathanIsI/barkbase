# Refactor Map (Frontend UI Primitives)

## Page Shell / Header Toolbars
- **Duplicates**
  - `src/features/owners/routes/Owners.jsx` (page title, view tabs, action buttons, filter toolbar)
  - `src/features/pets/routes/Pets.jsx` (same structure with different copy)
  - `src/features/objects/routes/RecordDetail.jsx` (header + actions + tabs)
  - `src/components/shared/PlaceholderPage.jsx`
- **Shared Props**
  - `title`, `subtitle`, optional `breadcrumbs`
  - slots for `headerActions`, `toolbar`, `children`
  - optional `isStickyHeader`

## Section Card / Panel
- **Duplicates**
  - `src/features/owners/routes/OwnerDetail.jsx` (multiple `div` blocks with `rounded-lg border border-border bg-white p-6`)
  - `src/features/objects/routes/RecordDetail.jsx`
  - `src/features/settings/routes/AssociationsSettings.jsx`
  - `src/features/dashboard/routes/Dashboard.jsx`
- **Shared Props**
  - `title`, `description`
  - slots for `header`, `footer`
  - `variant` (`compact` | `spacious`)
  - `className`

## Details Grid (2/3 column responsive grids)
- **Duplicates**
  - `src/features/owners/routes/OwnerDetail.jsx` – personal/contact info grids
  - `src/features/pets/routes/Pets.jsx` (pet profile modal summary sections)
  - `src/features/bookings/components/NewBookingModal.jsx`
  - `src/features/objects/routes/RecordDetail.jsx` (JSON block placeholder)
- **Shared Props**
  - `columns` (defaults to 2, supports 3 on md)
  - `gap` size
  - `as` element type

## Info Row / Key Value
- **Duplicates**
  - `src/features/owners/routes/OwnerDetail.jsx` – label/value rows with optional icons
  - `src/features/owners/components/OwnerDetailModal.jsx`
  - `src/features/pets/routes/Pets.jsx` (inline stats rows)
  - `src/features/objects/components/AssociationsTab.jsx`
- **Shared Props**
  - `label`, `value`
  - optional `icon`, `tooltip`, `copyable`, `monospaced`
  - `className`

## Avatar with Meta
- **Duplicates**
  - `src/features/owners/routes/OwnerDetail.jsx` (circle initials + name/email)
  - `src/features/objects/routes/RecordDetail.jsx`
  - `src/features/pets/routes/Pets.jsx` (list/table avatar + text)
- **Shared Props**
  - `avatar` (image URL or initials)
  - `title`, `subtitle`, optional `meta`

## Status Pill / Badge
- **Duplicates**
  - `src/features/owners/routes/Owners.jsx` (status columns use `span` with bg/text color)
  - `src/features/pets/routes/Pets.jsx`
  - `src/features/bookings/components/NewBookingModal.jsx`
- **Shared Props**
  - `status` (string)
  - `intent` override
  - `className`

## Tag List / Editor
- **Duplicates**
  - `src/features/owners/routes/OwnerDetail.jsx` (behavior flags, tags)
  - `src/features/pets/routes/Pets.jsx` (behavior flags)
  - `src/features/objects/components/AssociationsTab.jsx` (labels)
- **Shared Props**
  - `tags` array of strings
  - `onAdd`, `onRemove`, optional `isLoading`
  - `editable`, `placeholder`

## Data Table Wrapper
- **Duplicates**
  - `src/features/owners/routes/Owners.jsx` custom table usage (columns definitions, actions, pagination)
  - `src/features/pets/routes/Pets.jsx`
  - `src/features/objects/components/AssociationsTab.jsx` (inline table layout)
- **Shared Props**
  - `columns`, `data`
  - pagination: `{ page, pageSize, total }`, callbacks `onPageChange`, `onSortChange`
  - `emptyState` slot

## Form Dialog / Drawer Form / Submit Bar
- **Duplicates**
  - `src/features/owners/components/OwnerFormModal.jsx`
  - `src/features/pets/components/PetFormModal.jsx`
  - `src/features/bookings/components/NewBookingModal.jsx`
  - `src/features/handlerFlows/components/TriggerConfigurator.jsx` (nested modal)
- **Shared Props**
  - `open`, `onClose`
  - `title`, optional `description`
  - `onSubmit`, `isSubmitting`
  - `submitLabel`, `cancelLabel`, `variant` (`dialog` | `drawer`)

## Empty State / Skeleton Blocks
- **Duplicates**
  - `src/features/owners/routes/Owners.jsx` (empty table placeholder)
  - `src/features/pets/routes/Pets.jsx`
  - `src/features/objects/components/AssociationsTab.jsx`
  - `src/components/shared/PlaceholderPage.jsx`
- **Shared Props**
  - `icon`, `title`, `message`
  - optional `action`
  - variants: `card`, `table`, `details`, `inline`

## Error Banner / Correlation ID
- **Duplicates**
  - `src/features/owners/routes/Owners.jsx` (toast fallback)
  - `src/components/shared/ErrorAlert.jsx`
  - `src/features/pets/routes/Pets.jsx`
- **Shared Props**
  - `message`, `details`, optional `correlationId`
  - `onRetry`

