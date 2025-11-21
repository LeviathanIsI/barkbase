# UI Components

## Overlay Components (⭐ IMPORTANT)

### SlidePanel
**Use for side panels, filters, and quick views**

```jsx
import SlidePanel from '@/components/ui/SlidePanel';

<SlidePanel open={isOpen} onClose={handleClose} title="Panel Title">
  <YourContent />
</SlidePanel>
```

- ✅ Slides from right
- ✅ Click outside to close
- ✅ ESC to close
- ✅ Keeps user on page

**Use cases:**
- Filters
- Kennels quick view
- Check-in/out panel
- Settings
- Any contextual info

### Modal
**Use for centered dialogs, confirmations, and focused forms**

```jsx
import Modal from '@/components/ui/Modal';

<Modal open={isOpen} onClose={handleClose} title="Dialog Title">
  <YourContent />
</Modal>
```

- ✅ Centered
- ✅ Click outside to close
- ✅ ESC to close
- ✅ Focus trap

**Use cases:**
- Confirmations
- Alerts
- New item forms
- Important dialogs

---

## ⚠️ RULE: Always use SlidePanel or Modal

**DO NOT** create custom overlays. Use the standard components above.

See `UI_PATTERNS.md` for full guidelines.

