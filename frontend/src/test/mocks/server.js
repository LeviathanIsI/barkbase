/**
 * MSW Server Setup for Node.js Environment (Tests)
 *
 * Sets up a mock server that intercepts HTTP requests in test environment.
 * Import this in your test setup file.
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW server instance
 * Use this to add additional handlers in tests
 *
 * @example
 * // In a test file:
 * import { server } from '@/test/mocks/server';
 * import { http, HttpResponse } from 'msw';
 *
 * test('handles error', () => {
 *   server.use(
 *     http.get('/api/v1/entity/owners', () => {
 *       return HttpResponse.json({ error: 'Server error' }, { status: 500 });
 *     })
 *   );
 *   // ... test code
 * });
 */
export const server = setupServer(...handlers);
