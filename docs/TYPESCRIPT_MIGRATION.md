# BarkBase TypeScript Migration Plan

> Last Updated: 2024-12-01 (P3-4 Migration Preparation)

## Overview

This document outlines the strategy for incrementally migrating BarkBase from JavaScript to TypeScript. The goal is to improve type safety, developer experience, and code maintainability without disrupting active development.

## Current State

### TypeScript Already in Use
- `shared/` - Utility functions (fully TypeScript)
- `frontend/src/lib/*.ts` - Several library files
- `frontend/src/types/api.types.ts` - API type definitions (NEW)
- `frontend/src/lib/properties.types.ts` - Properties system types
- `frontend/src/lib/validations/index.js` - Zod schemas (runtime validation)

### Configuration
- `shared/tsconfig.json` - Configured for ES2020, strict mode
- Frontend uses Vite with TypeScript support enabled

## Migration Strategy

### Phase 1: Foundation (Complete)
- [x] Create `tsconfig.json` in `shared/`
- [x] Create core type definitions (`api.types.ts`)
- [x] Document migration plan

### Phase 2: Type Definitions (1-2 days)
Create comprehensive type definitions for all entities:

```
frontend/src/types/
├── api.types.ts          # Core entity types (DONE)
├── index.ts              # Re-exports
├── store.types.ts        # Zustand store types
├── form.types.ts         # Form/validation types
└── hooks.types.ts        # Custom hook return types
```

#### Recommended Next Steps:
1. Create `index.ts` to re-export all types
2. Add types for Zustand stores (`auth`, `tenant`, `ui`)
3. Add types for react-query hooks

### Phase 3: Gradual File Migration (Ongoing)

#### Priority Order:
1. **API Layer** (`features/*/api.js`)
   - High value: Catches API contract mismatches
   - Low risk: Isolated from UI components

2. **Stores** (`stores/*.js`)
   - High value: State shape validation
   - Medium risk: Used across app

3. **Utility Functions** (`lib/*.js`)
   - High value: Shared code benefits most
   - Low risk: Well-tested functions

4. **Hooks** (`hooks/*.js`, `features/*/hooks/*.js`)
   - Medium value: Type inference helps consumers
   - Low risk: Pure logic

5. **Components** (`components/*.jsx`, `features/*/components/*.jsx`)
   - Medium value: Props validation
   - Higher risk: Most numerous files

### Phase 4: Strict Mode Enablement (Future)
After majority migration:
1. Enable `strict: true` in tsconfig
2. Enable `noImplicitAny`
3. Enable `strictNullChecks`

## File Conversion Process

### Step 1: Rename File
```bash
# Rename .js/.jsx to .ts/.tsx
git mv src/features/pets/api.js src/features/pets/api.ts
```

### Step 2: Add Type Imports
```typescript
// Before (api.js)
import apiClient from '@/lib/apiClient';

// After (api.ts)
import apiClient from '@/lib/apiClient';
import type { Pet, PetWithOwners, ApiResponse } from '@/types/api.types';
```

### Step 3: Type Function Signatures
```typescript
// Before
export const useCreatePet = () => {
  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post('/api/v1/entity/pets', payload);
      return res.data;
    },
  });
};

// After
interface CreatePetPayload {
  name: string;
  species: PetSpecies;
  breed?: string;
  // ... other fields
}

export const useCreatePet = () => {
  return useMutation<Pet, Error, CreatePetPayload>({
    mutationFn: async (payload) => {
      const res = await apiClient.post<ApiResponse<Pet>>('/api/v1/entity/pets', payload);
      return res.data.data!;
    },
  });
};
```

### Step 4: Fix Type Errors
- Address any `any` types
- Add null checks where needed
- Use type guards for narrowing

## Type Definition Guidelines

### Entity Types
- Match database column names (snake_case)
- Use `string` for UUIDs
- Use `string` for ISO date strings
- Use `number` for cents (money)

```typescript
// Good
interface Invoice {
  id: string;
  total_cents: number;
  due_date: string;  // ISO date string
}

// Avoid
interface Invoice {
  id: UUID;              // Don't create UUID type
  total: number;         // Ambiguous - dollars or cents?
  dueDate: Date;         // Date objects cause serialization issues
}
```

### API Response Types
```typescript
// Standard response wrapper
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
}

// Usage
const response: ApiResponse<Pet[]> = await apiClient.get('/api/v1/entity/pets');
```

### Form Types
```typescript
// Derive from Zod schemas when possible
import { z } from 'zod';
import { petSchema } from '@/lib/validations';

type PetFormData = z.infer<typeof petSchema>;
```

## Configuration

### Frontend tsconfig.json (Recommended)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": false,
    "noImplicitAny": false,
    "strictNullChecks": false,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Path Aliases
Ensure Vite config matches tsconfig paths:
```javascript
// vite.config.js
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

## Coexistence Strategy

### Mixed .js and .ts Files
- Both file types can coexist
- TypeScript compiler processes both
- Vite handles compilation seamlessly

### JSDoc for Gradual Typing
For files not yet migrated, use JSDoc:
```javascript
/**
 * @param {import('@/types/api.types').Pet} pet
 * @returns {string}
 */
function formatPetName(pet) {
  return `${pet.name} (${pet.breed || 'Unknown breed'})`;
}
```

### Type-Only Imports
Use `import type` to avoid runtime overhead:
```typescript
// Good - type is erased at compile time
import type { Pet } from '@/types/api.types';

// Also fine but includes runtime import
import { Pet } from '@/types/api.types';
```

## Migration Checklist

### Pre-Migration
- [ ] Verify tsconfig.json is properly configured
- [ ] Ensure path aliases work in both JS and TS
- [ ] Install @types packages for dependencies
- [ ] Create core type definitions

### During Migration
- [ ] Migrate one file at a time
- [ ] Run type checker after each file
- [ ] Update imports in dependent files
- [ ] Add tests if missing

### Post-Migration
- [ ] Enable stricter compiler options
- [ ] Remove @ts-ignore comments
- [ ] Audit remaining `any` types
- [ ] Update CI to run type checking

## Common Issues and Solutions

### Issue: Module Resolution
```
Cannot find module '@/types/api.types' or its corresponding type declarations
```
**Solution:** Check tsconfig `paths` and vite.config `alias` match.

### Issue: JSX in .ts Files
```
JSX expressions can only be used in .tsx files
```
**Solution:** Use `.tsx` extension for files with JSX.

### Issue: Implicit Any
```
Parameter 'data' implicitly has an 'any' type
```
**Solution:** Add explicit type annotation or disable `noImplicitAny`.

### Issue: Null Checks
```
Object is possibly 'undefined'
```
**Solution:** Use optional chaining (`?.`) or non-null assertion (`!`) if certain.

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Zod Type Inference](https://zod.dev/?id=type-inference)
- [TanStack Query TypeScript](https://tanstack.com/query/v4/docs/typescript)

## Timeline Estimate

| Phase | Duration | Status |
|-------|----------|--------|
| Foundation | 1 day | Complete |
| Type Definitions | 2 days | In Progress |
| API Layer Migration | 3-5 days | Not Started |
| Stores Migration | 2 days | Not Started |
| Components Migration | 5-10 days | Not Started |
| Strict Mode | 1-2 days | Not Started |

**Total Estimate:** 2-3 weeks of incremental work alongside feature development.
