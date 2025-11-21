# @barkbase/shared

Shared utilities, constants, and types for BarkBase frontend and backend.

## Purpose

This package contains isomorphic code that can be used across both frontend (React) and backend (Node.js) codebases:

- **Constants:** Plan tiers, feature flags, status enums
- **Validation schemas:** Common validation patterns (email, phone, dates)
- **Utilities:** Pure functions for formatting, parsing, etc.
- **Types:** Shared TypeScript types and interfaces

## Installation

This is an internal workspace package. Import it in your project:

```javascript
// Frontend
import { PLAN_TIERS, isFeatureEnabled } from '@barkbase/shared';

// Backend
const { PLAN_TIERS, isFeatureEnabled } = require('@barkbase/shared');
```

## Structure

```
shared/
├── src/
│   ├── constants/
│   │   ├── plans.ts        # Plan tiers and features
│   │   └── statuses.ts     # Status enums
│   ├── validation/
│   │   └── schemas.ts      # Common validation schemas
│   ├── utils/
│   │   └── format.ts       # Pure utility functions
│   └── index.ts            # Main export
├── package.json
└── tsconfig.json
```

## Usage Example

```typescript
import { PLAN_TIERS, validateEmail } from '@barkbase/shared';

// Check plan features
if (PLAN_TIERS.PRO.features.includes('advanced_reporting')) {
  // ...
}

// Validate email
const isValid = validateEmail('user@example.com');
```

## Future Enhancements

- Feature flag evaluation logic (shared between frontend/backend)
- Date/time formatting utilities
- Common regex patterns
- Shared DTOs for API communication

