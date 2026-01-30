/**
 * Payments Page Object
 * Handles payment processing and history
 */

import { BasePage } from './BasePage.js';

export class PaymentsPage extends BasePage {
  constructor(page) {
    super(page);

    this.url = '/payments';

    this.selectors = {
      ...this.selectors,
      // Page elements
      pageTitle: 'h1:has-text("Payments")',
      paymentsCount: '[data-testid="payments-count"]',

      // Actions
      newPaymentButton: 'button:has-text("New Payment"), button:has-text("Record Payment"), [data-testid="new-payment"]',
      exportButton: 'button:has-text("Export")',
      filterButton: 'button:has-text("Filter")',

      // Search
      searchInput: 'input[placeholder*="Search"], [data-testid="search-input"]',

      // Table/List
      paymentsTable: 'table',
      paymentRow: 'tbody tr',
      paymentCard: '[data-testid="payment-card"]',

      // Payment details in list
      paymentId: '[data-testid="payment-id"]',
      paymentCustomer: '[data-testid="payment-customer"]',
      paymentAmount: '[data-testid="payment-amount"]',
      paymentMethod: '[data-testid="payment-method"]',
      paymentStatus: '[data-testid="payment-status"]',
      paymentDate: '[data-testid="payment-date"]',
      paymentInvoice: '[data-testid="payment-invoice"]',

      // Status filters
      statusAll: 'button:has-text("All")',
      statusCompleted: 'button:has-text("Completed")',
      statusPending: 'button:has-text("Pending")',
      statusFailed: 'button:has-text("Failed")',
      statusRefunded: 'button:has-text("Refunded")',

      // Payment method filters
      methodAll: 'button:has-text("All Methods")',
      methodCash: 'button:has-text("Cash")',
      methodCard: 'button:has-text("Card")',
      methodCheck: 'button:has-text("Check")',
      methodBankTransfer: 'button:has-text("Bank Transfer")',

      // Row actions
      viewButton: 'button[aria-label="View"], button:has-text("View")',
      receiptButton: 'button:has-text("Receipt"), button[aria-label="Download receipt"]',
      refundButton: 'button:has-text("Refund")',
      moreActionsButton: 'button[aria-label="More actions"]',

      // Create/Edit Payment Modal
      paymentModal: '[data-testid="payment-modal"], [role="dialog"]',

      // Payment form fields
      customerSelect: 'select[name="customerId"], #customerId',
      customerSearch: 'input[name="customerSearch"], input[placeholder*="Search customer"]',
      invoiceSelect: 'select[name="invoiceId"], #invoiceId',

      amountInput: 'input[name="amount"], #amount',
      paymentDateInput: 'input[name="paymentDate"], #paymentDate, input[type="date"]',
      paymentMethodSelect: 'select[name="paymentMethod"], #paymentMethod',

      // Payment method specific fields
      checkNumber: 'input[name="checkNumber"], #checkNumber',
      transactionId: 'input[name="transactionId"], #transactionId',
      cardLast4: 'input[name="cardLast4"], #cardLast4',

      notesInput: 'textarea[name="notes"], #notes',
      referenceInput: 'input[name="reference"], #reference',

      // Split payment
      splitPaymentCheckbox: 'input[type="checkbox"][name="splitPayment"], #splitPayment',
      addPaymentMethodButton: 'button:has-text("Add Payment Method")',

      // Actions in modal
      saveButton: 'button[type="submit"], button:has-text("Save"), button:has-text("Process")',
      cancelButton: 'button[type="button"]:has-text("Cancel")',

      // Payment detail view
      paymentDetail: '[data-testid="payment-detail"]',
      paymentHeader: '[data-testid="payment-header"]',
      paymentInfo: '[data-testid="payment-info"]',
      relatedInvoice: '[data-testid="related-invoice"]',

      // Refund modal
      refundModal: '[data-testid="refund-modal"], [role="dialog"]:has-text("Refund")',
      refundAmount: 'input[name="refundAmount"]',
      refundReason: 'textarea[name="refundReason"]',
      processRefundButton: 'button:has-text("Process Refund")',

      // Receipt
      receiptModal: '[data-testid="receipt-modal"], [role="dialog"]:has-text("Receipt")',
      downloadReceiptButton: 'button:has-text("Download")',
      emailReceiptButton: 'button:has-text("Email")',
      printReceiptButton: 'button:has-text("Print")',

      // Summary/Stats
      totalCollected: '[data-testid="total-collected"]',
      totalPending: '[data-testid="total-pending"]',
      totalRefunded: '[data-testid="total-refunded"]',

      // Date range filter
      dateFromInput: 'input[name="dateFrom"], #dateFrom',
      dateToInput: 'input[name="dateTo"], #dateTo',
      applyDateFilter: 'button:has-text("Apply")',

      // Pagination
      pagination: '[data-testid="pagination"]',
    };
  }

  /**
   * Navigate to payments page
   */
  async goto() {
    await super.goto(this.url);
    await this.waitForPaymentsLoad();
  }

  /**
   * Wait for payments page to load
   */
  async waitForPaymentsLoad() {
    await this.page.locator(this.selectors.pageTitle).waitFor({ state: 'visible' });
    await this.waitForLoadingComplete();
  }

  /**
   * Click new payment button
   */
  async clickNewPayment() {
    await this.page.locator(this.selectors.newPaymentButton).click();
    await this.page.locator(this.selectors.paymentModal).waitFor({ state: 'visible' });
  }

  /**
   * Fill payment form
   */
  async fillPaymentForm(paymentData) {
    await this.waitForLoadingComplete();

    // Customer
    if (paymentData.customerId) {
      const customerSelect = this.page.locator(this.selectors.customerSelect);
      if (await customerSelect.isVisible()) {
        await customerSelect.selectOption(paymentData.customerId);
        await this.page.waitForTimeout(300);
      }
    }

    // Invoice (if paying against specific invoice)
    if (paymentData.invoiceId) {
      const invoiceSelect = this.page.locator(this.selectors.invoiceSelect);
      if (await invoiceSelect.isVisible()) {
        await invoiceSelect.selectOption(paymentData.invoiceId);
        await this.page.waitForTimeout(300);
      }
    }

    // Amount
    if (paymentData.amount) {
      const amountInput = this.page.locator(this.selectors.amountInput);
      await amountInput.clear();
      await amountInput.fill(paymentData.amount.toString());
    }

    // Payment date
    if (paymentData.paymentDate) {
      await this.page.locator(this.selectors.paymentDateInput).fill(paymentData.paymentDate);
    }

    // Payment method
    if (paymentData.paymentMethod) {
      await this.page.locator(this.selectors.paymentMethodSelect).selectOption(paymentData.paymentMethod);
      await this.page.waitForTimeout(300);
    }

    // Method-specific fields
    if (paymentData.checkNumber) {
      const checkNumberInput = this.page.locator(this.selectors.checkNumber);
      if (await checkNumberInput.isVisible()) {
        await checkNumberInput.fill(paymentData.checkNumber);
      }
    }

    if (paymentData.transactionId) {
      const transactionIdInput = this.page.locator(this.selectors.transactionId);
      if (await transactionIdInput.isVisible()) {
        await transactionIdInput.fill(paymentData.transactionId);
      }
    }

    if (paymentData.cardLast4) {
      const cardLast4Input = this.page.locator(this.selectors.cardLast4);
      if (await cardLast4Input.isVisible()) {
        await cardLast4Input.fill(paymentData.cardLast4);
      }
    }

    // Reference
    if (paymentData.reference) {
      const referenceInput = this.page.locator(this.selectors.referenceInput);
      if (await referenceInput.isVisible()) {
        await referenceInput.fill(paymentData.reference);
      }
    }

    // Notes
    if (paymentData.notes) {
      const notesInput = this.page.locator(this.selectors.notesInput);
      if (await notesInput.isVisible()) {
        await notesInput.clear();
        await notesInput.fill(paymentData.notes);
      }
    }
  }

  /**
   * Save payment
   */
  async savePayment() {
    await this.page.locator(this.selectors.saveButton).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Process payment from invoice
   */
  async processPaymentFromInvoice(invoiceId, paymentData) {
    await this.clickNewPayment();

    // Select invoice
    const invoiceSelect = this.page.locator(this.selectors.invoiceSelect);
    if (await invoiceSelect.isVisible()) {
      await invoiceSelect.selectOption(invoiceId);
      await this.page.waitForTimeout(500);
    }

    // Fill payment details
    await this.fillPaymentForm(paymentData);
    await this.savePayment();
  }

  /**
   * Create complete payment
   */
  async createPayment(paymentData) {
    await this.clickNewPayment();
    await this.fillPaymentForm(paymentData);
    await this.savePayment();
  }

  /**
   * Search payments
   */
  async searchPayment(searchTerm) {
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
      completed: this.selectors.statusCompleted,
      pending: this.selectors.statusPending,
      failed: this.selectors.statusFailed,
      refunded: this.selectors.statusRefunded,
    };

    await this.page.locator(statusSelectors[status.toLowerCase()]).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Filter by payment method
   */
  async filterByMethod(method) {
    const methodSelectors = {
      all: this.selectors.methodAll,
      cash: this.selectors.methodCash,
      card: this.selectors.methodCard,
      check: this.selectors.methodCheck,
      'bank transfer': this.selectors.methodBankTransfer,
    };

    await this.page.locator(methodSelectors[method.toLowerCase()]).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Filter by date range
   */
  async filterByDateRange(dateFrom, dateTo) {
    if (dateFrom) {
      await this.page.locator(this.selectors.dateFromInput).fill(dateFrom);
    }

    if (dateTo) {
      await this.page.locator(this.selectors.dateToInput).fill(dateTo);
    }

    await this.page.locator(this.selectors.applyDateFilter).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Get payment row by ID or customer name
   */
  async getPaymentRow(identifier) {
    return this.page.locator(`${this.selectors.paymentRow}:has-text("${identifier}")`);
  }

  /**
   * View payment detail
   */
  async viewPayment(identifier) {
    const row = await this.getPaymentRow(identifier);
    await row.locator(this.selectors.viewButton).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Download receipt
   */
  async downloadReceipt(identifier) {
    const row = await this.getPaymentRow(identifier);
    await row.locator(this.selectors.receiptButton).click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Refund payment
   */
  async refundPayment(identifier, refundData) {
    const row = await this.getPaymentRow(identifier);
    await row.locator(this.selectors.moreActionsButton).click();
    await this.page.locator(this.selectors.refundButton).click();
    await this.page.locator(this.selectors.refundModal).waitFor({ state: 'visible' });

    if (refundData.amount) {
      await this.page.locator(this.selectors.refundAmount).fill(refundData.amount.toString());
    }

    if (refundData.reason) {
      await this.page.locator(this.selectors.refundReason).fill(refundData.reason);
    }

    await this.page.locator(this.selectors.processRefundButton).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Get payment count
   */
  async getPaymentCount() {
    return this.page.locator(this.selectors.paymentRow).count();
  }

  /**
   * Get total collected amount
   */
  async getTotalCollected() {
    const totalElement = this.page.locator(this.selectors.totalCollected);
    if (await totalElement.isVisible()) {
      const text = await totalElement.textContent();
      const match = text.match(/[\d,.]+/);
      return match ? parseFloat(match[0].replace(',', '')) : 0;
    }
    return 0;
  }

  /**
   * Get payment summary stats
   */
  async getPaymentSummary() {
    const summary = {};

    const collectedElement = this.page.locator(this.selectors.totalCollected);
    if (await collectedElement.isVisible()) {
      const text = await collectedElement.textContent();
      const match = text.match(/[\d,.]+/);
      summary.collected = match ? parseFloat(match[0].replace(',', '')) : 0;
    }

    const pendingElement = this.page.locator(this.selectors.totalPending);
    if (await pendingElement.isVisible()) {
      const text = await pendingElement.textContent();
      const match = text.match(/[\d,.]+/);
      summary.pending = match ? parseFloat(match[0].replace(',', '')) : 0;
    }

    const refundedElement = this.page.locator(this.selectors.totalRefunded);
    if (await refundedElement.isVisible()) {
      const text = await refundedElement.textContent();
      const match = text.match(/[\d,.]+/);
      summary.refunded = match ? parseFloat(match[0].replace(',', '')) : 0;
    }

    return summary;
  }

  /**
   * Email receipt
   */
  async emailReceipt(identifier, emailAddress) {
    const row = await this.getPaymentRow(identifier);
    await row.locator(this.selectors.receiptButton).click();
    await this.page.locator(this.selectors.receiptModal).waitFor({ state: 'visible' });

    await this.page.locator(this.selectors.emailReceiptButton).click();

    if (emailAddress) {
      await this.page.locator('input[type="email"]').fill(emailAddress);
      await this.page.locator('button:has-text("Send")').click();
    }

    await this.waitForLoadingComplete();
  }
}

export default PaymentsPage;
