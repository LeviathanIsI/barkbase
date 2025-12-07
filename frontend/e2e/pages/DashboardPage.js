/**
 * Dashboard/Today Page Object
 * Handles the main dashboard/command center
 */

import { BasePage } from './BasePage.js';

export class DashboardPage extends BasePage {
  constructor(page) {
    super(page);

    this.url = '/today';

    this.selectors = {
      ...this.selectors,
      // Dashboard sections
      pageTitle: 'h1',
      welcomeMessage: '[data-testid="welcome-message"]',

      // Stats cards
      statsCards: '[data-testid="stat-card"], .stat-card',
      totalPets: '[data-testid="total-pets"]',
      activeBookings: '[data-testid="active-bookings"]',
      todayCheckIns: '[data-testid="today-checkins"]',
      todayCheckOuts: '[data-testid="today-checkouts"]',

      // Task sections
      overdueTasks: '[data-testid="overdue-tasks"]',
      taskItem: '[data-testid="task-item"]',
      completeTaskButton: 'button:has-text("Complete")',

      // Quick actions
      newBookingButton: 'button:has-text("New Booking"), [data-testid="new-booking"]',
      addPetButton: 'button:has-text("Add Pet"), [data-testid="add-pet"]',
      addOwnerButton: 'button:has-text("Add Owner"), [data-testid="add-owner"]',

      // Arrival/Departure lists
      arrivalsSection: '[data-testid="arrivals"], .arrivals-section',
      departuresSection: '[data-testid="departures"], .departures-section',
      arrivalItem: '[data-testid="arrival-item"]',
      departureItem: '[data-testid="departure-item"]',

      // Navigation
      sidebarNavItem: 'nav a, nav button',
    };
  }

  /**
   * Navigate to dashboard
   */
  async goto() {
    await super.goto(this.url);
    await this.waitForDashboardLoad();
  }

  /**
   * Wait for dashboard to load
   */
  async waitForDashboardLoad() {
    await this.page.locator(this.selectors.pageTitle).waitFor({ state: 'visible' });
    await this.waitForLoadingComplete();
  }

  /**
   * Get page title text
   */
  async getPageTitle() {
    return this.page.locator(this.selectors.pageTitle).textContent();
  }

  /**
   * Get stat card value
   */
  async getStatValue(statName) {
    const selector = `[data-testid="${statName}"], .stat-card:has-text("${statName}")`;
    const card = this.page.locator(selector);
    const value = await card.locator('.stat-value, .value, h2, h3').first().textContent();
    return value?.trim();
  }

  /**
   * Get all stats
   */
  async getAllStats() {
    const cards = await this.page.locator(this.selectors.statsCards).all();
    const stats = {};

    for (const card of cards) {
      const label = await card.locator('.stat-label, .label, p').first().textContent();
      const value = await card.locator('.stat-value, .value, h2, h3').first().textContent();
      if (label) {
        stats[label.trim()] = value?.trim();
      }
    }

    return stats;
  }

  /**
   * Get overdue tasks count
   */
  async getOverdueTasksCount() {
    const tasks = await this.page.locator(this.selectors.taskItem).count();
    return tasks;
  }

  /**
   * Complete a task by index
   */
  async completeTask(index = 0) {
    const tasks = await this.page.locator(this.selectors.taskItem).all();
    if (tasks[index]) {
      await tasks[index].locator(this.selectors.completeTaskButton).click();
      await this.waitForLoadingComplete();
    }
  }

  /**
   * Click new booking button
   */
  async clickNewBooking() {
    await this.page.locator(this.selectors.newBookingButton).click();
    await this.page.locator(this.selectors.modal).waitFor({ state: 'visible' });
  }

  /**
   * Get today's arrivals
   */
  async getTodaysArrivals() {
    const arrivals = await this.page.locator(this.selectors.arrivalItem).all();
    const data = [];

    for (const arrival of arrivals) {
      data.push({
        petName: await arrival.locator('.pet-name, [data-testid="pet-name"]').textContent(),
        ownerName: await arrival.locator('.owner-name, [data-testid="owner-name"]').textContent(),
        time: await arrival.locator('.time, [data-testid="time"]').textContent(),
      });
    }

    return data;
  }

  /**
   * Get today's departures
   */
  async getTodaysDepartures() {
    const departures = await this.page.locator(this.selectors.departureItem).all();
    const data = [];

    for (const departure of departures) {
      data.push({
        petName: await departure.locator('.pet-name, [data-testid="pet-name"]').textContent(),
        ownerName: await departure.locator('.owner-name, [data-testid="owner-name"]').textContent(),
        time: await departure.locator('.time, [data-testid="time"]').textContent(),
      });
    }

    return data;
  }

  /**
   * Navigate to page via sidebar
   */
  async navigateTo(pageName) {
    const navItem = this.page.locator(`${this.selectors.sidebarNavItem}:has-text("${pageName}")`);
    await navItem.click();
    await this.waitForPageLoad();
  }

  /**
   * Check if dashboard has loaded correctly
   */
  async isDashboardLoaded() {
    const title = await this.page.locator(this.selectors.pageTitle).isVisible();
    return title;
  }
}

export default DashboardPage;
