/**
 * Page Objects Index
 * Export all page objects for easy importing
 */

export { BasePage } from './BasePage.js';
export { LoginPage } from './LoginPage.js';
export { DashboardPage } from './DashboardPage.js';
export { PetsPage } from './PetsPage.js';
export { OwnersPage } from './OwnersPage.js';
export { BookingsPage } from './BookingsPage.js';

// Default export for convenience
export default {
  BasePage: (await import('./BasePage.js')).BasePage,
  LoginPage: (await import('./LoginPage.js')).LoginPage,
  DashboardPage: (await import('./DashboardPage.js')).DashboardPage,
  PetsPage: (await import('./PetsPage.js')).PetsPage,
  OwnersPage: (await import('./OwnersPage.js')).OwnersPage,
  BookingsPage: (await import('./BookingsPage.js')).BookingsPage,
};
