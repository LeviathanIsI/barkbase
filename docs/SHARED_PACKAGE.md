# Shared Package (`@barkbase/shared`)

## Purpose

The `shared/` package contains pure utilities and constants that are used across both the frontend and backend of BarkBase. It provides a single source of truth for common functionality.

## What Belongs in Shared

✅ **Include:**
- Pure utility functions with no external dependencies
- Format helpers (date, currency, phone)
- Validation functions
- String manipulation utilities
- Status constants and enums
- Type definitions shared across frontend/backend

❌ **Do NOT include:**
- React-specific code (hooks, components)
- Node.js-specific code (file system, streams)
- Database queries or ORM code
- API client code
- Domain-specific business logic
- Code with external package dependencies

## Directory Structure

```
shared/
├── src/
│   ├── index.ts           # Main export file
│   └── utils/
│       ├── format.ts      # Date, currency, phone formatting
│       ├── validation.ts  # Email, phone, UUID validation
│       ├── strings.ts     # String manipulation utilities
│       └── constants.ts   # Status enums and constants
├── package.json
└── tsconfig.json
```

## Usage

### In Frontend (React)

```javascript
import { formatDate, formatCurrency, BOOKING_STATUS } from '@barkbase/shared';

// Use formatting
const displayDate = formatDate(booking.checkIn, 'short');
const displayPrice = formatCurrency(booking.totalCents);

// Use constants
if (booking.status === BOOKING_STATUS.CHECKED_IN) {
  // ...
}
```

### In Backend (Lambda)

```javascript
const { isValidEmail, PAYMENT_STATUS } = require('@barkbase/shared');

// Validate input
if (!isValidEmail(payload.email)) {
  return { statusCode: 400, body: 'Invalid email' };
}

// Use constants
payment.status = PAYMENT_STATUS.CAPTURED;
```

## Available Exports

### Format Utilities
- `formatCurrency(amount, currency)` - Format cents to currency string
- `formatDate(date, format)` - Format date (short, long, iso, numeric)
- `formatTime(date)` - Format time (e.g., "3:30 PM")
- `formatDateTime(date)` - Format date and time together
- `formatPhone(phone)` - Format phone number
- `formatRelativeTime(date)` - Get relative time (e.g., "2 hours ago")

### Validation Utilities
- `isValidEmail(email)` - Check email format
- `isValidPhone(phone)` - Check phone format
- `isValidUUID(uuid)` - Check UUID v4 format
- `isEmpty(str)` - Check if string is empty/whitespace
- `isValidDate(date)` - Check if valid date
- `isPastDate(date)` - Check if date is in past
- `isFutureDate(date)` - Check if date is in future
- `isToday(date)` - Check if date is today
- `isValidPropertyName(name)` - Check property name format

### String Utilities
- `capitalize(str)` - Capitalize first letter
- `toTitleCase(str)` - Convert to Title Case
- `toKebabCase(str)` - Convert to kebab-case
- `toSnakeCase(str)` - Convert to snake_case
- `toCamelCase(str)` - Convert to camelCase
- `truncate(str, maxLength)` - Truncate with ellipsis
- `getInitials(name)` - Get initials from name
- `pluralize(word, count)` - Pluralize word
- `slugify(str)` - Create URL slug
- `mask(str)` - Mask sensitive data

### Constants
- `BOOKING_STATUS` - Booking status enum
- `PAYMENT_STATUS` - Payment status enum
- `PAYMENT_METHOD` - Payment method enum
- `PET_STATUS` - Pet status enum
- `INVOICE_STATUS` - Invoice status enum
- `TASK_STATUS` - Task status enum
- `TASK_PRIORITY` - Task priority enum
- `PAGINATION` - Default pagination values
- `DATE_TIME` - Weekday/month names
- `HTTP_STATUS` - Common HTTP status codes

## Adding New Utilities

1. Create or update a file in `shared/src/utils/`
2. Export the utility from `shared/src/index.ts`
3. Ensure the utility is a pure function with no dependencies
4. Add JSDoc comments for documentation
5. Run `npm run build` in the shared directory

## Building

```bash
cd shared
npm install
npm run build
```

The build outputs to `shared/dist/` in CJS, ESM, and TypeScript declaration formats.

