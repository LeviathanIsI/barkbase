/**
 * Check-In Page Object
 * Handles booking check-in functionality
 */

import { BasePage } from './BasePage.js';

export class CheckInPage extends BasePage {
  constructor(page) {
    super(page);

    this.url = '/bookings';

    this.selectors = {
      ...this.selectors,
      // Check-in slideout/modal
      checkInSlideout: '[data-testid="check-in-slideout"], [data-testid="check-in-modal"], [role="dialog"]:has-text("Check In")',
      checkInButton: 'button:has-text("Check In")',

      // Form fields
      weightInput: 'input[name="weight"], #weight, input[placeholder*="Weight"]',
      weightUnit: 'select[name="weightUnit"], #weightUnit',

      // Vaccination verification
      vaccinationVerifiedCheckbox: 'input[type="checkbox"][name="vaccinationVerified"], input[type="checkbox"]#vaccinationVerified',
      vaccinationVerifiedLabel: 'label:has-text("Vaccination")',
      vaccinationStatus: '[data-testid="vaccination-status"]',
      vaccinationWarning: '[data-testid="vaccination-warning"], .vaccination-warning',

      // Belongings
      belongingsInput: 'textarea[name="belongings"], #belongings, textarea[placeholder*="Belongings"]',
      belongingsList: '[data-testid="belongings-list"]',
      addBelongingButton: 'button:has-text("Add Belonging")',

      // Special requirements
      specialRequirementsInput: 'textarea[name="specialRequirements"], #specialRequirements',
      dietaryRequirementsInput: 'textarea[name="dietaryRequirements"], #dietaryRequirements',
      medicationInput: 'textarea[name="medication"], #medication',

      // Arrival notes
      arrivalNotesInput: 'textarea[name="arrivalNotes"], #arrivalNotes, textarea[placeholder*="arrival"]',

      // Kennel assignment
      kennelSelect: 'select[name="kennel"], #kennel',
      kennelDisplay: '[data-testid="assigned-kennel"]',

      // Emergency contact
      emergencyContactInput: 'input[name="emergencyContact"], #emergencyContact',
      emergencyPhoneInput: 'input[name="emergencyPhone"], #emergencyPhone',

      // Photo upload
      photoUpload: 'input[type="file"][name="photo"]',
      photoPreview: '[data-testid="photo-preview"]',

      // Actions
      submitCheckInButton: 'button[type="submit"]:has-text("Complete Check"), button:has-text("Confirm Check")',
      cancelButton: 'button[type="button"]:has-text("Cancel")',

      // Success/Error messages
      successMessage: '[data-testid="success-message"], [role="alert"]:has-text("success")',
      errorMessage: '[data-testid="error-message"], [role="alert"]:has-text("error")',

      // Check-in timestamp
      checkInTime: '[data-testid="check-in-time"]',
      checkInDate: '[data-testid="check-in-date"]',
    };
  }

  /**
   * Open check-in slideout for a specific booking
   */
  async openCheckIn(bookingIdentifier) {
    // Find the booking and click check-in button
    if (bookingIdentifier) {
      const bookingRow = this.page.locator(`tbody tr:has-text("${bookingIdentifier}")`).first();
      await bookingRow.locator(this.selectors.checkInButton).click();
    } else {
      // Click first available check-in button
      await this.page.locator(this.selectors.checkInButton).first().click();
    }

    await this.page.locator(this.selectors.checkInSlideout).waitFor({ state: 'visible' });
  }

  /**
   * Fill check-in form
   */
  async fillCheckInForm(checkInData) {
    // Wait for slideout to be fully loaded
    await this.waitForLoadingComplete();

    // Weight
    if (checkInData.weight) {
      const weightInput = this.page.locator(this.selectors.weightInput);
      await weightInput.waitFor({ state: 'visible' });
      await weightInput.clear();
      await weightInput.fill(checkInData.weight.toString());
    }

    // Weight unit
    if (checkInData.weightUnit) {
      const unitSelect = this.page.locator(this.selectors.weightUnit);
      if (await unitSelect.isVisible()) {
        await unitSelect.selectOption(checkInData.weightUnit);
      }
    }

    // Vaccination verified
    if (checkInData.vaccinationVerified !== undefined) {
      await this.setCheckbox(
        this.selectors.vaccinationVerifiedCheckbox,
        checkInData.vaccinationVerified
      );
    }

    // Belongings
    if (checkInData.belongings) {
      const belongingsInput = this.page.locator(this.selectors.belongingsInput);
      if (await belongingsInput.isVisible()) {
        await belongingsInput.clear();
        await belongingsInput.fill(checkInData.belongings);
      }
    }

    // Special requirements
    if (checkInData.specialRequirements) {
      const specialReqInput = this.page.locator(this.selectors.specialRequirementsInput);
      if (await specialReqInput.isVisible()) {
        await specialReqInput.clear();
        await specialReqInput.fill(checkInData.specialRequirements);
      }
    }

    // Dietary requirements
    if (checkInData.dietaryRequirements) {
      const dietaryInput = this.page.locator(this.selectors.dietaryRequirementsInput);
      if (await dietaryInput.isVisible()) {
        await dietaryInput.clear();
        await dietaryInput.fill(checkInData.dietaryRequirements);
      }
    }

    // Medication
    if (checkInData.medication) {
      const medicationInput = this.page.locator(this.selectors.medicationInput);
      if (await medicationInput.isVisible()) {
        await medicationInput.clear();
        await medicationInput.fill(checkInData.medication);
      }
    }

    // Arrival notes
    if (checkInData.arrivalNotes) {
      const arrivalNotesInput = this.page.locator(this.selectors.arrivalNotesInput);
      await arrivalNotesInput.clear();
      await arrivalNotesInput.fill(checkInData.arrivalNotes);
    }

    // Kennel assignment
    if (checkInData.kennel) {
      const kennelSelect = this.page.locator(this.selectors.kennelSelect);
      if (await kennelSelect.isVisible()) {
        await kennelSelect.selectOption(checkInData.kennel);
      }
    }

    // Emergency contact
    if (checkInData.emergencyContact) {
      const emergencyContactInput = this.page.locator(this.selectors.emergencyContactInput);
      if (await emergencyContactInput.isVisible()) {
        await emergencyContactInput.fill(checkInData.emergencyContact);
      }
    }

    // Emergency phone
    if (checkInData.emergencyPhone) {
      const emergencyPhoneInput = this.page.locator(this.selectors.emergencyPhoneInput);
      if (await emergencyPhoneInput.isVisible()) {
        await emergencyPhoneInput.fill(checkInData.emergencyPhone);
      }
    }
  }

  /**
   * Submit check-in form
   */
  async submitCheckIn() {
    await this.page.locator(this.selectors.submitCheckInButton).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Complete full check-in process
   */
  async completeCheckIn(bookingIdentifier, checkInData) {
    await this.openCheckIn(bookingIdentifier);
    await this.fillCheckInForm(checkInData);
    await this.submitCheckIn();
  }

  /**
   * Verify check-in success
   */
  async verifyCheckInSuccess() {
    const successToast = this.page.locator(this.selectors.toast).filter({ hasText: /check.*in|success/i });
    await successToast.waitFor({ state: 'visible', timeout: 5000 });
    return true;
  }

  /**
   * Get vaccination status
   */
  async getVaccinationStatus() {
    const statusElement = this.page.locator(this.selectors.vaccinationStatus);
    if (await statusElement.isVisible()) {
      return statusElement.textContent();
    }
    return null;
  }

  /**
   * Check if vaccination warning is displayed
   */
  async hasVaccinationWarning() {
    return this.page.locator(this.selectors.vaccinationWarning).isVisible();
  }

  /**
   * Cancel check-in
   */
  async cancelCheckIn() {
    await this.page.locator(this.selectors.cancelButton).click();
    await this.page.locator(this.selectors.checkInSlideout).waitFor({ state: 'hidden' });
  }

  /**
   * Upload photo
   */
  async uploadPhoto(filePath) {
    const fileInput = this.page.locator(this.selectors.photoUpload);
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(filePath);
      await this.page.locator(this.selectors.photoPreview).waitFor({ state: 'visible' });
    }
  }

  /**
   * Verify all required fields are present
   */
  async verifyRequiredFields() {
    const requiredFields = [
      this.selectors.weightInput,
      this.selectors.arrivalNotesInput,
    ];

    for (const selector of requiredFields) {
      const element = this.page.locator(selector);
      await element.waitFor({ state: 'visible', timeout: 5000 });
    }

    return true;
  }

  /**
   * Get check-in time
   */
  async getCheckInTime() {
    const timeElement = this.page.locator(this.selectors.checkInTime);
    if (await timeElement.isVisible()) {
      return timeElement.textContent();
    }
    return null;
  }
}

export default CheckInPage;
