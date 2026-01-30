/**
 * Invoices Page Object
 * Handles invoice management functionality
 */

import { BasePage } from './BasePage.js';

export class InvoicesPage extends BasePage {
  constructor(page) {
    super(page);

    this.url = '/invoices';

    this.selectors = {
      ...this.selectors,
      // Page elements
      pageTitle: 'h1:has-text("Invoices")',
      invoicesCount: '[data-testid="invoices-count"]',

      // Actions
      newInvoiceButton: 'button:has-text("New Invoice"), button:has-text("Create Invoice"), [data-testid="new-invoice"]',
      exportButton: 'button:has-text("Export")',
      filterButton: 'button:has-text("Filter")',

      // Search
      searchInput: 'input[placeholder*="Search"], [data-testid="search-input"]',

      // Table/List
      invoicesTable: 'table',
      invoiceRow: 'tbody tr',
      invoiceCard: '[data-testid="invoice-card"]',

      // Invoice details in list
      invoiceNumber: '[data-testid="invoice-number"]',
      invoiceCustomer: '[data-testid="invoice-customer"]',
      invoiceAmount: '[data-testid="invoice-amount"]',
      invoiceStatus: '[data-testid="invoice-status"]',
      invoiceDate: '[data-testid="invoice-date"]',
      invoiceDueDate: '[data-testid="invoice-due-date"]',

      // Status filters
      statusAll: 'button:has-text("All")',
      statusDraft: 'button:has-text("Draft")',
      statusSent: 'button:has-text("Sent")',
      statusPaid: 'button:has-text("Paid")',
      statusOverdue: 'button:has-text("Overdue")',
      statusVoid: 'button:has-text("Void")',

      // Row actions
      viewButton: 'button[aria-label="View"], button:has-text("View")',
      editButton: 'button[aria-label="Edit"], button:has-text("Edit")',
      sendButton: 'button:has-text("Send")',
      voidButton: 'button:has-text("Void")',
      downloadButton: 'button:has-text("Download"), button[aria-label="Download"]',
      duplicateButton: 'button:has-text("Duplicate")',
      moreActionsButton: 'button[aria-label="More actions"]',

      // Create/Edit Invoice Modal
      invoiceModal: '[data-testid="invoice-modal"], [role="dialog"]',
      customerSelect: 'select[name="customerId"], #customerId',
      customerSearch: 'input[name="customerSearch"], input[placeholder*="Search customer"]',

      // Invoice details form
      invoiceNumber: 'input[name="invoiceNumber"], #invoiceNumber',
      invoiceDate: 'input[name="invoiceDate"], #invoiceDate',
      dueDate: 'input[name="dueDate"], #dueDate',
      poNumber: 'input[name="poNumber"], #poNumber',

      // Line items
      lineItemsContainer: '[data-testid="line-items"], .line-items',
      addLineItemButton: 'button:has-text("Add Line Item"), button:has-text("Add Item")',
      lineItemRow: '[data-testid="line-item"]',

      lineItemDescription: 'input[name*="description"], textarea[name*="description"]',
      lineItemQuantity: 'input[name*="quantity"]',
      lineItemRate: 'input[name*="rate"], input[name*="price"]',
      lineItemAmount: '[data-testid*="amount"]',
      removeLineItemButton: 'button[aria-label="Remove"], button:has-text("Remove")',

      // From booking
      fromBookingButton: 'button:has-text("From Booking")',
      bookingSelect: 'select[name="bookingId"], #bookingId',

      // Totals
      subtotal: '[data-testid="subtotal"]',
      taxRate: 'input[name="taxRate"], #taxRate',
      taxAmount: '[data-testid="tax-amount"]',
      discountInput: 'input[name="discount"], #discount',
      discountAmount: '[data-testid="discount-amount"]',
      total: '[data-testid="total"]',

      // Notes
      notesInput: 'textarea[name="notes"], #notes',
      termsInput: 'textarea[name="terms"], #terms',

      // Actions in modal
      saveButton: 'button[type="submit"], button:has-text("Save")',
      saveDraftButton: 'button:has-text("Save as Draft")',
      sendInvoiceButton: 'button:has-text("Send Invoice")',
      cancelButton: 'button[type="button"]:has-text("Cancel")',

      // Invoice detail view
      invoiceDetail: '[data-testid="invoice-detail"]',
      invoiceHeader: '[data-testid="invoice-header"]',
      invoiceLineItems: '[data-testid="invoice-line-items"]',
      invoiceTotal: '[data-testid="invoice-total"]',

      // Send modal
      sendModal: '[data-testid="send-modal"], [role="dialog"]:has-text("Send")',
      recipientEmail: 'input[name="email"], input[type="email"]',
      emailSubject: 'input[name="subject"]',
      emailMessage: 'textarea[name="message"]',
      sendEmailButton: 'button:has-text("Send Email")',

      // Payment tracking
      recordPaymentButton: 'button:has-text("Record Payment")',
      paymentAmount: 'input[name="paymentAmount"]',
      paymentDate: 'input[name="paymentDate"]',
      paymentMethod: 'select[name="paymentMethod"]',

      // Pagination
      pagination: '[data-testid="pagination"]',
    };
  }

  /**
   * Navigate to invoices page
   */
  async goto() {
    await super.goto(this.url);
    await this.waitForInvoicesLoad();
  }

  /**
   * Wait for invoices page to load
   */
  async waitForInvoicesLoad() {
    await this.page.locator(this.selectors.pageTitle).waitFor({ state: 'visible' });
    await this.waitForLoadingComplete();
  }

  /**
   * Click new invoice button
   */
  async clickNewInvoice() {
    await this.page.locator(this.selectors.newInvoiceButton).click();
    await this.page.locator(this.selectors.invoiceModal).waitFor({ state: 'visible' });
  }

  /**
   * Create invoice from booking
   */
  async createInvoiceFromBooking(bookingId) {
    await this.clickNewInvoice();

    const fromBookingButton = this.page.locator(this.selectors.fromBookingButton);
    if (await fromBookingButton.isVisible()) {
      await fromBookingButton.click();
      await this.page.locator(this.selectors.bookingSelect).selectOption(bookingId);
      await this.waitForLoadingComplete();
    }
  }

  /**
   * Fill invoice form
   */
  async fillInvoiceForm(invoiceData) {
    await this.waitForLoadingComplete();

    // Customer
    if (invoiceData.customerId) {
      const customerSelect = this.page.locator(this.selectors.customerSelect);
      if (await customerSelect.isVisible()) {
        await customerSelect.selectOption(invoiceData.customerId);
      }
    }

    // Invoice number (may be auto-generated)
    if (invoiceData.invoiceNumber) {
      const numberInput = this.page.locator(this.selectors.invoiceNumber);
      if (await numberInput.isVisible() && !await numberInput.isDisabled()) {
        await numberInput.clear();
        await numberInput.fill(invoiceData.invoiceNumber);
      }
    }

    // Invoice date
    if (invoiceData.invoiceDate) {
      await this.page.locator(this.selectors.invoiceDate).fill(invoiceData.invoiceDate);
    }

    // Due date
    if (invoiceData.dueDate) {
      await this.page.locator(this.selectors.dueDate).fill(invoiceData.dueDate);
    }

    // PO number
    if (invoiceData.poNumber) {
      const poInput = this.page.locator(this.selectors.poNumber);
      if (await poInput.isVisible()) {
        await poInput.fill(invoiceData.poNumber);
      }
    }

    // Line items
    if (invoiceData.lineItems && invoiceData.lineItems.length > 0) {
      await this.addLineItems(invoiceData.lineItems);
    }

    // Tax rate
    if (invoiceData.taxRate) {
      const taxRateInput = this.page.locator(this.selectors.taxRate);
      if (await taxRateInput.isVisible()) {
        await taxRateInput.clear();
        await taxRateInput.fill(invoiceData.taxRate.toString());
      }
    }

    // Discount
    if (invoiceData.discount) {
      const discountInput = this.page.locator(this.selectors.discountInput);
      if (await discountInput.isVisible()) {
        await discountInput.clear();
        await discountInput.fill(invoiceData.discount.toString());
      }
    }

    // Notes
    if (invoiceData.notes) {
      const notesInput = this.page.locator(this.selectors.notesInput);
      if (await notesInput.isVisible()) {
        await notesInput.clear();
        await notesInput.fill(invoiceData.notes);
      }
    }

    // Terms
    if (invoiceData.terms) {
      const termsInput = this.page.locator(this.selectors.termsInput);
      if (await termsInput.isVisible()) {
        await termsInput.clear();
        await termsInput.fill(invoiceData.terms);
      }
    }
  }

  /**
   * Add line items to invoice
   */
  async addLineItems(lineItems) {
    for (const item of lineItems) {
      await this.page.locator(this.selectors.addLineItemButton).click();
      await this.page.waitForTimeout(300);

      const lineItemRows = await this.page.locator(this.selectors.lineItemRow).all();
      const lastRow = lineItemRows[lineItemRows.length - 1];

      if (item.description) {
        await lastRow.locator(this.selectors.lineItemDescription).fill(item.description);
      }

      if (item.quantity) {
        await lastRow.locator(this.selectors.lineItemQuantity).fill(item.quantity.toString());
      }

      if (item.rate) {
        await lastRow.locator(this.selectors.lineItemRate).fill(item.rate.toString());
      }

      await this.page.waitForTimeout(200);
    }
  }

  /**
   * Save invoice
   */
  async saveInvoice() {
    await this.page.locator(this.selectors.saveButton).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Save invoice as draft
   */
  async saveDraft() {
    const draftButton = this.page.locator(this.selectors.saveDraftButton);
    if (await draftButton.isVisible()) {
      await draftButton.click();
    } else {
      await this.saveInvoice();
    }
    await this.waitForLoadingComplete();
  }

  /**
   * Send invoice
   */
  async sendInvoice(emailData) {
    await this.page.locator(this.selectors.sendInvoiceButton).click();
    await this.page.locator(this.selectors.sendModal).waitFor({ state: 'visible' });

    if (emailData.email) {
      await this.page.locator(this.selectors.recipientEmail).fill(emailData.email);
    }

    if (emailData.subject) {
      await this.page.locator(this.selectors.emailSubject).fill(emailData.subject);
    }

    if (emailData.message) {
      await this.page.locator(this.selectors.emailMessage).fill(emailData.message);
    }

    await this.page.locator(this.selectors.sendEmailButton).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Create complete invoice
   */
  async createInvoice(invoiceData) {
    await this.clickNewInvoice();
    await this.fillInvoiceForm(invoiceData);
    await this.saveInvoice();
  }

  /**
   * Search invoices
   */
  async searchInvoice(searchTerm) {
    await this.page.locator(this.selectors.searchInput).fill(searchTerm);
    await this.page.waitForTimeout(500);
    await this.waitForLoadingComplete();
  }

  /**
   * Filter by status
   */
  async filterByStatus(status) {
    const statusSelectors = {
      all: this.selectors.statusAll,
      draft: this.selectors.statusDraft,
      sent: this.selectors.statusSent,
      paid: this.selectors.statusPaid,
      overdue: this.selectors.statusOverdue,
      void: this.selectors.statusVoid,
    };

    await this.page.locator(statusSelectors[status.toLowerCase()]).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Get invoice by number
   */
  async getInvoiceRow(invoiceNumber) {
    return this.page.locator(`${this.selectors.invoiceRow}:has-text("${invoiceNumber}")`);
  }

  /**
   * View invoice detail
   */
  async viewInvoice(invoiceNumber) {
    const row = await this.getInvoiceRow(invoiceNumber);
    await row.locator(this.selectors.viewButton).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Void invoice
   */
  async voidInvoice(invoiceNumber) {
    const row = await this.getInvoiceRow(invoiceNumber);
    await row.locator(this.selectors.moreActionsButton).click();
    await this.page.locator(this.selectors.voidButton).click();

    // Confirm void
    await this.page.locator('button:has-text("Confirm"), button:has-text("Void")').last().click();
    await this.waitForLoadingComplete();
  }

  /**
   * Download invoice
   */
  async downloadInvoice(invoiceNumber) {
    const row = await this.getInvoiceRow(invoiceNumber);
    await row.locator(this.selectors.downloadButton).click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Get invoice total
   */
  async getInvoiceTotal() {
    const totalElement = this.page.locator(this.selectors.total);
    await totalElement.waitFor({ state: 'visible' });
    const text = await totalElement.textContent();
    const match = text.match(/[\d,.]+/);
    return match ? parseFloat(match[0].replace(',', '')) : 0;
  }

  /**
   * Get calculated subtotal
   */
  async getSubtotal() {
    const subtotalElement = this.page.locator(this.selectors.subtotal);
    if (await subtotalElement.isVisible()) {
      const text = await subtotalElement.textContent();
      const match = text.match(/[\d,.]+/);
      return match ? parseFloat(match[0].replace(',', '')) : 0;
    }
    return 0;
  }

  /**
   * Record payment for invoice
   */
  async recordPayment(paymentData) {
    await this.page.locator(this.selectors.recordPaymentButton).click();
    await this.page.waitForTimeout(300);

    if (paymentData.amount) {
      await this.page.locator(this.selectors.paymentAmount).fill(paymentData.amount.toString());
    }

    if (paymentData.date) {
      await this.page.locator(this.selectors.paymentDate).fill(paymentData.date);
    }

    if (paymentData.method) {
      await this.page.locator(this.selectors.paymentMethod).selectOption(paymentData.method);
    }

    await this.page.locator('button:has-text("Record"), button[type="submit"]').click();
    await this.waitForLoadingComplete();
  }

  /**
   * Get invoice count
   */
  async getInvoiceCount() {
    return this.page.locator(this.selectors.invoiceRow).count();
  }

  /**
   * Verify invoice line items are correct
   */
  async verifyLineItems(expectedItems) {
    const rows = await this.page.locator(this.selectors.lineItemRow).all();

    if (rows.length !== expectedItems.length) {
      return false;
    }

    for (let i = 0; i < expectedItems.length; i++) {
      const row = rows[i];
      const expected = expectedItems[i];

      if (expected.description) {
        const description = await row.locator(this.selectors.lineItemDescription).inputValue();
        if (!description.includes(expected.description)) {
          return false;
        }
      }

      if (expected.quantity) {
        const quantity = await row.locator(this.selectors.lineItemQuantity).inputValue();
        if (parseFloat(quantity) !== expected.quantity) {
          return false;
        }
      }

      if (expected.rate) {
        const rate = await row.locator(this.selectors.lineItemRate).inputValue();
        if (parseFloat(rate) !== expected.rate) {
          return false;
        }
      }
    }

    return true;
  }
}

export default InvoicesPage;
