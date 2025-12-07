/**
 * Pets Page Object
 * Handles pet management functionality
 */

import { BasePage } from './BasePage.js';

export class PetsPage extends BasePage {
  constructor(page) {
    super(page);

    this.url = '/pets';

    this.selectors = {
      ...this.selectors,
      // Page elements
      pageTitle: 'h1:has-text("Pets")',
      petsCount: '[data-testid="pets-count"]',

      // Actions
      addPetButton: 'button:has-text("Add Pet"), [data-testid="add-pet"]',
      exportButton: 'button:has-text("Export")',
      columnsButton: 'button:has-text("Columns")',
      filtersButton: 'button:has-text("Filters")',

      // Search
      searchInput: 'input[placeholder*="Search"], [data-testid="search-input"]',

      // Table
      petsTable: 'table',
      petRow: 'tbody tr',
      petName: 'td:first-child, [data-testid="pet-name"]',

      // Row actions
      viewProfileButton: 'button[aria-label="View profile"], button:has-text("View profile")',
      editButton: 'button[aria-label="Edit"], button:has-text("Edit")',
      deleteButton: 'button[aria-label="Delete"], button:has-text("Delete")',
      moreActionsButton: 'button[aria-label="More actions"]',

      // Filters
      speciesFilter: '[data-testid="species-filter"], select:has(option:has-text("Species"))',
      statusFilter: '[data-testid="status-filter"], select:has(option:has-text("Status"))',

      // Modal
      addPetModal: '[data-testid="add-pet-modal"], [role="dialog"]',
      petNameInput: 'input[name="name"], #pet-name',
      breedInput: 'input[name="breed"], #breed',
      speciesSelect: 'select[name="species"], #species',
      ownerSelect: 'select[name="owner"], #owner',
      saveButton: 'button[type="submit"], button:has-text("Save")',

      // Detail view
      petDetailPanel: '[data-testid="pet-detail"], .pet-detail',
      petDetailName: '[data-testid="pet-detail-name"]',

      // Stats
      totalPets: '[data-testid="total-pets"]',
      activePets: '[data-testid="active-pets"]',

      // Pagination
      pagination: '[data-testid="pagination"]',
      nextPage: 'button[aria-label="Next page"]',
      prevPage: 'button[aria-label="Previous page"]',
    };
  }

  /**
   * Navigate to pets page
   */
  async goto() {
    await super.goto(this.url);
    await this.waitForPetsLoad();
  }

  /**
   * Wait for pets page to load
   */
  async waitForPetsLoad() {
    await this.page.locator(this.selectors.pageTitle).waitFor({ state: 'visible' });
    await this.waitForLoadingComplete();
  }

  /**
   * Get total pet count
   */
  async getPetCount() {
    const countElement = this.page.locator(this.selectors.petsCount);
    if (await countElement.isVisible()) {
      const text = await countElement.textContent();
      return parseInt(text.match(/\d+/)?.[0] || '0');
    }
    return (await this.page.locator(this.selectors.petRow).count());
  }

  /**
   * Search for a pet
   */
  async searchPet(searchTerm) {
    await this.page.locator(this.selectors.searchInput).fill(searchTerm);
    await this.page.waitForTimeout(500); // Wait for debounce
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
   * Filter by species
   */
  async filterBySpecies(species) {
    await this.page.locator(this.selectors.speciesFilter).selectOption(species);
    await this.waitForLoadingComplete();
  }

  /**
   * Filter by status
   */
  async filterByStatus(status) {
    await this.page.locator(this.selectors.statusFilter).selectOption(status);
    await this.waitForLoadingComplete();
  }

  /**
   * Click add pet button
   */
  async clickAddPet() {
    await this.page.locator(this.selectors.addPetButton).click();
    await this.page.locator(this.selectors.addPetModal).waitFor({ state: 'visible' });
  }

  /**
   * Add a new pet
   */
  async addPet(petData) {
    await this.clickAddPet();

    if (petData.name) {
      await this.page.locator(this.selectors.petNameInput).fill(petData.name);
    }
    if (petData.breed) {
      await this.page.locator(this.selectors.breedInput).fill(petData.breed);
    }
    if (petData.species) {
      await this.page.locator(this.selectors.speciesSelect).selectOption(petData.species);
    }
    if (petData.ownerId) {
      await this.page.locator(this.selectors.ownerSelect).selectOption(petData.ownerId);
    }

    await this.page.locator(this.selectors.saveButton).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Get pet row by name
   */
  async getPetRow(petName) {
    return this.page.locator(`${this.selectors.petRow}:has-text("${petName}")`);
  }

  /**
   * View pet profile by name
   */
  async viewPetProfile(petName) {
    const row = await this.getPetRow(petName);
    await row.locator(this.selectors.viewProfileButton).click();
    await this.page.waitForURL(/\/pets\/[a-z0-9-]+/);
  }

  /**
   * Edit pet by name
   */
  async editPet(petName) {
    const row = await this.getPetRow(petName);
    await row.locator(this.selectors.editButton).click();
    await this.page.locator(this.selectors.addPetModal).waitFor({ state: 'visible' });
  }

  /**
   * Delete pet by name
   */
  async deletePet(petName) {
    const row = await this.getPetRow(petName);
    await row.locator(this.selectors.moreActionsButton).click();
    await this.page.locator('button:has-text("Delete"), [data-testid="delete-action"]').click();

    // Confirm deletion
    await this.page.locator('button:has-text("Confirm"), button:has-text("Delete")').click();
    await this.waitForLoadingComplete();
  }

  /**
   * Get all pet names
   */
  async getAllPetNames() {
    const rows = await this.page.locator(this.selectors.petRow).all();
    const names = [];

    for (const row of rows) {
      const name = await row.locator(this.selectors.petName).textContent();
      if (name) names.push(name.trim());
    }

    return names;
  }

  /**
   * Get pets table data
   */
  async getPetsTableData() {
    return this.getTableData(this.selectors.petsTable);
  }

  /**
   * Check if pet exists
   */
  async petExists(petName) {
    const row = await this.getPetRow(petName);
    return (await row.count()) > 0;
  }

  /**
   * Go to next page
   */
  async nextPage() {
    const nextButton = this.page.locator(this.selectors.nextPage);
    if (await nextButton.isEnabled()) {
      await nextButton.click();
      await this.waitForLoadingComplete();
      return true;
    }
    return false;
  }

  /**
   * Go to previous page
   */
  async previousPage() {
    const prevButton = this.page.locator(this.selectors.prevPage);
    if (await prevButton.isEnabled()) {
      await prevButton.click();
      await this.waitForLoadingComplete();
      return true;
    }
    return false;
  }

  /**
   * Select a pet row
   */
  async selectPet(petName) {
    const row = await this.getPetRow(petName);
    await row.locator('input[type="checkbox"]').check();
  }

  /**
   * Bulk select all pets
   */
  async selectAllPets() {
    await this.page.locator('thead input[type="checkbox"]').check();
  }
}

export default PetsPage;
