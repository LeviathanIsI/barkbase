/**
 * Owners Page Object
 * Handles owner/customer management functionality
 */

import { BasePage } from './BasePage.js';

export class OwnersPage extends BasePage {
  constructor(page) {
    super(page);

    this.url = '/owners';

    this.selectors = {
      ...this.selectors,
      // Page elements
      pageTitle: 'h1:has-text("Owners"), h1:has-text("Customers")',
      ownersCount: '[data-testid="owners-count"]',

      // Actions
      addOwnerButton: 'button:has-text("Add Owner"), button:has-text("Add Customer"), [data-testid="add-owner"]',
      exportButton: 'button:has-text("Export")',
      importButton: 'button:has-text("Import")',

      // Search
      searchInput: 'input[placeholder*="Search"], [data-testid="search-input"]',

      // Table/List
      ownersTable: 'table',
      ownerRow: 'tbody tr',
      ownerCard: '[data-testid="owner-card"]',
      ownerName: 'td:first-child, [data-testid="owner-name"]',

      // Row actions
      viewProfileButton: 'button[aria-label="View profile"], button:has-text("View")',
      editButton: 'button[aria-label="Edit"], button:has-text("Edit")',
      deleteButton: 'button[aria-label="Delete"], button:has-text("Delete")',
      moreActionsButton: 'button[aria-label="More actions"]',

      // Filters
      statusFilter: '[data-testid="status-filter"]',
      sortBy: '[data-testid="sort-by"]',

      // Add/Edit Modal
      ownerModal: '[data-testid="owner-modal"], [role="dialog"]',
      firstNameInput: 'input[name="firstName"], #firstName',
      lastNameInput: 'input[name="lastName"], #lastName',
      emailInput: 'input[name="email"], #email, input[type="email"]',
      phoneInput: 'input[name="phone"], #phone, input[type="tel"]',
      addressInput: 'input[name="address"], #address, textarea[name="address"]',
      notesInput: 'textarea[name="notes"], #notes',
      saveButton: 'button[type="submit"], button:has-text("Save")',

      // Detail view
      ownerDetailPanel: '[data-testid="owner-detail"]',
      ownerDetailName: '[data-testid="owner-detail-name"]',
      petsList: '[data-testid="owner-pets-list"]',
      bookingsList: '[data-testid="owner-bookings-list"]',

      // Tabs in detail view
      overviewTab: 'button:has-text("Overview")',
      petsTab: 'button:has-text("Pets")',
      bookingsTab: 'button:has-text("Bookings")',
      billingTab: 'button:has-text("Billing")',

      // Pagination
      pagination: '[data-testid="pagination"]',
    };
  }

  /**
   * Navigate to owners page
   */
  async goto() {
    await super.goto(this.url);
    await this.waitForOwnersLoad();
  }

  /**
   * Wait for owners page to load
   */
  async waitForOwnersLoad() {
    await this.page.locator(this.selectors.pageTitle).waitFor({ state: 'visible' });
    await this.waitForLoadingComplete();
  }

  /**
   * Get total owner count
   */
  async getOwnerCount() {
    const countElement = this.page.locator(this.selectors.ownersCount);
    if (await countElement.isVisible()) {
      const text = await countElement.textContent();
      return parseInt(text.match(/\d+/)?.[0] || '0');
    }
    return (await this.page.locator(this.selectors.ownerRow).count());
  }

  /**
   * Search for an owner
   */
  async searchOwner(searchTerm) {
    await this.page.locator(this.selectors.searchInput).fill(searchTerm);
    await this.page.waitForTimeout(500);
    await this.waitForLoadingComplete();
  }

  /**
   * Clear search
   */
  async clearSearch() {
    await this.page.locator(this.selectors.searchInput).clear();
    await this.waitForLoadingComplete();
  }

  /**
   * Click add owner button
   */
  async clickAddOwner() {
    await this.page.locator(this.selectors.addOwnerButton).click();
    await this.page.locator(this.selectors.ownerModal).waitFor({ state: 'visible' });
  }

  /**
   * Add a new owner
   */
  async addOwner(ownerData) {
    await this.clickAddOwner();

    if (ownerData.firstName) {
      await this.page.locator(this.selectors.firstNameInput).fill(ownerData.firstName);
    }
    if (ownerData.lastName) {
      await this.page.locator(this.selectors.lastNameInput).fill(ownerData.lastName);
    }
    if (ownerData.email) {
      await this.page.locator(this.selectors.emailInput).fill(ownerData.email);
    }
    if (ownerData.phone) {
      await this.page.locator(this.selectors.phoneInput).fill(ownerData.phone);
    }
    if (ownerData.address) {
      await this.page.locator(this.selectors.addressInput).fill(ownerData.address);
    }
    if (ownerData.notes) {
      await this.page.locator(this.selectors.notesInput).fill(ownerData.notes);
    }

    await this.page.locator(this.selectors.saveButton).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Get owner row by name
   */
  async getOwnerRow(ownerName) {
    return this.page.locator(`${this.selectors.ownerRow}:has-text("${ownerName}")`);
  }

  /**
   * View owner profile by name
   */
  async viewOwnerProfile(ownerName) {
    const row = await this.getOwnerRow(ownerName);
    await row.locator(this.selectors.viewProfileButton).click();
    await this.page.waitForURL(/\/customers\/[a-z0-9-]+/);
  }

  /**
   * Edit owner by name
   */
  async editOwner(ownerName) {
    const row = await this.getOwnerRow(ownerName);
    await row.locator(this.selectors.editButton).click();
    await this.page.locator(this.selectors.ownerModal).waitFor({ state: 'visible' });
  }

  /**
   * Delete owner by name
   */
  async deleteOwner(ownerName) {
    const row = await this.getOwnerRow(ownerName);
    await row.locator(this.selectors.moreActionsButton).click();
    await this.page.locator('button:has-text("Delete")').click();

    // Confirm deletion
    await this.page.locator('button:has-text("Confirm"), button:has-text("Delete")').click();
    await this.waitForLoadingComplete();
  }

  /**
   * Get all owner names
   */
  async getAllOwnerNames() {
    const rows = await this.page.locator(this.selectors.ownerRow).all();
    const names = [];

    for (const row of rows) {
      const name = await row.locator(this.selectors.ownerName).textContent();
      if (name) names.push(name.trim());
    }

    return names;
  }

  /**
   * Check if owner exists
   */
  async ownerExists(ownerName) {
    const row = await this.getOwnerRow(ownerName);
    return (await row.count()) > 0;
  }

  /**
   * Switch to tab in detail view
   */
  async switchToTab(tabName) {
    const tabSelector = {
      overview: this.selectors.overviewTab,
      pets: this.selectors.petsTab,
      bookings: this.selectors.bookingsTab,
      billing: this.selectors.billingTab,
    };

    await this.page.locator(tabSelector[tabName.toLowerCase()]).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Get owner's pets from detail view
   */
  async getOwnerPets() {
    await this.switchToTab('pets');
    const petElements = await this.page.locator(`${this.selectors.petsList} [data-testid="pet-item"]`).all();
    const pets = [];

    for (const pet of petElements) {
      pets.push({
        name: await pet.locator('[data-testid="pet-name"]').textContent(),
        breed: await pet.locator('[data-testid="pet-breed"]').textContent(),
      });
    }

    return pets;
  }

  /**
   * Get owner's bookings from detail view
   */
  async getOwnerBookings() {
    await this.switchToTab('bookings');
    const bookingElements = await this.page.locator(`${this.selectors.bookingsList} [data-testid="booking-item"]`).all();
    const bookings = [];

    for (const booking of bookingElements) {
      bookings.push({
        date: await booking.locator('[data-testid="booking-date"]').textContent(),
        status: await booking.locator('[data-testid="booking-status"]').textContent(),
      });
    }

    return bookings;
  }
}

export default OwnersPage;
