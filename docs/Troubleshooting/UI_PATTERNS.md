# UI Patterns & Component Guidelines

## Standard Patterns for Overlays & Panels

### ⭐ SlidePanel (RIGHT-SIDE FLYOUT)

**Use for:** Filters, quick views, contextual info, settings panels

**Component:** `<SlidePanel>` from `@/components/ui/SlidePanel`

**Key Features:**
- Slides in from right side
- Backdrop click to close
- ESC key to close
- Close button (X) in header
- Keeps user on current page

**Examples:**
```jsx
// Filters
<SlidePanel open={showFilters} onClose={handleClose} title="Filters" width="w-96">
  <FilterContent />
</SlidePanel>

// Quick views
<SlidePanel open={showKennels} onClose={handleClose} title="Kennel Layout">
  <KennelView />
</SlidePanel>
```

**When to use:**
- ✅ Filters and search options
- ✅ Quick reference panels (kennels, check-in/out)
- ✅ Settings that don't need full page
- ✅ Contextual actions while staying on current page
- ✅ ANY panel that should keep user in their workflow

**When NOT to use:**
- ❌ Confirmations (use Modal)
- ❌ Alerts (use Modal)
- ❌ Forms that need full attention (use Modal or page)

---

### Modal (CENTERED DIALOG)

**Use for:** Confirmations, alerts, focused forms

**Component:** `<Modal>` from `@/components/ui/Modal`

**Key Features:**
- Centered on screen
- Backdrop click to close
- ESC key to close
- Close button (X) in header
- Focus trap

**Examples:**
```jsx
// Confirmations
<Modal open={showConfirm} onClose={handleClose} title="Confirm Action">
  <p>Are you sure?</p>
</Modal>

// Forms
<Modal open={showForm} onClose={handleClose} title="New Booking">
  <BookingForm />
</Modal>
```

**When to use:**
- ✅ Confirmations and alerts
- ✅ Important forms requiring focus
- ✅ Dialogs that need user attention
- ✅ Actions that need explicit confirmation

---

## Universal Requirements

### All overlays (Modals and SlidePanels) MUST support:

1. **Close on backdrop click** - Clicking outside closes it
2. **Close on ESC key** - Pressing ESC closes it
3. **Close button** - X icon in top right
4. **Prevent body scroll** - Lock scrolling when open
5. **Accessible** - Proper ARIA labels and focus management

### Do NOT create custom overlays
- Always use `SlidePanel` or `Modal`
- Never create one-off overlay components
- Consistency > customization

---

## Quick Reference

| Use Case | Component | Position |
|----------|-----------|----------|
| Filters | SlidePanel | Right side |
| Quick views | SlidePanel | Right side |
| Settings panels | SlidePanel | Right side |
| Confirmations | Modal | Center |
| Alerts | Modal | Center |
| Forms (focused) | Modal | Center |
| New record creation | Modal | Center |

---

## Migration Guide

If you find old patterns like:
```jsx
// ❌ OLD - Custom modal
<div className="fixed inset-0 z-50">
  <div className="bg-black/50" onClick={onClose}>
    <div className="bg-white">...</div>
  </div>
</div>
```

Replace with:
```jsx
// ✅ NEW - SlidePanel or Modal
<SlidePanel open={isOpen} onClose={onClose} title="Title">
  ...
</SlidePanel>
```

