/**
 * Bookings Page Object
 * Handles booking management functionality
 */

import { BasePage } from './BasePage.js';

export class BookingsPage extends BasePage {
  constructor(page) {
    super(page);

    this.url = '/bookings';

    this.selectors = {
      ...this.selectors,
      // Page elements
      pageTitle: 'h1:has-text("Bookings")',
      bookingsCount: '[data-testid="bookings-count"]',

      // View toggles
      calendarView: 'button:has-text("Calendar"), [data-testid="calendar-view"]',
      listView: 'button:has-text("List"), [data-testid="list-view"]',
      runBoardView: 'button:has-text("Run Board"), [data-testid="run-board-view"]',

      // Actions
      newBookingButton: 'button:has-text("New Booking"), [data-testid="new-booking"]',
      exportButton: 'button:has-text("Export")',
      filtersButton: 'button:has-text("Filters")',

      // Search
      searchInput: 'input[placeholder*="Search"], [data-testid="search-input"]',

      // Date navigation
      todayButton: 'button:has-text("Today")',
      prevButton: 'button[aria-label="Previous"], button:has-text("<")',
      nextButton: 'button[aria-label="Next"], button:has-text(">")',
      dateDisplay: '[data-testid="current-date"]',

      // Calendar
      calendar: '[data-testid="calendar"], .calendar',
      calendarDay: '.calendar-day, [data-testid="calendar-day"]',
      bookingEvent: '.booking-event, [data-testid="booking-event"]',

      // List view
      bookingsList: '[data-testid="bookings-list"]',
      bookingCard: '[data-testid="booking-card"]',
      bookingRow: 'tbody tr',

      // Run board
      runBoard: '[data-testid="run-board"]',
      kennelColumn: '[data-testid="kennel-column"]',
      occupiedKennel: '[data-testid="occupied-kennel"]',
      emptyKennel: '[data-testid="empty-kennel"]',

      // Booking detail panel
      detailPanel: '[data-testid="booking-detail"], .booking-detail-panel',
      detailPetName: '[data-testid="detail-pet-name"]',
      detailOwnerName: '[data-testid="detail-owner-name"]',
      detailStatus: '[data-testid="detail-status"]',
      detailDates: '[data-testid="detail-dates"]',

      // Actions in detail
      checkInButton: 'button:has-text("Check In")',
      checkOutButton: 'button:has-text("Check Out")',
      editBookingButton: 'button:has-text("Edit")',
      cancelBookingButton: 'button:has-text("Cancel")',

      // Booking modal
      bookingModal: '[data-testid="booking-modal"], [role="dialog"]',
      petSelect: 'select[name="pet"], #pet',
      ownerSelect: 'select[name="owner"], #owner',
      checkInDate: 'input[name="checkIn"], #checkIn',
      checkOutDate: 'input[name="checkOut"], #checkOut',
      serviceSelect: 'select[name="service"], #service',
      kennelSelect: 'select[name="kennel"], #kennel',
      notesInput: 'textarea[name="notes"]',
      saveButton: 'button[type="submit"], button:has-text("Save")',

      // Status filters
      statusAll: 'button:has-text("All")',
      statusConfirmed: 'button:has-text("Confirmed")',
      statusCheckedIn: 'button:has-text("Checked In")',
      statusCheckedOut: 'button:has-text("Checked Out")',
      statusCancelled: 'button:has-text("Cancelled")',

      // Bulk actions
      bulkActionsBar: '[data-testid="bulk-actions"]',
      bulkCheckIn: 'button:has-text("Check In All")',
      bulkDelete: 'button:has-text("Delete")',
    };
  }

  /**
   * Navigate to bookings page
   */
  async goto() {
    await super.goto(this.url);
    await this.waitForBookingsLoad();
  }

  /**
   * Wait for bookings page to load
   */
  async waitForBookingsLoad() {
    await this.page.locator(this.selectors.pageTitle).waitFor({ state: 'visible' });
    await this.waitForLoadingComplete();
  }

  /**
   * Switch to calendar view
   */
  async switchToCalendarView() {
    await this.page.locator(this.selectors.calendarView).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Switch to list view
   */
  async switchToListView() {
    await this.page.locator(this.selectors.listView).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Switch to run board view
   */
  async switchToRunBoardView() {
    await this.page.locator(this.selectors.runBoardView).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Click new booking button
   */
  async clickNewBooking() {
    await this.page.locator(this.selectors.newBookingButton).click();
    await this.page.locator(this.selectors.bookingModal).waitFor({ state: 'visible' });
  }

  /**
   * Create a new booking
   */
  async createBooking(bookingData) {
    await this.clickNewBooking();

    if (bookingData.petId) {
      await this.page.locator(this.selectors.petSelect).selectOption(bookingData.petId);
    }
    if (bookingData.checkInDate) {
      await this.page.locator(this.selectors.checkInDate).fill(bookingData.checkInDate);
    }
    if (bookingData.checkOutDate) {
      await this.page.locator(this.selectors.checkOutDate).fill(bookingData.checkOutDate);
    }
    if (bookingData.service) {
      await this.page.locator(this.selectors.serviceSelect).selectOption(bookingData.service);
    }
    if (bookingData.kennel) {
      await this.page.locator(this.selectors.kennelSelect).selectOption(bookingData.kennel);
    }
    if (bookingData.notes) {
      await this.page.locator(this.selectors.notesInput).fill(bookingData.notes);
    }

    await this.page.locator(this.selectors.saveButton).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Search for a booking
   */
  async searchBooking(searchTerm) {
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
      confirmed: this.selectors.statusConfirmed,
      'checked-in': this.selectors.statusCheckedIn,
      'checked-out': this.selectors.statusCheckedOut,
      cancelled: this.selectors.statusCancelled,
    };

    await this.page.locator(statusSelectors[status.toLowerCase()]).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Navigate to today
   */
  async goToToday() {
    await this.page.locator(this.selectors.todayButton).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Navigate to next period
   */
  async goToNext() {
    await this.page.locator(this.selectors.nextButton).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Navigate to previous period
   */
  async goToPrevious() {
    await this.page.locator(this.selectors.prevButton).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Click on a booking in calendar
   */
  async clickBookingEvent(petName) {
    await this.page.locator(`${this.selectors.bookingEvent}:has-text("${petName}")`).first().click();
    await this.page.locator(this.selectors.detailPanel).waitFor({ state: 'visible' });
  }

  /**
   * Click on a booking in list
   */
  async clickBookingCard(petName) {
    await this.page.locator(`${this.selectors.bookingCard}:has-text("${petName}")`).first().click();
    await this.page.locator(this.selectors.detailPanel).waitFor({ state: 'visible' });
  }

  /**
   * Check in a booking from detail panel
   */
  async checkInBooking() {
    await this.page.locator(this.selectors.checkInButton).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Check out a booking from detail panel
   */
  async checkOutBooking() {
    await this.page.locator(this.selectors.checkOutButton).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Cancel a booking from detail panel
   */
  async cancelBooking() {
    await this.page.locator(this.selectors.cancelBookingButton).click();
    // Confirm cancellation
    await this.page.locator('button:has-text("Confirm")').click();
    await this.waitForLoadingComplete();
  }

  /**
   * Get booking count
   */
  async getBookingCount() {
    const cards = await this.page.locator(this.selectors.bookingCard).count();
    const rows = await this.page.locator(this.selectors.bookingRow).count();
    return Math.max(cards, rows);
  }

  /**
   * Get all bookings data
   */
  async getAllBookings() {
    const cards = await this.page.locator(this.selectors.bookingCard).all();
    const bookings = [];

    for (const card of cards) {
      bookings.push({
        petName: await card.locator('[data-testid="pet-name"]').textContent(),
        ownerName: await card.locator('[data-testid="owner-name"]').textContent(),
        status: await card.locator('[data-testid="status"]').textContent(),
      });
    }

    return bookings;
  }

  /**
   * Select a booking by checkbox
   */
  async selectBooking(petName) {
    const card = this.page.locator(`${this.selectors.bookingCard}:has-text("${petName}")`);
    await card.locator('input[type="checkbox"]').check();
  }

  /**
   * Bulk check-in selected bookings
   */
  async bulkCheckIn() {
    await this.page.locator(this.selectors.bulkCheckIn).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Get kennel occupancy from run board
   */
  async getKennelOccupancy() {
    await this.switchToRunBoardView();
    const occupied = await this.page.locator(this.selectors.occupiedKennel).count();
    const empty = await this.page.locator(this.selectors.emptyKennel).count();
    return { occupied, empty, total: occupied + empty };
  }
}

export default BookingsPage;
