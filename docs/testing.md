# Testing Strategy

## Unit & Component Tests
- Frontend uses Vitest + React Testing Library
- Sample test in `src/components/ui/__tests__/Button.test.jsx`
- Add tests for hooks (`useOfflineDetection`) and stores by importing Zustand selectors

## Integration Tests
- Backend uses Jest + Supertest; boot Express app without network
- Add fixtures via Prisma test database or SQLite in-memory file

## End-to-End (Future)
- Recommended: Playwright for combined frontend/backend flows (check-in, booking drag-drop)
- Configure to spin up Docker Compose stack before suite

## Visual Regression (Planned)
- Storybook + Chromatic/BackstopJS once Storybook stories are added
- Theme variants per tenant should be captured for approval workflows

## Offline Scenarios
- Add Cypress/Playwright tests mocking `navigator.onLine` and verifying queue behaviour

## CI Considerations
- Run `npm run lint` and `npm test` for both workspaces
- Execute Prisma migrations against ephemeral Postgres container with `DATABASE_PROVIDER=postgresql`
