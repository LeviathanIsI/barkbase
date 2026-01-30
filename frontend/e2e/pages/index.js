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
export { StaffPage } from './StaffPage.js';
export { VaccinationsPage } from './VaccinationsPage.js';
export { CheckInPage } from './CheckInPage.js';
export { CheckOutPage } from './CheckOutPage.js';
export { InvoicesPage } from './InvoicesPage.js';
export { PaymentsPage } from './PaymentsPage.js';
export { TasksPage } from './TasksPage.js';

// Default export for convenience
export default {
  BasePage: (await import('./BasePage.js')).BasePage,
  LoginPage: (await import('./LoginPage.js')).LoginPage,
  DashboardPage: (await import('./DashboardPage.js')).DashboardPage,
  PetsPage: (await import('./PetsPage.js')).PetsPage,
  OwnersPage: (await import('./OwnersPage.js')).OwnersPage,
  BookingsPage: (await import('./BookingsPage.js')).BookingsPage,
  StaffPage: (await import('./StaffPage.js')).StaffPage,
  VaccinationsPage: (await import('./VaccinationsPage.js')).VaccinationsPage,
  CheckInPage: (await import('./CheckInPage.js')).CheckInPage,
  CheckOutPage: (await import('./CheckOutPage.js')).CheckOutPage,
  InvoicesPage: (await import('./InvoicesPage.js')).InvoicesPage,
  PaymentsPage: (await import('./PaymentsPage.js')).PaymentsPage,
  TasksPage: (await import('./TasksPage.js')).TasksPage,
};
