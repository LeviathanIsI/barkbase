/**
 * Base Page Object
 * Foundation class for all page objects with common functionality
 */

export class BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Common selectors
    this.selectors = {
      // Navigation
      sidebar: '[data-testid="sidebar"], aside, nav[role="navigation"]',
      mainContent: 'main, [role="main"]',
      header: 'header, [role="banner"]',

      // Common UI elements
      loadingSpinner: '[data-testid="loading"], .loading, [role="progressbar"]',
      toast: '[role="alert"], .toast, [data-testid="toast"]',
      modal: '[role="dialog"], .modal, [data-testid="modal"]',
      modalClose: '[data-testid="modal-close"], button[aria-label="Close"]',

      // Form elements
      submitButton: 'button[type="submit"]',
      cancelButton: 'button[type="button"]:has-text("Cancel")',

      // Data display
      emptyState: '[data-testid="empty-state"], .empty-state',
      errorState: '[data-testid="error-state"], .error-state',
    };
  }

  /**
   * Navigate to a specific URL
   */
  async goto(path = '/') {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(500); // Small buffer for React rendering
  }

  /**
   * Wait for loading spinner to disappear
   */
  async waitForLoadingComplete() {
    const spinner = this.page.locator(this.selectors.loadingSpinner);
    if (await spinner.count() > 0) {
      await spinner.first().waitFor({ state: 'hidden', timeout: 30000 });
    }
  }

  /**
   * Wait for and get toast message
   */
  async getToastMessage(timeout = 5000) {
    const toast = this.page.locator(this.selectors.toast).first();
    await toast.waitFor({ state: 'visible', timeout });
    return toast.textContent();
  }

  /**
   * Wait for toast to appear with specific text
   */
  async expectToast(text, timeout = 5000) {
    const toast = this.page.locator(this.selectors.toast).filter({ hasText: text });
    await toast.waitFor({ state: 'visible', timeout });
  }

  /**
   * Close any open modal
   */
  async closeModal() {
    const closeButton = this.page.locator(this.selectors.modalClose).first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await this.page.locator(this.selectors.modal).waitFor({ state: 'hidden' });
    }
  }

  /**
   * Check if modal is open
   */
  async isModalOpen() {
    return this.page.locator(this.selectors.modal).isVisible();
  }

  /**
   * Get current page title
   */
  async getPageTitle() {
    return this.page.title();
  }

  /**
   * Get current URL
   */
  getCurrentUrl() {
    return this.page.url();
  }

  /**
   * Take a screenshot
   */
  async takeScreenshot(name) {
    await this.page.screenshot({
      path: `e2e/reports/screenshots/${name}-${Date.now()}.png`,
      fullPage: true,
    });
  }

  /**
   * Click element with retry
   */
  async clickWithRetry(selector, options = {}) {
    const { retries = 3, delay = 1000 } = options;

    for (let i = 0; i < retries; i++) {
      try {
        await this.page.locator(selector).first().click({ timeout: 5000 });
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.page.waitForTimeout(delay);
      }
    }
  }

  /**
   * Fill form field
   */
  async fillField(selector, value) {
    const field = this.page.locator(selector);
    await field.clear();
    await field.fill(value);
  }

  /**
   * Select option from dropdown
   */
  async selectOption(selector, value) {
    await this.page.locator(selector).selectOption(value);
  }

  /**
   * Check/uncheck checkbox
   */
  async setCheckbox(selector, checked) {
    const checkbox = this.page.locator(selector);
    const isChecked = await checkbox.isChecked();
    if (isChecked !== checked) {
      await checkbox.click();
    }
  }

  /**
   * Get table rows
   */
  async getTableRows(tableSelector = 'table tbody tr') {
    await this.page.locator(tableSelector).first().waitFor({ state: 'visible' });
    return this.page.locator(tableSelector).all();
  }

  /**
   * Get table data as array of objects
   */
  async getTableData(tableSelector = 'table') {
    const table = this.page.locator(tableSelector);
    const headers = await table.locator('thead th').allTextContents();
    const rows = await table.locator('tbody tr').all();

    const data = [];
    for (const row of rows) {
      const cells = await row.locator('td').allTextContents();
      const rowData = {};
      headers.forEach((header, i) => {
        rowData[header.trim()] = cells[i]?.trim() || '';
      });
      data.push(rowData);
    }

    return data;
  }

  /**
   * Scroll element into view
   */
  async scrollToElement(selector) {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Check if element exists
   */
  async elementExists(selector) {
    return (await this.page.locator(selector).count()) > 0;
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(selector, timeout = 10000) {
    await this.page.locator(selector).first().waitFor({ state: 'visible', timeout });
  }

  /**
   * Get all console errors
   */
  async getConsoleErrors() {
    const errors = [];
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  }
}

export default BasePage;
