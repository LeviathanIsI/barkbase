/**
 * Check-Out Page Object
 * Handles booking check-out functionality
 */

import { BasePage } from './BasePage.js';

export class CheckOutPage extends BasePage {
  constructor(page) {
    super(page);

    this.url = '/bookings';

    this.selectors = {
      ...this.selectors,
      // Check-out slideout/modal
      checkOutSlideout: '[data-testid="check-out-slideout"], [data-testid="check-out-modal"], [role="dialog"]:has-text("Check Out")',
      checkOutButton: 'button:has-text("Check Out")',

      // Form fields
      departureNotesInput: 'textarea[name="departureNotes"], #departureNotes, textarea[placeholder*="departure"]',

      // Condition assessment
      conditionSelect: 'select[name="condition"], #condition',
      conditionNotes: 'textarea[name="conditionNotes"], #conditionNotes',
      healthStatus: '[data-testid="health-status"]',

      // Belongings return
      belongingsReturnedCheckbox: 'input[type="checkbox"][name="belongingsReturned"], #belongingsReturned',
      belongingsChecklist: '[data-testid="belongings-checklist"]',
      missingBelongingsInput: 'textarea[name="missingBelongings"], #missingBelongings',

      // Weight check
      departureWeight: 'input[name="departureWeight"], #departureWeight',
      weightChange: '[data-testid="weight-change"]',

      // Payment processing
      paymentSection: '[data-testid="payment-section"]',
      outstandingBalance: '[data-testid="outstanding-balance"]',
      processPaymentButton: 'button:has-text("Process Payment")',
      paymentMethodSelect: 'select[name="paymentMethod"], #paymentMethod',
      paymentAmountInput: 'input[name="paymentAmount"], #paymentAmount',
      paymentNotesInput: 'textarea[name="paymentNotes"], #paymentNotes',

      // Invoice
      invoiceLink: '[data-testid="invoice-link"], a:has-text("Invoice")',
      generateInvoiceButton: 'button:has-text("Generate Invoice")',

      // Follow-up
      followUpRequired: 'input[type="checkbox"][name="followUpRequired"], #followUpRequired',
      followUpNotes: 'textarea[name="followUpNotes"], #followUpNotes',
      nextAppointmentDate: 'input[type="date"][name="nextAppointment"], #nextAppointment',

      // Photo upload
      photoUpload: 'input[type="file"][name="departurePhoto"]',
      photoPreview: '[data-testid="departure-photo-preview"]',

      // Rating/feedback
      ownerRating: '[data-testid="owner-rating"]',
      feedbackInput: 'textarea[name="feedback"], #feedback',

      // Actions
      submitCheckOutButton: 'button[type="submit"]:has-text("Complete Check"), button:has-text("Confirm Check Out")',
      cancelButton: 'button[type="button"]:has-text("Cancel")',

      // Success/Error messages
      successMessage: '[data-testid="success-message"], [role="alert"]:has-text("success")',
      errorMessage: '[data-testid="error-message"], [role="alert"]:has-text("error")',

      // Check-out timestamp
      checkOutTime: '[data-testid="check-out-time"]',
      checkOutDate: '[data-testid="check-out-date"]',

      // Stay summary
      staySummary: '[data-testid="stay-summary"]',
      totalDays: '[data-testid="total-days"]',
      totalCost: '[data-testid="total-cost"]',
    };
  }

  /**
   * Open check-out slideout for a specific booking
   */
  async openCheckOut(bookingIdentifier) {
    // Find the booking and click check-out button
    if (bookingIdentifier) {
      const bookingRow = this.page.locator(`tbody tr:has-text("${bookingIdentifier}")`).first();
      await bookingRow.locator(this.selectors.checkOutButton).click();
    } else {
      // Click first available check-out button
      await this.page.locator(this.selectors.checkOutButton).first().click();
    }

    await this.page.locator(this.selectors.checkOutSlideout).waitFor({ state: 'visible' });
  }

  /**
   * Fill check-out form
   */
  async fillCheckOutForm(checkOutData) {
    // Wait for slideout to be fully loaded
    await this.waitForLoadingComplete();

    // Departure notes
    if (checkOutData.departureNotes) {
      const departureNotesInput = this.page.locator(this.selectors.departureNotesInput);
      await departureNotesInput.clear();
      await departureNotesInput.fill(checkOutData.departureNotes);
    }

    // Condition
    if (checkOutData.condition) {
      const conditionSelect = this.page.locator(this.selectors.conditionSelect);
      if (await conditionSelect.isVisible()) {
        await conditionSelect.selectOption(checkOutData.condition);
      }
    }

    // Condition notes
    if (checkOutData.conditionNotes) {
      const conditionNotesInput = this.page.locator(this.selectors.conditionNotes);
      if (await conditionNotesInput.isVisible()) {
        await conditionNotesInput.clear();
        await conditionNotesInput.fill(checkOutData.conditionNotes);
      }
    }

    // Belongings returned
    if (checkOutData.belongingsReturned !== undefined) {
      await this.setCheckbox(
        this.selectors.belongingsReturnedCheckbox,
        checkOutData.belongingsReturned
      );
    }

    // Missing belongings
    if (checkOutData.missingBelongings) {
      const missingBelongingsInput = this.page.locator(this.selectors.missingBelongingsInput);
      if (await missingBelongingsInput.isVisible()) {
        await missingBelongingsInput.clear();
        await missingBelongingsInput.fill(checkOutData.missingBelongings);
      }
    }

    // Departure weight
    if (checkOutData.departureWeight) {
      const weightInput = this.page.locator(this.selectors.departureWeight);
      if (await weightInput.isVisible()) {
        await weightInput.clear();
        await weightInput.fill(checkOutData.departureWeight.toString());
      }
    }

    // Follow-up required
    if (checkOutData.followUpRequired !== undefined) {
      await this.setCheckbox(
        this.selectors.followUpRequired,
        checkOutData.followUpRequired
      );
    }

    // Follow-up notes
    if (checkOutData.followUpNotes) {
      const followUpNotesInput = this.page.locator(this.selectors.followUpNotes);
      if (await followUpNotesInput.isVisible()) {
        await followUpNotesInput.clear();
        await followUpNotesInput.fill(checkOutData.followUpNotes);
      }
    }

    // Next appointment
    if (checkOutData.nextAppointment) {
      const nextAppointmentInput = this.page.locator(this.selectors.nextAppointmentDate);
      if (await nextAppointmentInput.isVisible()) {
        await nextAppointmentInput.fill(checkOutData.nextAppointment);
      }
    }
  }

  /**
   * Process payment during check-out
   */
  async processPayment(paymentData) {
    const processButton = this.page.locator(this.selectors.processPaymentButton);

    if (await processButton.isVisible()) {
      await processButton.click();
      await this.page.waitForTimeout(500);

      // Payment method
      if (paymentData.method) {
        await this.page.locator(this.selectors.paymentMethodSelect).selectOption(paymentData.method);
      }

      // Payment amount
      if (paymentData.amount) {
        const amountInput = this.page.locator(this.selectors.paymentAmountInput);
        await amountInput.clear();
        await amountInput.fill(paymentData.amount.toString());
      }

      // Payment notes
      if (paymentData.notes) {
        const notesInput = this.page.locator(this.selectors.paymentNotesInput);
        if (await notesInput.isVisible()) {
          await notesInput.clear();
          await notesInput.fill(paymentData.notes);
        }
      }

      // Confirm payment
      await this.page.locator('button:has-text("Confirm Payment"), button[type="submit"]').click();
      await this.waitForLoadingComplete();
    }
  }

  /**
   * Submit check-out form
   */
  async submitCheckOut() {
    await this.page.locator(this.selectors.submitCheckOutButton).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Complete full check-out process
   */
  async completeCheckOut(bookingIdentifier, checkOutData, includePayment = false) {
    await this.openCheckOut(bookingIdentifier);
    await this.fillCheckOutForm(checkOutData);

    if (includePayment && checkOutData.payment) {
      await this.processPayment(checkOutData.payment);
    }

    await this.submitCheckOut();
  }

  /**
   * Verify check-out success
   */
  async verifyCheckOutSuccess() {
    const successToast = this.page.locator(this.selectors.toast).filter({ hasText: /check.*out|success/i });
    await successToast.waitFor({ state: 'visible', timeout: 5000 });
    return true;
  }

  /**
   * Get outstanding balance
   */
  async getOutstandingBalance() {
    const balanceElement = this.page.locator(this.selectors.outstandingBalance);
    if (await balanceElement.isVisible()) {
      const text = await balanceElement.textContent();
      const match = text.match(/[\d,.]+/);
      return match ? parseFloat(match[0].replace(',', '')) : 0;
    }
    return 0;
  }

  /**
   * Get stay summary
   */
  async getStaySummary() {
    const summary = {};

    const totalDaysElement = this.page.locator(this.selectors.totalDays);
    if (await totalDaysElement.isVisible()) {
      summary.totalDays = await totalDaysElement.textContent();
    }

    const totalCostElement = this.page.locator(this.selectors.totalCost);
    if (await totalCostElement.isVisible()) {
      summary.totalCost = await totalCostElement.textContent();
    }

    return summary;
  }

  /**
   * Get weight change
   */
  async getWeightChange() {
    const weightChangeElement = this.page.locator(this.selectors.weightChange);
    if (await weightChangeElement.isVisible()) {
      return weightChangeElement.textContent();
    }
    return null;
  }

  /**
   * Cancel check-out
   */
  async cancelCheckOut() {
    await this.page.locator(this.selectors.cancelButton).click();
    await this.page.locator(this.selectors.checkOutSlideout).waitFor({ state: 'hidden' });
  }

  /**
   * Upload departure photo
   */
  async uploadDeparturePhoto(filePath) {
    const fileInput = this.page.locator(this.selectors.photoUpload);
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(filePath);
      await this.page.locator(this.selectors.photoPreview).waitFor({ state: 'visible' });
    }
  }

  /**
   * Generate invoice
   */
  async generateInvoice() {
    const generateButton = this.page.locator(this.selectors.generateInvoiceButton);
    if (await generateButton.isVisible()) {
      await generateButton.click();
      await this.waitForLoadingComplete();
      return true;
    }
    return false;
  }

  /**
   * Get check-out time
   */
  async getCheckOutTime() {
    const timeElement = this.page.locator(this.selectors.checkOutTime);
    if (await timeElement.isVisible()) {
      return timeElement.textContent();
    }
    return null;
  }
}

export default CheckOutPage;
